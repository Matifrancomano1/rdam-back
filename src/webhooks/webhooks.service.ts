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
    console.log('--- WEBHOOK PAGO CONFIRMADO RECIBIDO ---', body);
    // EstadoId "3" = REALIZADA (aprobada)
    if (body.EstadoId == '3') {
      this.pagosService.confirmarPagoPasarela(body.TransaccionComercioId, {
        transaccionPlataformaId: body.TransaccionPlataformaId,
        estadoId: body.EstadoId,
        estadoTexto: body.Estado,
        fechaProcesamiento: body.FechaProcesamiento,
      });
    }
  }

  procesarPagoRechazado(body: PlusPagosWebhookPayload) {
    console.log('--- WEBHOOK PAGO RECHAZADO RECIBIDO ---', body);
    // EstadoId "4" = RECHAZADA o por CallbackCancel
    this.pagosService.rechazarPagoPasarela(body.TransaccionComercioId, {
      transaccionPlataformaId: body.TransaccionPlataformaId,
      estadoId: body.EstadoId,
      estadoTexto: body.Estado,
      fechaProcesamiento: body.FechaProcesamiento,
    });
  }
}
