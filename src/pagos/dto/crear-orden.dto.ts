import {
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CrearOrdenDto {
  @IsString()
  expedienteId: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  @Max(99999999, { message: 'El monto supera el límite permitido' })
  monto: number;

  @IsOptional()
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email?: string;
}
