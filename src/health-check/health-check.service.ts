import { Injectable, Logger } from "@nestjs/common";
import { HealthCheck } from "../interfaces/health-check.interface";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class HealthCheckService {
  private readonly serviceDefaultTimeout: number;
  private readonly maxExecutionTimeout: number;
  private readonly services: Array<{name: string, url: string}>;
  private static serviceUpStrings: Array<string> = ["ok", "OK", "Ok", "working", "up", "UP", "healthy"];

  protected readonly logger = new Logger(HealthCheckService.name); // logger instance

  constructor(private httpService: HttpService, private readonly configService: ConfigService,) {
    const services = configService.get<string>('SERVICES'); // read the json from env file
    this.serviceDefaultTimeout = configService.get<number>('SERVICE_PING_DEFAULT_TIMOUT');
    this.maxExecutionTimeout = configService.get<number>('MAX_EXECUTION_TIMEOUT');
    this.services = JSON.parse(services); // load & store all services to monitor
  }

  async getMetrics(): Promise<Array<string>> {
    const startTime = (new Date()).getTime();
    this.logger.log('Starting health check...');
    let allMetrics = [];
    let finishedCounter = 0;
    for (const service of this.services) {
      this.logger.log(`Requesting for ${service['name']}: ${service['url']}..`)
      const timeout = service['timeout'] ?? this.serviceDefaultTimeout; // passing timeout

      // We are asynchronously calling the health check APIs for all the services
      this.fetchHealthCheck(service['url'], timeout).then((healthCheckData) => {
        this.logger.log(`Done.. ${service['name']} Status: ${healthCheckData['status']}, Time taken: ${healthCheckData['requestTime']} ms`);
        allMetrics.push(`# For service: ${service['name']}`);
        const metrics = HealthCheckService.healthCheckToTimeSeries(service['name'], healthCheckData);
        allMetrics = allMetrics.concat(metrics);
        finishedCounter++;  // increment the finishedCounter
      }).catch((error) => {
        this.logger.error(error);
      });
    }

    while (true) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (finishedCounter == this.services.length) {
        // if all the requests have been finished, we'll terminate the loop.
        break;
      } else if (((new Date()).getTime() - startTime) / 1000 > this.maxExecutionTimeout) {
        // if we are waiting longer than then max allowed execution time, we'll terminate the loop
        break;
      }
    }

    this.logger.log(`Finished!! (${finishedCounter}/${this.services.length} finished in ${((new Date()).getTime() - startTime) / 1000} seconds)`);
    return allMetrics;  // at last, return all the computed metrices
  }

  private async fetchHealthCheck(url: string, timeout: number): Promise<HealthCheck> {
    const startTime = new Date().getTime();
    try {
      const response = await this.httpService.get(url, {
        timeout: timeout
      }).toPromise();
      const endTime = new Date().getTime();
      let data = response.data;
      if (!data.status && !data.details) {
        let newResponse = {
          status: 'ok',
          details: {},
          requestTime: endTime-startTime,
          responseCode: 200
        }

        if (HealthCheckService.isJson(data)) {
          data = JSON.parse(data);  // convert to JSON
        }
        if (typeof data == 'object' && Object.keys(data)) {
          // if the response is a valid Object & has keys, we'll consider it as keys
          for (const key of Object.keys(data)) {
            newResponse.details[key] = {
              status: data[key].status ?? data[key]
            }
          }
        }
        return newResponse;
      } else if (!data.details) {
        data['details'] = {};
      }
      data['requestTime'] = endTime-startTime
      data['responseCode'] = 200;
      return data;
    } catch (err) {
      if (err?.response?.data?.details) {
        err.response.data['responseCode'] = err?.response?.status ?? 0
        return err.response.data
      }
      return {
        status: 'error',
        details: {},
        requestTime: new Date().getTime() - startTime,
        responseCode: err?.response?.status ?? 0
      };
    }
  }

  private static healthCheckToTimeSeries(service:string, healthCheck: HealthCheck): string[] {
    const timestamp = new Date().getTime();
    const metrics: string[] = [];

    // Add a metric for the overall status of the application
    const appStatus = this.serviceUpStrings.includes(healthCheck.status) ? 1 : 0;
    metrics.push(`health_check_response_status{service="${service}"} ${appStatus} ${timestamp}`);
    metrics.push(`health_check_response_time{service="${service}"} ${healthCheck.requestTime ?? 0} ${timestamp}`);
    metrics.push(`health_check_response_code{service="${service}"} ${healthCheck.responseCode} ${timestamp}`);

    // Add a metric for each component's status and details
    const details = healthCheck.details;
    for (const detailName of Object.keys(details)) {
      const status = this.serviceUpStrings.includes(details[detailName]['status']) ? 1 : 0;
      const message = details[detailName]['message'] ?? '';
      const detailMetric = `health_check_component_status{service="${service}",component="${detailName}", message="${message}"} ${status} ${timestamp}`;
      metrics.push(detailMetric);
    }

    return metrics;
  }

  private static isJson(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }
}