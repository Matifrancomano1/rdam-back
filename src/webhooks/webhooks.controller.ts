import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * POST /v1/webhooks/pago-confirmado
   * Recibe la notificación de PlusPagos cuando un pago es aprobado (EstadoId: "3").
   * Esta URL se configura en el Dashboard del mock: http://localhost:10000/dashboard
   */
  @Post('pago-confirmado')
  @HttpCode(HttpStatus.OK)
  async pagoConfirmado(@Body() body: any) {
    await this.webhooksService.procesarPagoConfirmado(body);
    return {
      success: true,
      message: 'Webhook procesado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /v1/webhooks/pago-rechazado
   * Recibe la notificación de PlusPagos cuando un pago es rechazado o cancelado (EstadoId: "4").
   * La URL de CallbackCancel encriptada apunta a este endpoint.
   */
  @Post('pago-rechazado')
  @HttpCode(HttpStatus.OK)
  async pagoRechazado(@Body() body: any) {
    await this.webhooksService.procesarPagoRechazado(body);
    return {
      success: true,
      message: 'Webhook de rechazo procesado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }
}
