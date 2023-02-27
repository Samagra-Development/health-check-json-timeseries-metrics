import { Injectable, Logger } from "@nestjs/common";
import { HealthCheck } from "../interfaces/health-check.interface";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class HealthCheckService {
  private readonly services: Array<{name: string, url: string}>;
  private static serviceUpStrings: Array<string> = ["ok", "OK", "Ok", "working", "up", "UP", "healthy"];

  protected readonly logger = new Logger(HealthCheckService.name); // logger instance

  constructor(private httpService: HttpService, private readonly configService: ConfigService,) {
    const services = configService.get<string>('SERVICES');
    this.services = JSON.parse(services); // load & store all services to monitor
  }

  async getMetrics(): Promise<string> {
    this.logger.log('Starting health check...');
    let allMetrics = [];
    for (const service of this.services) {
      this.logger.log(`Requesting for ${service['name']}: ${service['url']}..`)
      const healthCheckData = await this.fetchHealthCheck(service['url']);
      this.logger.log(`Done.. Status: ${healthCheckData['status']}, Time taken: ${healthCheckData['requestTime']} ms`);
      const metrics = HealthCheckService.healthCheckToTimeSeries(service['name'], healthCheckData);
      allMetrics = allMetrics.concat(metrics);
    }
    this.logger.log('Finished!!');
    return allMetrics.join('\n');
  }

  private async fetchHealthCheck(url: string): Promise<HealthCheck> {
    const startTime = new Date().getTime();
    try {
      const response = await this.httpService.get(url).toPromise();
      const endTime = new Date().getTime();
      let data = response.data;
      if (!data.status && !data.details) {
        let newResponse = {
          status: 'ok',
          details: {},
          requestTime: endTime-startTime,
          responseCode: 200
        }
        if (Object.keys(data)) {
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
    const appStatusMetric = `health_check_status{service="${service}",status=${appStatus}, request_time=${healthCheck.requestTime ?? 0}, response_code=${healthCheck.responseCode}} 0 ${timestamp}`;
    metrics.push(appStatusMetric);

    // Add a metric for each component's status and details
    const details = healthCheck.details;
    for (const detailName of Object.keys(details)) {
      const status = this.serviceUpStrings.includes(details[detailName]['status']) ? 1 : 0;
      const message = details[detailName]['message'] ?? '';
      const detailMetric = `health_check_component_status{service="${service}",component="${detailName}", status=${status}, message="${message}"} 0 ${timestamp}`;
      metrics.push(detailMetric);
    }

    return metrics;
  }
}