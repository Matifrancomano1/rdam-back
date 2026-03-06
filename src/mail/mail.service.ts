import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendVerificationEmail(email: string, token: string) {
    const url = `http://localhost:5173/verify?token=${token}`;
    const html = `
      <p>Bienvenido,</p>
      <p>Por favor verifica tu cuenta haciendo clic en el siguiente enlace:</p>
      <a href="${url}">${url}</a>
      <p>Si no solicitaste este correo, ignora este mensaje.</p>
    `;

    return this.mailerService.sendMail({
      to: email,
      subject: 'Verificación de cuenta',
      html,
    });
  }

  async sendExpedienteAccessCode(email: string, codigo: string) {
    const html = `
      <p>Hola,</p>
      <p>Tu código de acceso para consultar tu expediente es: <strong>${codigo}</strong></p>
      <p>Este código expirará en 15 minutos.</p>
      <p>Si no solicitaste este código, ignora este mensaje.</p>
    `;

    try {
      return await this.mailerService.sendMail({
        to: email,
        subject: 'Código de acceso a expediente - RDAM',
        html,
      });
    } catch (error) {
      console.error('Error enviando email:', error.message);
      throw new ServiceUnavailableException(
        'No se pudo enviar el correo con el código de acceso. Verifica la configuración de SMTP.',
      );
    }
  }
}
