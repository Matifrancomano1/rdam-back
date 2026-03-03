import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { expedientesStore } from '../expedientes/expedientes.service';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { encryptString } from '../common/utils/crypto.util';
import { PLUSPAGOS_CONFIG } from '../common/utils/config.util';

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
    estadoId?: string;
    estadoTexto?: string;
    transaccionPlataformaId?: string;
    fechaProcesamiento?: string;
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
    const referenciaExterna = `TXN-${now.getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

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

    // Encriptar monto a centavos (string int)
    const montoCentavos = Math.round(dto.monto * 100).toString();
    const montoEncrypted = encryptString(
      montoCentavos,
      PLUSPAGOS_CONFIG.SECRET_KEY,
    );

    // URL base del backend para armar los callbacks
    // IMPORTANTE: NO incluir el prefijo /v1/ — NestJS lo agrega automáticamente vía setGlobalPrefix
    const backendBase = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

    const urlSuccessEncrypted = encryptString(
      `${backendBase}/success-page`,
      PLUSPAGOS_CONFIG.SECRET_KEY,
    );
    const urlErrorEncrypted = encryptString(
      `${backendBase}/error-page`,
      PLUSPAGOS_CONFIG.SECRET_KEY,
    );

    // Las URLs de callback NO deben llevar /v1/ porque NestJS ya aplica el prefijo global
    const callbackSuccessEncrypted = encryptString(
      `${backendBase}/v1/webhooks/pago-confirmado`,
      PLUSPAGOS_CONFIG.SECRET_KEY,
    );
    const callbackCancelEncrypted = encryptString(
      `${backendBase}/v1/webhooks/pago-rechazado`,
      PLUSPAGOS_CONFIG.SECRET_KEY,
    );

    const checkoutUrl = `${PLUSPAGOS_CONFIG.BASE_URL}/`;

    return {
      pagoId: pago.id,
      expedienteId: dto.expedienteId,
      monto: dto.monto,
      moneda: 'ARS',
      referenciaExterna,
      checkoutUrl,
      plusPagosFormData: {
        Comercio: PLUSPAGOS_CONFIG.MERCHANT_GUID,
        TransaccionComercioId: referenciaExterna,
        Monto: montoEncrypted,
        UrlSuccess: urlSuccessEncrypted,
        UrlError: urlErrorEncrypted,
        CallbackSuccess: callbackSuccessEncrypted,
        CallbackCancel: callbackCancelEncrypted,
      },
      estadoPago: 'pendiente',
      fechaCreacion: now.toISOString(),
      fechaExpiracion: expiracion.toISOString(),
    };
  }

  getPagosByExpediente(expedienteId: string) {
    const exp = expedientesStore.find((e) => e.id === expedienteId);
    if (!exp) throw new NotFoundException('Expediente no encontrado');

    const pagos = pagosStore.filter((p) => p.expedienteId === expedienteId);
    return { expedienteId, pagos };
  }

  getAllPagos() {
    return pagosStore.map((p) => ({
      id: p.id,
      expedienteId: p.expedienteId,
      monto: p.monto,
      moneda: p.moneda,
      metodoPago: p.metodoPago,
      referenciaExterna: p.referenciaExterna,
      estadoPago: p.estadoPago,
      fechaPago: p.fechaPago,
      fechaConfirmacion: p.fechaConfirmacion ?? null,
      datosPasarela: p.datosPasarela ?? null,
    }));
  }

  getPagoById(id: string) {
    const pago = pagosStore.find((p) => p.id === id);
    if (!pago) throw new NotFoundException(`Pago con id "${id}" no encontrado`);
    return pago;
  }

  // Called from webhook — pago aprobado
  confirmarPagoPasarela(
    referenciaExterna: string,
    datos: {
      transaccionPlataformaId?: string;
      estadoId?: string;
      estadoTexto?: string;
      fechaProcesamiento?: string;
      paymentMethod?: {
        lastFourDigits?: string;
        brand?: string;
      };
      metadata?: {
        expedienteId?: string;
      };
    },
  ) {
    const pago = pagosStore.find(
      (p) => p.referenciaExterna === referenciaExterna,
    );
    if (!pago) return;

    const now = new Date().toISOString();
    pago.estadoPago = 'confirmado';
    pago.fechaConfirmacion = now;
    pago.datosPasarela = {
      ultimosCuatroDigitos: datos.paymentMethod?.lastFourDigits,
      marca: datos.paymentMethod?.brand,
      cuotas: 1,
      estadoId: datos.estadoId,
      estadoTexto: datos.estadoTexto,
      transaccionPlataformaId: datos.transaccionPlataformaId,
      fechaProcesamiento: datos.fechaProcesamiento,
    };

    const exp = expedientesStore.find(
      (e) => e.id === (datos.metadata?.expedienteId ?? pago.expedienteId),
    );
    if (exp && exp.estado.actual === 'Aprobado - Pendiente de Pago') {
      exp.estado.actual = 'Pago Confirmado - Pendiente Validación';
      exp.estado.fechaActualizacion = now;
      exp.pagos.push(pago.id);
    }
  }

  // Called from webhook — pago rechazado o cancelado
  rechazarPagoPasarela(
    referenciaExterna: string,
    datos: {
      transaccionPlataformaId?: string;
      estadoId?: string;
      estadoTexto?: string;
      fechaProcesamiento?: string;
    },
  ) {
    const pago = pagosStore.find(
      (p) => p.referenciaExterna === referenciaExterna,
    );
    if (!pago) return;

    const now = new Date().toISOString();
    pago.estadoPago = 'rechazado';
    pago.fechaConfirmacion = now;
    pago.datosPasarela = {
      estadoId: datos.estadoId,
      estadoTexto: datos.estadoTexto,
      transaccionPlataformaId: datos.transaccionPlataformaId,
      fechaProcesamiento: datos.fechaProcesamiento,
    };
  }
}
