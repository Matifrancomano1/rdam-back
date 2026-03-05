import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { JWT_SECRET } from './strategies/jwt.strategy';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from '../mail';
import { RegisterDto } from './dto/register.dto';

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
  /** Email verification status */
  isVerified: boolean;
  /** Token sent to user for email confirmation */
  verificationToken?: string;
  /** When the token expires */
  verificationTokenExpires?: Date;
  /** Timestamp when last verification email was sent */
  lastVerificationEmailSent?: Date;
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
    isVerified: true,
    verificationToken: undefined,
    verificationTokenExpires: undefined,
    lastVerificationEmailSent: undefined,
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
    isVerified: true,
    verificationToken: undefined,
    verificationTokenExpires: undefined,
    lastVerificationEmailSent: undefined,
  },
  {
    id: 'uuid-user-003',
    username: 'ciudadano1',
    nombre: 'Juan Carlos Pérez González',
    email: 'juan.perez@email.com',
    telefono: '+54 11 1234-5678',
    passwordHash: bcrypt.hashSync('Ciudadano123!', 10),
    rol: 'Ciudadano',
    departamento: 'Externo',
    activo: true,
    fechaCreacion: '2026-01-01T00:00:00Z',
    ultimoAcceso: undefined,
    isVerified: true,
    verificationToken: undefined,
    verificationTokenExpires: undefined,
    lastVerificationEmailSent: undefined,
  },
];

// Revoked access tokens (simple blacklist)
const revokedTokens = new Set<string>();

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    // mail service injected for sending verification messages
    private readonly mailService: MailService,
  ) {}

  async login(username: string, password: string) {
    const user = usersStore.find((u) => u.username === username && u.activo);
    if (!user) throw new UnauthorizedException('INVALID_CREDENTIALS');

    if (!user.isVerified) {
      // user must verify email before logging in
      throw new UnauthorizedException('EMAIL_NOT_VERIFIED');
    }

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

  refresh(refreshToken: string) {
    // refresh should also check that user is still verified
    interface RefreshPayload {
      sub: string;
      type: string;
    }
    try {
      const raw: unknown = this.jwtService.verify(refreshToken, {
        secret: JWT_SECRET,
      });
      const payload = raw as RefreshPayload;
      if (payload.type !== 'refresh') throw new Error('Not a refresh token');

      const user = usersStore.find((u) => u.id === payload.sub && u.activo);
      if (!user) throw new UnauthorizedException('User not found');
      if (!user.isVerified) throw new UnauthorizedException('EMAIL_NOT_VERIFIED');

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

  /**
   * Registration flow: hashes password, creates user record,
   * generates verification token and sends email.
   */
  async register(data: RegisterDto) {
    // simple uniqueness checks
    if (usersStore.find((u) => u.username === data.username)) {
      throw new UnauthorizedException('USERNAME_TAKEN');
    }
    if (usersStore.find((u) => u.email === data.email)) {
      throw new UnauthorizedException('EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const token = uuidv4();
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h
    const user: StoredUser = {
      id: uuidv4(),
      username: data.username,
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      passwordHash,
      rol: data.rol || 'Ciudadano',
      departamento: data.departamento || 'Externo',
      activo: true,
      fechaCreacion: now.toISOString(),
      ultimoAcceso: undefined,
      isVerified: false,
      verificationToken: token,
      verificationTokenExpires: expires,
      lastVerificationEmailSent: now,
    };
    usersStore.push(user);

    // send verification email
    await this.mailService.sendVerificationEmail(user.email, token);
    return { message: 'User created. Verification email sent.' };
  }

  /** Process token from link and mark user verified */
  async verifyEmail(token: string) {
    const user = usersStore.find((u) => u.verificationToken === token);
    if (!user) throw new NotFoundException('TOKEN_INVALID');
    if (user.isVerified) {
      return { message: 'Already verified' };
    }
    if (
      !user.verificationTokenExpires ||
      user.verificationTokenExpires < new Date()
    ) {
      throw new BadRequestException('TOKEN_EXPIRED');
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    user.lastVerificationEmailSent = undefined;
    return { message: 'User successfully verified' };
  }


  /**
   * Resend verification email if user exists and isn't verified.
   * Enforces 5‑minute cooldown.
   */
  async resendVerification(email: string) {
    const user = usersStore.find((u) => u.email === email);
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (user.isVerified) {
      throw new BadRequestException('ALREADY_VERIFIED');
    }
    const now = new Date();
    if (
      user.lastVerificationEmailSent &&
      now.getTime() - user.lastVerificationEmailSent.getTime() < 5 * 60 * 1000
    ) {
      throw new HttpException('WAIT_BEFORE_RETRY', HttpStatus.TOO_MANY_REQUESTS);
    }
    // issue new token and expiration
    const token = uuidv4();
    user.verificationToken = token;
    user.verificationTokenExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    user.lastVerificationEmailSent = now;
    await this.mailService.sendVerificationEmail(user.email, token);
    return { message: 'Verification email resent' };
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
      isVerified: user.isVerified,
      fechaCreacion: user.fechaCreacion,
      ultimoAcceso: user.ultimoAcceso,
    };
  }

  isRevoked(token: string): boolean {
    return revokedTokens.has(token);
  }
}
