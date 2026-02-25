import { IsString, IsNumber, IsOptional, IsIn, IsDateString } from 'class-validator';

export class RegistrarManualDto {
  @IsString() expedienteId: string;
  @IsNumber() monto: number;
  @IsIn(['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia']) metodoPago: string;
  @IsOptional() @IsString() referenciaExterna?: string;
  @IsOptional() @IsDateString() fechaPago?: string;
  @IsOptional() @IsString() observaciones?: string;
}
