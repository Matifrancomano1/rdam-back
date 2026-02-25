import { IsString, IsNumber, IsEmail, IsOptional, IsIn, IsDateString } from 'class-validator';

export class CrearOrdenDto {
  @IsString() expedienteId: string;
  @IsNumber() monto: number;
  @IsEmail() email: string;
}
