import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { CreateExpedienteDto } from './dto/create-expediente.dto';
import { UpdateExpedienteDto } from './dto/update-expediente.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { MailService } from '../mail/mail.service';

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
  buffer?: Buffer; // In-memory for download
}

export interface CertificadoPdf {
  id: string;
  numeroCertificado: string;
  nombreArchivo: string;
  tamanoBytes: number;
  hashSha256: string;
  buffer: Buffer; // In-memory (POC)
  fechaEmision: string;
  fechaVencimiento: string;
  urlDescarga: string;
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
  certificadoPdf?: CertificadoPdf;
  metadata: {
    fechaCreacion: string;
    fechaActualizacion: string;
    usuarioCreacion: string;
    usuarioAsignado: string;
    sede: string;
    observaciones?: string;
    activo: boolean;
    codigoAcceso?: string;
    codigoAccesoExpires?: string;
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
  constructor(private readonly mailService: MailService) {}

  create(dto: CreateExpedienteDto, user: JwtPayload) {
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
      list = list.filter((e) =>
        e.metadata.fechaCreacion.startsWith(query.fecha!),
      );
    if (query.montoMin !== undefined)
      list = list.filter((e) => e.deuda.montoAdeudado >= query.montoMin!);
    if (query.montoMax !== undefined)
      list = list.filter((e) => e.deuda.montoAdeudado <= query.montoMax!);

    // Sorting
    const sortBy = query.sortBy ?? 'fechaCreacion';
    const sortOrder = query.sortOrder ?? 'desc';
    list.sort((a, b) => {
      const aVal =
        sortBy === 'fechaCreacion'
          ? a.metadata.fechaCreacion
          : a.deuda.montoAdeudado;
      const bVal =
        sortBy === 'fechaCreacion'
          ? b.metadata.fechaCreacion
          : b.deuda.montoAdeudado;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 100);
    const total = list.length;
    const sliced = list.slice((page - 1) * limit, page * limit);

    return {
      expedientes: sliced.map((e) => this.toListItem(e)),
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

  /**
   * Búsqueda pública por DNI + email (sin autenticación).
   * Genera un código de acceso y lo envía por correo.
   */
  async solicitarCodigoAcceso(dni: string, email: string) {
    const exp = expedientesStore.find(
      (e) =>
        e.metadata.activo &&
        e.deudor.numeroIdentificacion === dni &&
        e.deudor.email.toLowerCase() === email.toLowerCase(),
    );

    if (!exp)
      throw new NotFoundException(
        'No se encontró un expediente activo con esos datos. Verificá el DNI y el email registrado.',
      );

    // Generar código numérico de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutos

    exp.metadata.codigoAcceso = codigo;
    exp.metadata.codigoAccesoExpires = expires;

    await this.mailService.sendExpedienteAccessCode(exp.deudor.email, codigo);

    return { message: 'Código enviado exitosamente al correo registrado.' };
  }

  /**
   * Búsqueda pública por DNI + email + código (sin autenticación).
   * Valida el código de acceso antes de devolver el expediente.
   */
  buscarPorDniEmail(dni: string, email: string, codigo: string) {
    const exp = expedientesStore.find(
      (e) =>
        e.metadata.activo &&
        e.deudor.numeroIdentificacion === dni &&
        e.deudor.email.toLowerCase() === email.toLowerCase(),
    );

    if (!exp)
      throw new NotFoundException(
        'No se encontró un expediente activo con esos datos. Verificá el DNI y el email registrado.',
      );

    if (!exp.metadata.codigoAcceso || exp.metadata.codigoAcceso !== codigo) {
      throw new ForbiddenException('El código de acceso es incorrecto.');
    }

    if (
      exp.metadata.codigoAccesoExpires &&
      new Date(exp.metadata.codigoAccesoExpires) < new Date()
    ) {
      throw new ForbiddenException(
        'El código de acceso ha expirado. Solicitá uno nuevo.',
      );
    }

    // Opcional: Consumir el código para que sea de un solo uso
    exp.metadata.codigoAcceso = undefined;
    exp.metadata.codigoAccesoExpires = undefined;

    // Vista pública: no expone datos internos del operador ni metadata interna
    return {
      id: exp.id,
      numeroExpediente: exp.numeroExpediente,
      deudor: {
        nombreCompleto: exp.deudor.nombreCompleto,
        tipoIdentificacion: exp.deudor.tipoIdentificacion,
        numeroIdentificacion: exp.deudor.numeroIdentificacion,
        email: exp.deudor.email,
      },
      deuda: {
        montoAdeudado: exp.deuda.montoAdeudado,
        periodoDeuda: exp.deuda.periodoDeuda,
        beneficiario: exp.deuda.beneficiario,
      },
      estado: exp.estado,
      documentos: exp.documentos.map((d) => ({
        id: d.id,
        nombreArchivo: d.nombreArchivo,
        tipoMime: d.tipoMime,
        url: d.url,
        fechaSubida: d.fechaSubida,
      })),
      tieneCertificado: !!exp.certificadoPdf,
    };
  }

  update(id: string, dto: UpdateExpedienteDto) {
    const exp = expedientesStore.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Expediente no encontrado');
    if (dto.deudor?.email) exp.deudor.email = dto.deudor.email;
    if (dto.deudor?.telefono) exp.deudor.telefono = dto.deudor.telefono;
    if (dto.deuda?.montoAdeudado)
      exp.deuda.montoAdeudado = dto.deuda.montoAdeudado;
    if (dto.deuda?.periodoDeuda)
      exp.deuda.periodoDeuda = dto.deuda.periodoDeuda;
    if (dto.observaciones) exp.metadata.observaciones = dto.observaciones;
    exp.metadata.fechaActualizacion = new Date().toISOString();
    return this.toResponse(exp);
  }

  aprobar(id: string, observaciones: string, user: JwtPayload) {
    const exp = expedientesStore.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Expediente no encontrado');
    if (exp.estado.actual !== 'Pendiente de Revisión')
      throw new ConflictException(
        'El expediente no puede ser aprobado en su estado actual',
      );

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

  rechazar(id: string, observaciones: string, user: JwtPayload) {
    const exp = expedientesStore.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Expediente no encontrado');
    if (
      !['Pendiente de Revisión', 'Aprobado - Pendiente de Pago'].includes(
        exp.estado.actual,
      )
    )
      throw new ConflictException(
        'El expediente no puede ser rechazado en su estado actual',
      );

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

    const docId = uuidv4();
    const doc: DocumentoExpediente = {
      id: docId,
      nombreArchivo: file.originalname,
      tipoMime: file.mimetype,
      tamanioBytes: file.size,
      url: `/expedientes/${id}/documentos/${docId}/descargar`,
      subidoPor: userId,
      fechaSubida: new Date().toISOString(),
      buffer: file.buffer,
    };
    exp.documentos.push(doc);
    return doc;
  }

  getDocumentoBuffer(
    expedienteId: string,
    docId: string,
  ): { buffer: Buffer; tipoMime: string; nombreArchivo: string } | null {
    const exp = expedientesStore.find((e) => e.id === expedienteId);
    if (!exp) return null;
    const doc = exp.documentos.find((d) => d.id === docId);
    if (!doc || !doc.buffer) return null;
    return {
      buffer: doc.buffer,
      tipoMime: doc.tipoMime,
      nombreArchivo: doc.nombreArchivo,
    };
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
    user: JwtPayload,
  ) {
    const exp = expedientesStore.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Expediente no encontrado');
    if (exp.estado.actual !== 'Pago Confirmado - Pendiente Validación')
      throw new ConflictException(
        'El expediente no está en estado de validación de pago',
      );

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

  subirCertificadoPdf(id: string, file: Express.Multer.File, user: JwtPayload) {
    const exp = expedientesStore.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Expediente no encontrado');

    if (exp.estado.actual !== 'Pago Confirmado - Pendiente Validación')
      throw new ConflictException(
        'INVALID_STATE_TRANSITION: El expediente no está en estado "Pago Confirmado - Pendiente Validación"',
      );

    if (exp.certificadoPdf)
      throw new ConflictException(
        'CERTIFICADO_YA_EXISTE: Ya existe un certificado activo para este expediente',
      );

    if (file.mimetype !== 'application/pdf')
      throw new BadRequestException(
        'INVALID_FILE_TYPE: Solo se aceptan archivos PDF',
      );

    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE)
      throw new BadRequestException(
        'FILE_TOO_LARGE: El tamaño máximo es 10 MB',
      );

    const now = new Date();
    const vencimiento = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const year = now.getFullYear();
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const numeroCertificado = `CERT-RDAM-${year}-${uuidv4().substring(0, 8).toUpperCase()}`;
    const certId = uuidv4();

    const cert: CertificadoPdf = {
      id: certId,
      numeroCertificado,
      nombreArchivo: file.originalname,
      tamanoBytes: file.size,
      hashSha256: hash,
      buffer: file.buffer,
      fechaEmision: now.toISOString(),
      fechaVencimiento: vencimiento.toISOString(),
      urlDescarga: `/expedientes/${id}/certificado/descargar`,
    };

    exp.certificadoPdf = cert;

    // Transition state
    const estadoAnterior = exp.estado.actual;
    exp.estado.actual = 'Certificado Emitido';
    exp.estado.fechaActualizacion = now.toISOString();
    exp.historial.push({
      id: uuidv4(),
      estadoAnterior,
      estadoNuevo: 'Certificado Emitido',
      usuario: { id: user.id, nombre: user.nombre },
      fechaCambio: now.toISOString(),
      observaciones: 'Certificado PDF subido por operador',
      ipAddress: '0.0.0.0',
      metadata: { certId, numeroCertificado },
    });

    return {
      id: certId,
      expedienteId: id,
      numeroCertificado,
      nombreArchivo: file.originalname,
      tamanoBytes: file.size,
      hashSha256: hash,
      fechaEmision: now.toISOString(),
      fechaVencimiento: vencimiento.toISOString(),
      urlDescarga: `/expedientes/${id}/certificado/descargar`,
      estadoExpediente: 'Certificado Emitido',
    };
  }

  descargarCertificadoPdf(id: string, requestingUser: JwtPayload) {
    const exp = expedientesStore.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Expediente no encontrado');

    if (!exp.certificadoPdf)
      throw new NotFoundException(
        'CERTIFICADO_NO_ENCONTRADO: No existe certificado activo para este expediente',
      );

    // RLS: citizens can only access their own expediente
    if (requestingUser.rol === 'Ciudadano') {
      const emailMatch =
        exp.deudor.email.toLowerCase() === requestingUser.email.toLowerCase();
      if (!emailMatch)
        throw new ForbiddenException(
          'INSUFFICIENT_PERMISSIONS: El email no coincide con el del expediente',
        );
    }

    return exp.certificadoPdf;
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
