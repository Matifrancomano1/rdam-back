import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface PagoEventoData {
  tipo: 'PAGO_CONFIRMADO' | 'PAGO_RECHAZADO';
  referencia: string;
  estadoPago: string;
  estadoExpediente?: string | null;
  monto?: number;
  datosPasarela?: {
    ultimosCuatroDigitos?: string;
    marca?: string;
  } | null;
  fechaProcesamiento?: string;
}

/**
 * Servicio de Server-Sent Events para notificar al frontend
 * cuando PlusPagos llama al webhook de pago-confirmado / pago-rechazado.
 *
 * El frontend abre GET /v1/pagos/eventos/:referencia y espera el evento.
 * Cuando el webhook llega, PagosService llama a emit() y el cliente recibe el evento en tiempo real.
 */
@Injectable()
export class PagosEventosService {
  // Mapa de referencia → Subject de eventos. Cada pago pendiente tiene su propio Subject.
  private readonly subjects = new Map<string, Subject<MessageEvent>>();

  /**
   * Devuelve un Observable de MessageEvent para el endpoint SSE.
   * Si no existe un Subject para esa referencia, lo crea.
   */
  subscribe(referencia: string): Observable<MessageEvent> {
    if (!this.subjects.has(referencia)) {
      this.subjects.set(referencia, new Subject<MessageEvent>());
    }
    return this.subjects.get(referencia)!.asObservable();
  }

  /**
   * Emite un evento SSE a todos los clientes suscritos a esa referencia.
   * Llamado desde PagosService cuando el webhook confirma o rechaza el pago.
   */
  emit(referencia: string, data: PagoEventoData): void {
    const subject = this.subjects.get(referencia);
    if (!subject) return;

    const event = new MessageEvent('message', {
      data: JSON.stringify(data),
    });
    subject.next(event);
  }

  /**
   * Completa el Subject (cierra la conexión SSE del cliente) y lo elimina del mapa.
   */
  complete(referencia: string): void {
    const subject = this.subjects.get(referencia);
    if (!subject) return;
    subject.complete();
    this.subjects.delete(referencia);
  }
}
