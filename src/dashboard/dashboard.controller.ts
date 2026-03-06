import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { successResponse } from '../common/response.helper';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metricas')
  getMetricas() {
    return successResponse(this.dashboardService.getMetricas());
  }

  @Get('actividad-reciente')
  getActividadReciente(@Query('limit') limit?: string) {
    const l = limit ? parseInt(limit) : 10;
    return successResponse(
      this.dashboardService.getActividadReciente(Math.min(l, 50)),
    );
  }
}
