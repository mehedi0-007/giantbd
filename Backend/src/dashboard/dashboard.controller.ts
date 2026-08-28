import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { PermissionsGuard } from '../common';

@Controller('dashboard')
@UseGuards(PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  async getMetrics() {
    return this.dashboardService.getMetrics();
  }
}
