import { Injectable } from '@nestjs/common';
import { PagosService } from '../pagos/pagos.service';

/**
 * Payload que envía PlusPagos Mock al webhook del backend.
 * Generado en pluspagos-mock-simple/server.js → función sendWebhook()
 */
interface PlusPagosWebhookPayload {
  Tipo: string;
  TransaccionPlataformaId: string; // ID interno de la pasarela
  TransaccionComercioId: string; // Nuestra referenciaExterna (TXN-XXXX-XXXXXX)
  Monto: string;
  EstadoId: string; // "3" = REALIZADA, "4" = RECHAZADA
  Estado: string; // "REALIZADA" | "RECHAZADA"
  FechaProcesamiento: string;
}

@Injectable()
export class WebhooksService {
  constructor(private readonly pagosService: PagosService) {}

  procesarPagoConfirmado(body: PlusPagosWebhookPayload) {
    console.log(
      `[WEBHOOK] Pago confirmado recibido — TransaccionComercioId: ${body.TransaccionComercioId}, EstadoId: ${body.EstadoId}, Monto: ${body.Monto}`,
    );

    if (!body.TransaccionComercioId) {
      console.warn(
        '[WEBHOOK] ⚠️ TransaccionComercioId vacío — ignorando webhook',
      );
      return;
    }

    // EstadoId "3" = REALIZADA (aprobada)
    if (body.EstadoId == '3') {
      this.pagosService.confirmarPagoPasarela(body.TransaccionComercioId, {
        transaccionPlataformaId: body.TransaccionPlataformaId,
        estadoId: body.EstadoId,
        estadoTexto: body.Estado,
        fechaProcesamiento: body.FechaProcesamiento,
      });
      console.log(
        `[WEBHOOK] ✅ Pago procesado exitosamente para ${body.TransaccionComercioId}`,
      );
    } else {
      console.warn(
        `[WEBHOOK] ⚠️ EstadoId inesperado "${body.EstadoId}" en callback de confirmación para ${body.TransaccionComercioId}. Se esperaba "3" (REALIZADA).`,
      );
    }
  }

  procesarPagoRechazado(body: PlusPagosWebhookPayload) {
    console.log(
      `[WEBHOOK] Pago rechazado recibido — TransaccionComercioId: ${body.TransaccionComercioId}, EstadoId: ${body.EstadoId}`,
    );

    if (!body.TransaccionComercioId) {
      console.warn(
        '[WEBHOOK] ⚠️ TransaccionComercioId vacío — ignorando webhook de rechazo',
      );
      return;
    }

    // EstadoId "4" = RECHAZADA o por CallbackCancel
    this.pagosService.rechazarPagoPasarela(body.TransaccionComercioId, {
      transaccionPlataformaId: body.TransaccionPlataformaId,
      estadoId: body.EstadoId,
      estadoTexto: body.Estado,
      fechaProcesamiento: body.FechaProcesamiento,
    });
    console.log(
      `[WEBHOOK] ❌ Pago rechazado procesado para ${body.TransaccionComercioId}`,
    );
  }
}
