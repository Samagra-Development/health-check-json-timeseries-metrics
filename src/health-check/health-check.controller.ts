import { Controller, Get } from "@nestjs/common";
import { HealthCheckService } from "./health-check.service";

@Controller('metrics')
export class HealthCheckController {
  constructor(private metricsService: HealthCheckService) {}

  @Get()
  async getMetrics(): Promise<any> {
    return await this.metricsService.getMetrics();
  }
}
