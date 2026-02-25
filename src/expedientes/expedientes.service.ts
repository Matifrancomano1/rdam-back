import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateExpedienteDto } from './dto/create-expediente.dto';
import { UpdateExpedienteDto } from './dto/update-expediente.dto';

export type EstadoExpediente =
  | 'Pendiente de Revisión'
  | 'Rechazado'
  | 'Aprobado - Pendiente de Pago'
  | 'Pago Confirmado - Pendiente Validación'
  | 'Certificado Emitido'
  | 'Expirado';

export interface HistorialEntry {
  id: string;
  estadoAnterior: string | null;
  estadoNuevo: string;
  usuario: { id: string; nombre: string };
  fechaCambio: string;
  observaciones: string;
  ipAddress: string;
  metadata: Record<string, any>;
}

export interface DocumentoExpediente {
  id: string;
  nombreArchivo: string;
  tipoMime: string;
  tamanioBytes: number;
  url: string;
  subidoPor: string;
  fechaSubida: string;
}

export interface Expediente {
  id: string;
  numeroExpediente: string;
  deudor: {
    nombreCompleto: string;
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    email: string;
    telefono?: string;
  };
  deuda: {
    montoAdeudado: number;
    periodoDeuda: string;
    beneficiario: { nombre: string; parentesco: string };
  };
  estado: {
    actual: EstadoExpediente;
    fechaActualizacion: string;
    fechaExpiracion: string | null;
  };
  pagos: string[]; // pago IDs
  documentos: DocumentoExpediente[];
  metadata: {
    fechaCreacion: string;
    fechaActualizacion: string;
    usuarioCreacion: string;
    usuarioAsignado: string;
    sede: string;
    observaciones?: string;
    activo: boolean;
  };
  historial: HistorialEntry[];
}

export const expedientesStore: Expediente[] = [];
let secuencial = 1;

function generateNumeroExpediente(): string {
  const year = new Date().getFullYear();
  const num = String(secuencial++).padStart(5, '0');
  return `RDAM-${year}-${num}`;
}

@Injectable()
export class ExpedientesService {
  create(dto: CreateExpedienteDto, user: { id: string; nombre: string }) {
    const now = new Date().toISOString();
    const id = uuidv4();
    const expediente: Expediente = {
      id,
      numeroExpediente: generateNumeroExpediente(),
      deudor: { ...dto.deudor },
      deuda: { ...dto.deuda },
      estado: {
        actual: 'Pendiente de Revisión',
        fechaActualizacion: now,
        fechaExpiracion: null,
      },
      pagos: [],
      documentos: [],
      metadata: {
        fechaCreacion: now,
        fechaActualizacion: now,
        usuarioCreacion: user.id,
        usuarioAsignado: user.id,
        sede: dto.sede,
        observaciones: dto.observaciones,
        activo: true,
      },
      historial: [
        {
          id: uuidv4(),
          estadoAnterior: null,
          estadoNuevo: 'Pendiente de Revisión',
          usuario: { id: user.id, nombre: user.nombre },
          fechaCambio: now,
          observaciones: 'Expediente creado',
          ipAddress: '0.0.0.0',
          metadata: {},
        },
      ],
    };
    expedientesStore.push(expediente);
    return this.toResponse(expediente);
  }

