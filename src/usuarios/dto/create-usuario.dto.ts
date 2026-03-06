import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsIn,
  MinLength,
} from 'class-validator';

const ROLES = ['Ciudadano', 'Operador', 'Administrador'];
const SEDES = [
  'Santa Fe',
  'Rosario',
  'Venado Tuerto',
  'Rafaela',
  'Reconquista',
];

export class CreateUsuarioDto {
  @IsString()
  username: string;

  @IsString()
  nombre: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsIn(ROLES)
  rol: string;

  @IsIn(SEDES)
  departamento: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
