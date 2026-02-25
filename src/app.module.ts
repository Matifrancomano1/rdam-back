import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ExpedientesModule } from './expedientes/expedientes.module';
import { PagosModule } from './pagos/pagos.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CertificadosModule } from './certificados/certificados.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    UsuariosModule,
    ExpedientesModule,
    PagosModule,
    DashboardModule,
    CertificadosModule,
    AuditoriaModule,
    WebhooksModule,
  ],
})
export class AppModule {}
