import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { successResponse } from '../common/response.helper';

@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Administrador')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get('logs')
  getLogs(
    @Query('usuarioId') usuarioId?: string,
    @Query('expedienteId') expedienteId?: string,
    @Query('accion') accion?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return successResponse(
      this.auditoriaService.getLogs({
        usuarioId,
        expedienteId,
        accion,
        fechaDesde,
        fechaHasta,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      }),
    );
  }
}
