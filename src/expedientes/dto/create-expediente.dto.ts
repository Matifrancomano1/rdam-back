import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class DeudorDto {
  @IsString() nombreCompleto: string;
  @IsIn(['DNI', 'CEDULA', 'PASAPORTE']) tipoIdentificacion: string;
  @IsString() numeroIdentificacion: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() telefono?: string;
}

class BeneficiarioDto {
  @IsString() nombre: string;
  @IsString() parentesco: string;
}

class DeudaDto {
  @IsNumber() montoAdeudado: number;
  @IsString() periodoDeuda: string;
  @ValidateNested() @Type(() => BeneficiarioDto) beneficiario: BeneficiarioDto;
}

export class CreateExpedienteDto {
  @ValidateNested() @Type(() => DeudorDto) deudor: DeudorDto;
  @ValidateNested() @Type(() => DeudaDto) deuda: DeudaDto;
  @IsIn(['Santa Fe', 'Rosario', 'Venado Tuerto', 'Rafaela', 'Reconquista'])
  sede: string;
  @IsOptional() @IsString() observaciones?: string;
}
