import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PagosService } from './pagos.service';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { successResponse } from '../common/response.helper';

@Controller('pagos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Operador', 'Administrador')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post('crear-orden')
  @HttpCode(HttpStatus.OK)
  crearOrden(@Body() dto: CrearOrdenDto) {
    return successResponse(this.pagosService.crearOrden(dto));
  }

  /**
   * GET /v1/pagos
   * Lista todos los pagos registrados con su estado y datos de notificación
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  getAllPagos() {
    return successResponse(this.pagosService.getAllPagos());
  }

  /**
   * GET /v1/pagos/:id
   * Devuelve el detalle completo de un pago, incluyendo los datos recibidos
   * desde la pasarela vía webhook (estadoId, marca, últimos 4 dígitos, etc.)
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getPagoById(@Param('id') id: string) {
    return successResponse(this.pagosService.getPagoById(id));
  }
}
