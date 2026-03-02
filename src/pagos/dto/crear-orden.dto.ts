import { IsString, IsNumber, IsEmail } from 'class-validator';

export class CrearOrdenDto {
  @IsString()
  expedienteId: string;

  @IsNumber()
  monto: number;

  @IsEmail()
  email: string;
}
