import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsPositive,
  ValidateNested,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class DeudorDto {
  @IsString()
  @MinLength(5, {
    message: 'El nombre completo debe tener al menos 5 caracteres',
  })
  @MaxLength(150, {
    message: 'El nombre completo no puede superar los 150 caracteres',
  })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]+$/, {
    message:'El nombre completo solo puede contener letras, espacios y guiones',
  })
  nombreCompleto: string;

  @IsIn(['DNI', 'CEDULA', 'PASAPORTE'], {
    message: 'El tipo de identificación debe ser DNI, CEDULA o PASAPORTE',
  })
  tipoIdentificacion: string;

  @IsString()
  @MinLength(7, {
    message: 'El número de identificación debe tener al menos 7 dígitos',
  })
  @MaxLength(12, {
    message: 'El número de identificación no puede superar los 12 dígitos',
  })
  @Matches(/^\d+$/, {
    message: 'El número de identificación solo puede contener dígitos',
  })
  numeroIdentificacion: string;

  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s()\-+]{7,20}$/, {
    message: 'El teléfono tiene un formato inválido (ej: +54 11 1234-5678)',
  })
  telefono?: string;
}

class BeneficiarioDto {
  @IsString()
  @MinLength(2, {
    message: 'El nombre del beneficiario debe tener al menos 2 caracteres',
  })
  @MaxLength(150)
  nombre: string;

  @IsString()
  @MinLength(2)
  parentesco: string;
}

class DeudaDto {
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  montoAdeudado: number;

  @IsString()
  @MinLength(3, { message: 'El período de deuda es requerido' })
  periodoDeuda: string;

  @ValidateNested()
  @Type(() => BeneficiarioDto)
  beneficiario: BeneficiarioDto;
}

export class CreateExpedienteDto {
  @ValidateNested()
  @Type(() => DeudorDto)
  deudor: DeudorDto;

  @ValidateNested()
  @Type(() => DeudaDto)
  deuda: DeudaDto;

  @IsIn(['Santa Fe', 'Rosario', 'Venado Tuerto', 'Rafaela', 'Reconquista'], {
    message: 'La sede debe ser una de las sedes habilitadas',
  })
  sede: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
