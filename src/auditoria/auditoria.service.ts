import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface LogEntry {
  id: string;
  usuario: { id: string; nombre: string };
  accion: string;
  entidad: string;
  entidadId: string;
  detalles: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  fecha: string;
}

export const auditoriaStore: LogEntry[] = [];

@Injectable()
export class AuditoriaService {
  registrar(entry: Omit<LogEntry, 'id' | 'fecha'>) {
    const log: LogEntry = {
      id: uuidv4(),
      fecha: new Date().toISOString(),
      ...entry,
    };
    auditoriaStore.push(log);
    return log;
  }

  getLogs(query: {
    usuarioId?: string;
    expedienteId?: string;
    accion?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    limit?: number;
  }) {
    let list = [...auditoriaStore];

    if (query.usuarioId)
      list = list.filter((l) => l.usuario.id === query.usuarioId);
    if (query.expedienteId)
      list = list.filter((l) => l.entidadId === query.expedienteId);
    if (query.accion)
      list = list.filter((l) =>
        l.accion.toLowerCase().includes(query.accion!.toLowerCase()),
      );
    if (query.fechaDesde)
      list = list.filter((l) => l.fecha >= query.fechaDesde!);
    if (query.fechaHasta)
      list = list.filter((l) => l.fecha <= query.fechaHasta!);

    list.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const total = list.length;

    return {
      logs: list.slice((page - 1) * limit, page * limit),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
