import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ExpedientesModule } from './expedientes/expedientes.module';
import { PagosModule } from './pagos/pagos.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CertificadosModule } from './certificados/certificados.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { MailModule } from './mail/mail.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    UsuariosModule,
    ExpedientesModule,
    PagosModule,
    DashboardModule,
    CertificadosModule,
    AuditoriaModule,
    MailModule,
    WebhooksModule,
  ],
})
export class AppModule {}
