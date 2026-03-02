import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PagosService } from './pagos.service';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { successResponse } from '../common/response.helper';

@Controller('pagos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Operador', 'Administrador')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post('crear-orden')
  @HttpCode(HttpStatus.OK)
  crearOrden(@Body() dto: CrearOrdenDto) {
    return successResponse(this.pagosService.crearOrden(dto));
  }
}
