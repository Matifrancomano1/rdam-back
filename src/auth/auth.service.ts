import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { JWT_SECRET } from './strategies/jwt.strategy';

export interface StoredUser {
  id: string;
  username: string;
  nombre: string;
  email: string;
  telefono?: string;
  passwordHash: string;
  rol: 'Ciudadano' | 'Operador' | 'Administrador';
  departamento: string;
  activo: boolean;
  fechaCreacion: string;
  ultimoAcceso?: string;
}

// In-memory user store with seed data
export const usersStore: StoredUser[] = [
  {
    id: 'uuid-user-001',
    username: 'admin',
    nombre: 'Administrador RDAM',
    email: 'admin@rdam.gob.ar',
    telefono: '+54 341 000-0001',
    passwordHash: bcrypt.hashSync('Admin123!', 10),
    rol: 'Administrador',
    departamento: 'Santa Fe',
    activo: true,
    fechaCreacion: '2025-01-01T00:00:00Z',
    ultimoAcceso: undefined,
  },
  {
    id: 'uuid-user-002',
    username: 'operador1',
    nombre: 'Matias Francomano',
    email: 'matias.francomano@rdam.gob.ar',
    telefono: '+54 11 2345-6789',
    passwordHash: bcrypt.hashSync('Operador123!', 10),
    rol: 'Operador',
    departamento: 'Santa Fe',
    activo: true,
    fechaCreacion: '2025-01-15T08:00:00Z',
    ultimoAcceso: undefined,
  },
];

// Revoked access tokens (simple blacklist)
const revokedTokens = new Set<string>();

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(username: string, password: string) {
    const user = usersStore.find(
      (u) => u.username === username && u.activo,
    );
    if (!user) throw new UnauthorizedException('INVALID_CREDENTIALS');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('INVALID_CREDENTIALS');

    user.ultimoAcceso = new Date().toISOString();

    const payload = {
      sub: user.id,
      username: user.username,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      departamento: user.departamento,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '8h' });
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '30d' },
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        departamento: user.departamento,
        activo: user.activo,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 28800,
        tokenType: 'Bearer',
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: JWT_SECRET,
      });
      if (payload.type !== 'refresh') throw new Error('Not a refresh token');

      const user = usersStore.find((u) => u.id === payload.sub && u.activo);
      if (!user) throw new UnauthorizedException('User not found');

      const newPayload = {
        sub: user.id,
        username: user.username,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        departamento: user.departamento,
      };
      const accessToken = this.jwtService.sign(newPayload, { expiresIn: '8h' });
      return { accessToken, expiresIn: 28800 };
    } catch {
      throw new UnauthorizedException('TOKEN_INVALID');
    }
  }

  logout(token: string) {
    revokedTokens.add(token);
  }

  getMe(userId: string) {
    const user = usersStore.find((u) => u.id === userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      email: user.email,
      telefono: user.telefono,
      rol: user.rol,
      departamento: user.departamento,
      activo: user.activo,
      fechaCreacion: user.fechaCreacion,
      ultimoAcceso: user.ultimoAcceso,
    };
  }

  isRevoked(token: string): boolean {
    return revokedTokens.has(token);
  }
}
