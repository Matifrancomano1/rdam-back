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
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ExpedientesService } from './expedientes.service';
import { CreateExpedienteDto } from './dto/create-expediente.dto';
import { UpdateExpedienteDto } from './dto/update-expediente.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { successResponse } from '../common/response.helper';
import { IsString, IsOptional } from 'class-validator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function validateUploadedFile(file: Express.Multer.File): void {
  if (!file)
    throw new BadRequestException('MISSING_FILE: Se requiere un archivo');
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype))
    throw new BadRequestException(
      `INVALID_FILE_TYPE: Solo se aceptan PDF, JPG o PNG. Recibido: ${file.mimetype}`,
    );
  if (file.size > MAX_FILE_SIZE)
    throw new BadRequestException(
      `FILE_TOO_LARGE: El tamaño máximo es 10 MB. Recibido: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
    );
}

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

  @Post('publico/solicitar-codigo')
  @Public()
  @HttpCode(HttpStatus.OK)
  async solicitarCodigoAcceso(@Body() body: { dni: string; email: string }) {
    if (!body.dni || !body.email) {
      throw new BadRequestException(
        'Se requieren los parámetros "dni" y "email"',
      );
    }
    return successResponse(
      await this.expedientesService.solicitarCodigoAcceso(
        body.dni.trim(),
        body.email.trim(),
      ),
    );
  }

  @Get('publico/buscar')
  @Public()
  @HttpCode(HttpStatus.OK)
  buscarPorDniEmail(
    @Query('dni') dni: string,
    @Query('email') email: string,
    @Query('codigo') codigo: string,
  ) {
    if (!dni || !email || !codigo)
      throw new BadRequestException(
        'Se requieren los parámetros "dni", "email" y "codigo" para la búsqueda pública',
      );
    return successResponse(
      this.expedientesService.buscarPorDniEmail(
        dni.trim(),
        email.trim(),
        codigo.trim(),
      ),
    );
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
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  uploadDocumento(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    validateUploadedFile(file);
    const data = this.expedientesService.addDocumento(id, file, user.id);
    return successResponse({ ...data, expedienteId: id });
  }

  @Get(':id/documentos')
  getDocumentos(@Param('id') id: string) {
    return successResponse(this.expedientesService.getDocumentos(id));
  }

  /**
   * GET /v1/expedientes/:id/documentos/:docId/descargar
   * Endpoint PÚBLICO — permite al ciudadano descargar/ver un documento
   */
  @Get(':id/documentos/:docId/descargar')
  @Public()
  @HttpCode(HttpStatus.OK)
  descargarDocumento(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Res() res: Response,
  ) {
    const result = this.expedientesService.getDocumentoBuffer(id, docId);
    if (!result) throw new NotFoundException('Documento no encontrado');
    res.set({
      'Content-Type': result.tipoMime,
      'Content-Disposition': `inline; filename="${encodeURIComponent(result.nombreArchivo)}"`,
      'Cache-Control': 'no-store',
    });
    res.send(result.buffer);
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
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  subirCertificado(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file)
      throw new BadRequestException('MISSING_FILE: Se requiere un archivo PDF');
    if (file.mimetype !== 'application/pdf')
      throw new BadRequestException(
        'INVALID_FILE_TYPE: Solo se aceptan archivos PDF para certificados',
      );
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
