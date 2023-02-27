import { Controller, Get, Render } from "@nestjs/common";
import { HealthCheckService } from "./health-check.service";

@Controller('metrics')
export class HealthCheckController {
  constructor(private metricsService: HealthCheckService) {}

  @Get()
  @Render('metrics')
  // @Header('Content-Type', 'text/plain')
  // @Header('Content-Encoding', 'gzip')
  async getMetrics() {
    // return await this.metricsService.getMetrics();
    return { metrics: await this.metricsService.getMetrics()};
  }
}
