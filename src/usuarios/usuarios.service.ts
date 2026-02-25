import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { usersStore, StoredUser } from '../auth/auth.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  findAll(query: {
    search?: string;
    rol?: string;
    activo?: boolean;
    page?: number;
    limit?: number;
  }) {
    let list = [...usersStore];
    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter(
        (u) =>
          u.username.toLowerCase().includes(s) ||
          u.nombre.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s),
      );
    }
    if (query.rol) list = list.filter((u) => u.rol === query.rol);
    if (query.activo !== undefined) list = list.filter((u) => u.activo === query.activo);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const total = list.length;
    const sliced = list.slice((page - 1) * limit, page * limit);

    return {
      usuarios: sliced.map(this.toPublic),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findOne(id: string) {
    const user = usersStore.find((u) => u.id === id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.toPublic(user);
  }

  async create(dto: CreateUsuarioDto) {
    const exists = usersStore.find(
      (u) => u.username === dto.username || u.email === dto.email,
    );
    if (exists) throw new ConflictException('Username o email ya registrado');

    const user: StoredUser = {
      id: uuidv4(),
      username: dto.username,
      nombre: dto.nombre,
      email: dto.email,
      telefono: dto.telefono,
      passwordHash: await bcrypt.hash(dto.password, 10),
      rol: dto.rol as any,
      departamento: dto.departamento,
      activo: dto.activo ?? true,
      fechaCreacion: new Date().toISOString(),
    };
    usersStore.push(user);
    return this.toPublic(user);
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    const user = usersStore.find((u) => u.id === id);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.nombre) user.nombre = dto.nombre;
    if (dto.email) user.email = dto.email;
    if (dto.telefono) user.telefono = dto.telefono;
    if (dto.rol) user.rol = dto.rol as any;
    if (dto.departamento) user.departamento = dto.departamento;
    if (dto.activo !== undefined) user.activo = dto.activo;

    return { ...this.toPublic(user), fechaActualizacion: new Date().toISOString() };
  }

  softDelete(id: string) {
    const user = usersStore.find((u) => u.id === id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.activo = false;
    return {
      id: user.id,
      username: user.username,
      activo: false,
      fechaDesactivacion: new Date().toISOString(),
    };
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
    requestingUserId: string,
    requestingUserRol: string,
  ) {
    if (newPassword !== confirmPassword)
      throw new ForbiddenException('Las contraseñas no coinciden');

    const user = usersStore.find((u) => u.id === id);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Admin can change others' passwords; normal user can only change their own
    if (requestingUserId !== id && requestingUserRol !== 'Administrador')
      throw new ForbiddenException('Sin permisos para cambiar esta contraseña');

    if (requestingUserId === id) {
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) throw new ForbiddenException('Contraseña actual incorrecta');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  private toPublic(u: StoredUser) {
    return {
      id: u.id,
      username: u.username,
      nombre: u.nombre,
      email: u.email,
      telefono: u.telefono,
      rol: u.rol,
      departamento: u.departamento,
      activo: u.activo,
      fechaCreacion: u.fechaCreacion,
      ultimoAcceso: u.ultimoAcceso,
    };
  }
}
