import { IsString, MinLength, IsEmail, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  nombre!: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  rol?: 'Ciudadano' | 'Operador' | 'Administrador';

  @IsString()
  @IsOptional()
  departamento?: string;
}
