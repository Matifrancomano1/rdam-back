import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { PagosEventosService } from './pagos-eventos.service';

@Module({
  controllers: [PagosController],
  providers: [PagosService, PagosEventosService],
  exports: [PagosService, PagosEventosService],
})
export class PagosModule {}
