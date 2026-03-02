/// <reference types="multer" />
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExpedientesService } from './expedientes.service';
import { CreateExpedienteDto } from './dto/create-expediente.dto';
import { UpdateExpedienteDto } from './dto/update-expediente.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/response.helper';
import { IsString, IsOptional } from 'class-validator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

class ActionDto {
  @IsString() @IsOptional() observaciones?: string;
}

class ValidarPagoDto {
  @IsString() pagoId: string;
  @IsString() @IsOptional() observaciones?: string;
}

@Controller('expedientes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpedientesController {
  constructor(private readonly expedientesService: ExpedientesService) {}

  @Post()
  @Roles('Operador', 'Administrador')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateExpedienteDto, @CurrentUser() user: JwtPayload) {
    const data = this.expedientesService.create(dto, user);
    return successResponse(data);
  }

  @Get()
  findAll(
    @Query('estado') estado?: string,
    @Query('search') search?: string,
    @Query('fecha') fecha?: string,
    @Query('montoMin') montoMin?: string,
    @Query('montoMax') montoMax?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const data = this.expedientesService.findAll({
      estado,
      search,
      fecha,
      montoMin: montoMin ? parseFloat(montoMin) : undefined,
      montoMax: montoMax ? parseFloat(montoMax) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
    });
    return successResponse(data);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return successResponse(this.expedientesService.findOne(id));
  }

  @Put(':id')
  @Roles('Operador', 'Administrador')
  update(@Param('id') id: string, @Body() dto: UpdateExpedienteDto) {
    return successResponse(this.expedientesService.update(id, dto));
  }

  @Post(':id/aprobar')
  @Roles('Operador', 'Administrador')
  @HttpCode(HttpStatus.OK)
  aprobar(
    @Param('id') id: string,
    @Body() dto: ActionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return successResponse(
      this.expedientesService.aprobar(id, dto.observaciones ?? '', user),
    );
  }

  @Post(':id/rechazar')
  @Roles('Operador', 'Administrador')
  @HttpCode(HttpStatus.OK)
  rechazar(
    @Param('id') id: string,
    @Body() dto: ActionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return successResponse(
      this.expedientesService.rechazar(id, dto.observaciones ?? '', user),
    );
  }

  @Get(':id/historial')
  getHistorial(@Param('id') id: string) {
    return successResponse(this.expedientesService.getHistorial(id));
  }

  @Post(':id/documentos')
  @Roles('Operador', 'Administrador')
  @UseInterceptors(FileInterceptor('archivo'))
  @HttpCode(HttpStatus.CREATED)
  uploadDocumento(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = this.expedientesService.addDocumento(id, file, user.id);
    return successResponse({ ...data, expedienteId: id });
  }

  @Get(':id/documentos')
  getDocumentos(@Param('id') id: string) {
    return successResponse(this.expedientesService.getDocumentos(id));
  }

  @Get(':id/pagos')
  getPagos(@Param('id') id: string) {
    const exp = this.expedientesService.findOne(id);
    return successResponse({ expedienteId: id, pagos: exp.pagos });
  }

  @Post(':id/validar-pago')
  @Roles('Operador', 'Administrador')
  @HttpCode(HttpStatus.OK)
  validarPago(
    @Param('id') id: string,
    @Body() dto: ValidarPagoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return successResponse(
      this.expedientesService.validarPago(
        id,
        dto.pagoId,
        dto.observaciones ?? '',
        user,
      ),
    );
  }

  @Post(':id/certificado')
  @Roles('Operador', 'Administrador')
  @UseInterceptors(FileInterceptor('archivo'))
  @HttpCode(HttpStatus.CREATED)
  subirCertificado(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return successResponse(
      this.expedientesService.subirCertificadoPdf(id, file, user),
    );
  }

  @Get(':id/certificado/descargar')
  descargarCertificado(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const cert = this.expedientesService.descargarCertificadoPdf(id, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${cert.nombreArchivo}"`,
      'X-Certificate-Hash': `sha256:${cert.hashSha256}`,
      'X-Valid-Until': cert.fechaVencimiento.substring(0, 10),
    });
    res.send(cert.buffer);
  }
}
