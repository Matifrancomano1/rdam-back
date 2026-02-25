import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Response,
} from '@nestjs/common';
import type { Response as Res } from 'express';
import { CertificadosService } from './certificados.service';
import { GenerarCertificadoDto } from './dto/generar-certificado.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { successResponse } from '../common/response.helper';

@Controller('certificados')
export class CertificadosController {
  constructor(private readonly certificadosService: CertificadosService) {}

  @Post('generar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  generar(@Body() dto: GenerarCertificadoDto) {
    return successResponse(this.certificadosService.generar(dto.expedienteId));
  }

  @Get('validar/:numeroCertificado')
  // Public endpoint - no JWT required
  validar(@Param('numeroCertificado') numeroCertificado: string) {
    return successResponse(this.certificadosService.validar(numeroCertificado));
  }

  @Get(':id/descargar')
  @UseGuards(JwtAuthGuard)
  descargar(@Param('id') id: string, @Response() res: Res) {
    const cert = this.certificadosService.descargar(id);
    // Return a minimal PDF placeholder
    const pdfContent = `%PDF-1.4\nCERTIFICADO RDAM - ${cert.numeroCertificado}\nFecha: ${cert.fechaEmision}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${cert.numeroCertificado}.pdf"`,
    );
    res.send(Buffer.from(pdfContent, 'utf-8'));
  }
}
