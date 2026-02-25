import { IsString, IsEmail, IsOptional, IsBoolean, IsIn } from 'class-validator';

const ROLES = ['Ciudadano', 'Operador', 'Administrador'];
const SEDES = ['Santa Fe', 'Rosario', 'Venado Tuerto', 'Rafaela', 'Reconquista'];

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsIn(ROLES)
  rol?: string;

  @IsOptional()
  @IsIn(SEDES)
  departamento?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
