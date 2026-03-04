import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PagosService, Pago } from './pagos.service';
import { PagosEventosService } from './pagos-eventos.service';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { successResponse } from '../common/response.helper';
import { expedientesStore } from '../expedientes/expedientes.service';
import { IsString, IsNumber, IsOptional, IsEmail, Min } from 'class-validator';
import { Type } from 'class-transformer';

class CrearOrdenPublicaDto {
  @IsString() expedienteId: string;
  @Type(() => Number) @IsNumber() @Min(0.01) monto: number;
  @IsEmail() @IsOptional() email?: string;
}

@Controller('pagos')
export class PagosController {
  constructor(
    private readonly pagosService: PagosService,
    private readonly eventosService: PagosEventosService,
  ) {}

  /**
   * POST /v1/pagos/crear-orden  (protegido — operadores)
   */
  @Post('crear-orden')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Operador', 'Administrador')
  @HttpCode(HttpStatus.OK)
  crearOrden(@Body() dto: CrearOrdenDto) {
    return successResponse(this.pagosService.crearOrden(dto));
  }

  /**
   * POST /v1/pagos/crear-orden-publica  (PÚBLICO — ciudadano del portal)
   * Valida que el expediente exista y esté en estado "Aprobado - Pendiente de Pago".
   */
  @Post('crear-orden-publica')
  @HttpCode(HttpStatus.OK)
  crearOrdenPublica(@Body() dto: CrearOrdenPublicaDto) {
    const exp = expedientesStore.find((e) => e.id === dto.expedienteId);
    if (!exp) throw new NotFoundException('Expediente no encontrado');

    if (exp.estado.actual !== 'Aprobado - Pendiente de Pago') {
      throw new BadRequestException(
        `INVALID_STATE: El expediente no está disponible para pago. Estado actual: "${exp.estado.actual}"`,
      );
    }

    // Monto debe coincidir con el registrado (tolerancia 0.01)
    const montoDiferencia = Math.abs(exp.deuda.montoAdeudado - dto.monto);
    if (montoDiferencia > 0.01) {
      throw new BadRequestException(
        `INVALID_AMOUNT: El monto no coincide con el registrado. Esperado: ${exp.deuda.montoAdeudado}`,
      );
    }

    const orderDto: CrearOrdenDto = {
      expedienteId: dto.expedienteId,
      monto: exp.deuda.montoAdeudado,
      email: dto.email ?? exp.deudor.email,
    };

    return successResponse(this.pagosService.crearOrden(orderDto));
  }

  /**
   * GET /v1/pagos/eventos/:referencia  (PÚBLICO — SSE)
   * El frontend se conecta aquí y espera el evento de confirmación/rechazo del pago.
   * Cuando PlusPagos llama al webhook, este stream recibe el evento en tiempo real.
   *
   * Uso desde el frontend:
   *   const source = new EventSource('/v1/pagos/eventos/TXN-2026-XXXXXX');
   *   source.onmessage = (e) => { const data = JSON.parse(e.data); ... };
   */
  @Sse('eventos/:referencia')
  @HttpCode(HttpStatus.OK)
  streamEventosPago(
    @Param('referencia') referencia: string,
  ): Observable<MessageEvent> {
    return this.eventosService.subscribe(referencia);
  }

  /**
   * GET /v1/pagos/estado-por-referencia/:referencia  (PÚBLICO)
   * El frontend llama esto cuando el usuario regresa de la pasarela (polling fallback).
   */
  @Get('estado-por-referencia/:referencia')
  @HttpCode(HttpStatus.OK)
  getEstadoPorReferencia(@Param('referencia') referencia: string) {
    const pago: Pago | undefined =
      this.pagosService.getPagoByReferencia(referencia);
    if (!pago)
      throw new NotFoundException('Pago no encontrado para esa referencia');

    const exp = expedientesStore.find((e) => e.id === pago.expedienteId);

    return successResponse({
      pagoId: pago.id,
      expedienteId: pago.expedienteId,
      numeroExpediente: exp?.numeroExpediente ?? null,
      monto: pago.monto,
      moneda: pago.moneda,
      estadoPago: pago.estadoPago,
      referenciaExterna: pago.referenciaExterna,
      fechaPago: pago.fechaPago,
      fechaConfirmacion: pago.fechaConfirmacion ?? null,
      datosPasarela: pago.datosPasarela ?? null,
      estadoExpediente: exp?.estado.actual ?? null,
    });
  }

  /**
   * GET /v1/pagos  (protegido — operadores/admin)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Operador', 'Administrador')
  @HttpCode(HttpStatus.OK)
  getAllPagos() {
    return successResponse(this.pagosService.getAllPagos());
  }

  /**
   * GET /v1/pagos/:id  (protegido)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Operador', 'Administrador')
  @HttpCode(HttpStatus.OK)
  getPagoById(@Param('id') id: string) {
    return successResponse(this.pagosService.getPagoById(id));
  }
}
