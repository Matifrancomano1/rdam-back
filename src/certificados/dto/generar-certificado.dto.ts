import { IsString } from 'class-validator';

export class GenerarCertificadoDto {
  @IsString() expedienteId: string;
}
