import {
  IsString,
  IsOptional,
  IsNumber,
  IsEmail,
  IsPositive,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateDeudorDto {
  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s()\-+]{7,20}$/, {
    message: 'El teléfono tiene un formato inválido (ej: +54 11 1234-5678)',
  })
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email?: string;
}

class UpdateDeudaDto {
  @IsOptional()
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  montoAdeudado?: number;

  @IsOptional()
  @IsString()
  periodoDeuda?: string;
}

export class UpdateExpedienteDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDeudorDto)
  deudor?: UpdateDeudorDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDeudaDto)
  deuda?: UpdateDeudaDto;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
