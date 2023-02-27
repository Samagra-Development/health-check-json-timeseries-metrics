import { Controller, Get, Header, Render } from "@nestjs/common";
import { HealthCheckService } from "./health-check.service";

@Controller('metrics')
export class HealthCheckController {
  constructor(private metricsService: HealthCheckService) {}

  @Get()
  @Render('metrics')
  @Header('Content-Type', 'text/plain')
  async getMetrics() {
    return { metrics: await this.metricsService.getMetrics()};
  }
}
