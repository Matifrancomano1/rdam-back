import { Injectable, ForbiddenException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PagosService } from '../pagos/pagos.service';

const WEBHOOK_SECRET = 'rdam-webhook-secret-2026';

@Injectable()
export class WebhooksService {
  constructor(private readonly pagosService: PagosService) {}

  async procesarPagoConfirmado(body: any, signature: string) {
    // Validate HMAC signature
    const expectedSig = createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex');

    if (signature && signature !== `sha256=${expectedSig}`) {
      throw new ForbiddenException('SIGNATURE_INVALID');
    }

    if (body.status === 'approved') {
      this.pagosService.confirmarPagoPasarela(body.paymentId, body);
    }
  }
}