  findAll(query: {
    estado?: string;
    search?: string;
    fecha?: string;
    montoMin?: number;
    montoMax?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    let list = expedientesStore.filter((e) => e.metadata.activo);

    if (query.estado) {
      const estadoMap: Record<string, string> = {
        pendiente: 'Pendiente de Revisión',
        aprobado: 'Aprobado - Pendiente de Pago',
        'pago-confirmado': 'Pago Confirmado - Pendiente Validación',
        certificado: 'Certificado Emitido',
        rechazado: 'Rechazado',
        expirado: 'Expirado',
      };
      const estadoFull = estadoMap[query.estado] ?? query.estado;
      list = list.filter((e) => e.estado.actual === estadoFull);
    }

    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter(
        (e) =>
          e.deudor.nombreCompleto.toLowerCase().includes(s) ||
          e.deudor.numeroIdentificacion.includes(s) ||
          e.numeroExpediente.toLowerCase().includes(s),
      );
    }

    if (query.fecha)
      list = list.filter((e) => e.metadata.fechaCreacion.startsWith(query.fecha!));
    if (query.montoMin !== undefined)
      list = list.filter((e) => e.deuda.montoAdeudado >= query.montoMin!);
    if (query.montoMax !== undefined)
      list = list.filter((e) => e.deuda.montoAdeudado <= query.montoMax!);

    // Sorting
    const sortBy = (query.sortBy ?? 'fechaCreacion') as string;
    const sortOrder = query.sortOrder ?? 'desc';
    list.sort((a, b) => {
      const aVal =
        sortBy === 'fechaCreacion' ? a.metadata.fechaCreacion : a.deuda.montoAdeudado;
      const bVal =
        sortBy === 'fechaCreacion' ? b.metadata.fechaCreacion : b.deuda.montoAdeudado;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 100);
    const total = list.length;
    const sliced = list.slice((page - 1) * limit, page * limit);

    return {
      expedientes: sliced.map(this.toListItem),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  findOne(id: string) {
    const exp = expedientesStore.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Expediente no encontrado');
    return this.toResponse(exp);
  }

  update(id: string, dto: UpdateExpedienteDto) {
    const exp = expedientesStore.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Expediente no encontrado');
    if (dto.deudor?.email) exp.deudor.email = dto.deudor.email;
    if (dto.deudor?.telefono) exp.deudor.telefono = dto.deudor.telefono;
    if (dto.deuda?.montoAdeudado) exp.deuda.montoAdeudado = dto.deuda.montoAdeudado;
    if (dto.deuda?.periodoDeuda) exp.deuda.periodoDeuda = dto.deuda.periodoDeuda;
    if (dto.observaciones) exp.metadata.observaciones = dto.observaciones;
    exp.metadata.fechaActualizacion = new Date().toISOString();
    return this.toResponse(exp);
  }

  aprobar(id: string, observaciones: string, user: { id: string; nombre: string }) {
    const exp = expedientesStore.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Expediente no encontrado');
    if (exp.estado.actual !== 'Pendiente de Revisión')
      throw new ConflictException('El expediente no puede ser aprobado en su estado actual');

    const now = new Date().toISOString();
    const estadoAnterior = exp.estado.actual;
    exp.estado.actual = 'Aprobado - Pendiente de Pago';
    exp.estado.fechaActualizacion = now;
    exp.historial.push({
      id: uuidv4(),
      estadoAnterior,
      estadoNuevo: 'Aprobado - Pendiente de Pago',
      usuario: { id: user.id, nombre: user.nombre },
      fechaCambio: now,
      observaciones,
      ipAddress: '0.0.0.0',
      metadata: {},
    });

    return {
      id: exp.id,
      numeroExpediente: exp.numeroExpediente,
      estado: {
        anterior: estadoAnterior,
        actual: exp.estado.actual,
        fechaCambio: now,
        usuarioCambio: user.id,
      },
      observaciones,
    };
  }

  rechazar(id: string, observaciones: string, user: { id: string; nombre: string }) {
    const exp = expedientesStore.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Expediente no encontrado');
    if (!['Pendiente de Revisión', 'Aprobado - Pendiente de Pago'].includes(exp.estado.actual))
      throw new ConflictException('El expediente no puede ser rechazado en su estado actual');

    const now = new Date().toISOString();
    const estadoAnterior = exp.estado.actual;
    exp.estado.actual = 'Rechazado';
    exp.estado.fechaActualizacion = now;
    exp.historial.push({
      id: uuidv4(),
      estadoAnterior,
      estadoNuevo: 'Rechazado',
      usuario: { id: user.id, nombre: user.nombre },
      fechaCambio: now,
      observaciones,
      ipAddress: '0.0.0.0',
      metadata: {},
    });

    return {
      id: exp.id,
      numeroExpediente: exp.numeroExpediente,
      estado: {
        anterior: estadoAnterior,
        actual: 'Rechazado',
        fechaCambio: now,
        usuarioCambio: user.id,
      },
      observaciones,
    };
  }

  getHistorial(id: string) {
    const exp = expedientesStore.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Expediente no encontrado');
    return {
      expedienteId: exp.id,
      numeroExpediente: exp.numeroExpediente,
      historial: exp.historial,
    };
  }

  addDocumento(
    id: string,
    file: Express.Multer.File,
    userId: string,
  ): DocumentoExpediente {
    const exp = expedientesStore.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Expediente no encontrado');

    const doc: DocumentoExpediente = {
      id: uuidv4(),
      nombreArchivo: file.originalname,
      tipoMime: file.mimetype,
      tamanioBytes: file.size,
      url: `/documentos/${uuidv4()}/descargar`,
      subidoPor: userId,
      fechaSubida: new Date().toISOString(),
    };
    exp.documentos.push(doc);
    return doc;
  }

  getDocumentos(id: string) {
    const exp = expedientesStore.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Expediente no encontrado');
    return { expedienteId: exp.id, documentos: exp.documentos };
  }

  validarPago(
    id: string,
    pagoId: string,
    observaciones: string,
    user: { id: string; nombre: string },
  ) {
    const exp = expedientesStore.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Expediente no encontrado');
    if (exp.estado.actual !== 'Pago Confirmado - Pendiente Validación')
      throw new ConflictException('El expediente no está en estado de validación de pago');

    const now = new Date().toISOString();
    const estadoAnterior = exp.estado.actual;
    exp.estado.actual = 'Certificado Emitido';
    exp.estado.fechaActualizacion = now;
    exp.historial.push({
      id: uuidv4(),
      estadoAnterior,
      estadoNuevo: 'Certificado Emitido',
      usuario: { id: user.id, nombre: user.nombre },
      fechaCambio: now,
      observaciones,
      ipAddress: '0.0.0.0',
      metadata: { pagoId },
    });

    return {
      expedienteId: exp.id,
      pagoId,
      estadoAnterior,
      estadoNuevo: 'Certificado Emitido',
      validadoPor: user.id,
      fechaValidacion: now,
      observaciones,
    };
  }

  // Used by pagos service to mark confirmed
  marcarPagoConfirmado(expedienteId: string, pagoId: string) {
    const exp = expedientesStore.find((e) => e.id === expedienteId);
    if (exp && exp.estado.actual === 'Aprobado - Pendiente de Pago') {
      exp.estado.actual = 'Pago Confirmado - Pendiente Validación';
      exp.estado.fechaActualizacion = new Date().toISOString();
      exp.pagos.push(pagoId);
    }
  }

  private toListItem(e: Expediente) {
    return {
      id: e.id,
      numeroExpediente: e.numeroExpediente,
      deudor: {
        nombreCompleto: e.deudor.nombreCompleto,
        numeroIdentificacion: e.deudor.numeroIdentificacion,
        email: e.deudor.email,
      },
      deuda: {
        montoAdeudado: e.deuda.montoAdeudado,
        beneficiario: { nombre: e.deuda.beneficiario.nombre },
      },
      estado: e.estado,
      fechaCreacion: e.metadata.fechaCreacion,
    };
  }

  private toResponse(e: Expediente) {
    return {
      id: e.id,
      numeroExpediente: e.numeroExpediente,
      deudor: e.deudor,
      deuda: e.deuda,
      estado: e.estado,
      pagos: e.pagos,
      documentos: e.documentos,
      metadata: e.metadata,
    };
  }
}
