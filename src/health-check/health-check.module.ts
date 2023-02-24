import { Module } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';
import { HttpModule } from "@nestjs/axios";
import { HealthCheckController } from "./health-check.controller";

@Module({
  providers: [HealthCheckService],
  imports: [HttpModule],
  controllers: [HealthCheckController]
})
export class HealthCheckModule {}
