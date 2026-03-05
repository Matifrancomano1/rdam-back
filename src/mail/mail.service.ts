import { Injectable } from '@nestjs/common';
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
}