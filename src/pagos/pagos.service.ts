import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { expedientesStore } from '../expedientes/expedientes.service';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { RegistrarManualDto } from './dto/registrar-manual.dto';

export interface Pago {
  id: string;
  expedienteId: string;
  monto: number;
  moneda: string;
  metodoPago: string;
  referenciaExterna?: string;
  estadoPago: 'pendiente' | 'confirmado' | 'rechazado' | 'reembolsado';
  fechaPago: string;
  fechaConfirmacion?: string;
  observaciones?: string;
  validacion?: {
    validadoPor: string;
    fechaValidacion: string;
    observaciones?: string;
  };
  datosPasarela?: {
    ultimosCuatroDigitos?: string;
    marca?: string;
    cuotas?: number;
  };
}

export const pagosStore: Pago[] = [];

@Injectable()
export class PagosService {
  crearOrden(dto: CrearOrdenDto): any {
    const exp = expedientesStore.find((e) => e.id === dto.expedienteId);
    if (!exp) throw new NotFoundException('Expediente no encontrado');

    const now = new Date();
    const expiracion = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const referenciaExterna = `MP-${now.getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const pago: Pago = {
      id: uuidv4(),
      expedienteId: dto.expedienteId,
      monto: dto.monto,
      moneda: 'ARS',
      metodoPago: 'tarjeta_credito',
      referenciaExterna,
      estadoPago: 'pendiente',
      fechaPago: now.toISOString(),
    };
    pagosStore.push(pago);

    return {
      pagoId: pago.id,
      expedienteId: dto.expedienteId,
      monto: dto.monto,
      moneda: 'ARS',
      referenciaExterna,
      checkoutUrl: `https://www.mercadopago.com.ar/checkout/v1/payment?id=${referenciaExterna}`,
      estadoPago: 'pendiente',
      fechaCreacion: now.toISOString(),
      fechaExpiracion: expiracion.toISOString(),
    };
  }

  registrarManual(dto: RegistrarManualDto): any {
    const exp = expedientesStore.find((e) => e.id === dto.expedienteId);
    if (!exp) throw new NotFoundException('Expediente no encontrado');

    const now = new Date().toISOString();
    const pago: Pago = {
      id: uuidv4(),
      expedienteId: dto.expedienteId,
      monto: dto.monto,
      moneda: 'ARS',
      metodoPago: dto.metodoPago,
      referenciaExterna: dto.referenciaExterna,
      estadoPago: 'confirmado',
      fechaPago: dto.fechaPago ?? now,
      fechaConfirmacion: now,
      observaciones: dto.observaciones,
    };
    pagosStore.push(pago);

    // Move expediente state
    if (exp.estado.actual === 'Aprobado - Pendiente de Pago') {
      exp.estado.actual = 'Pago Confirmado - Pendiente Validación';
      exp.estado.fechaActualizacion = now;
      exp.pagos.push(pago.id);
    }

    return pago;
  }

  getPagosByExpediente(expedienteId: string) {
    const exp = expedientesStore.find((e) => e.id === expedienteId);
    if (!exp) throw new NotFoundException('Expediente no encontrado');

    const pagos = pagosStore.filter((p) => p.expedienteId === expedienteId);
    return { expedienteId, pagos };
  }

  // Called from webhook
  confirmarPagoPasarela(referenciaExterna: string, datos: any) {
    const pago = pagosStore.find((p) => p.referenciaExterna === referenciaExterna);
    if (!pago) return;

    const now = new Date().toISOString();
    pago.estadoPago = 'confirmado';
    pago.fechaConfirmacion = now;
    pago.datosPasarela = {
      ultimosCuatroDigitos: datos.paymentMethod?.lastFourDigits,
      marca: datos.paymentMethod?.brand,
      cuotas: 1,
    };

    const exp = expedientesStore.find((e) => e.id === datos.metadata?.expedienteId);
    if (exp && exp.estado.actual === 'Aprobado - Pendiente de Pago') {
      exp.estado.actual = 'Pago Confirmado - Pendiente Validación';
      exp.estado.fechaActualizacion = now;
      exp.pagos.push(pago.id);
    }
  }
}
