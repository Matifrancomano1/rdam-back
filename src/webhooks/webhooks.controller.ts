import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('pago-confirmado')
  @HttpCode(HttpStatus.OK)
  async pagoConfirmado(
    @Body() body: any,
    @Headers('x-signature') signature: string,
  ) {
    await this.webhooksService.procesarPagoConfirmado(body, signature);
    return {
      success: true,
      message: 'Webhook procesado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }
}
