import { IsString, IsOptional, IsNumber, IsEmail } from 'class-validator';

export class UpdateExpedienteDto {
  @IsOptional()
  deudor?: {
    telefono?: string;
    email?: string;
  };

  @IsOptional()
  deuda?: {
    montoAdeudado?: number;
    periodoDeuda?: string;
  };

  @IsOptional()
  @IsString()
  observaciones?: string;
}
