import { Module } from '@nestjs/common';
import { ExpedientesController } from './expedientes.controller';
import { ExpedientesService } from './expedientes.service';
import { MailModule } from '../mail/mail.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [MailModule, AuditoriaModule],
  controllers: [ExpedientesController],
  providers: [ExpedientesService],
  exports: [ExpedientesService],
})
export class ExpedientesModule {}
