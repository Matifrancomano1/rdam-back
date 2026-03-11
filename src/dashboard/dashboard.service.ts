import { Injectable } from '@nestjs/common';
import { expedientesStore } from '../expedientes/expedientes.service';

export interface ActividadEntry {
  id: string;
  tipo: string;
  expediente: { id: string; numeroExpediente: string; deudor: string };
  usuario: { id: string; nombre: string };
  fecha: string;
}

@Injectable()
export class DashboardService {
  getMetricas() {
    const all = expedientesStore.filter((e) => e.metadata.activo);

    const countByState = (estado: string) =>
      all.filter((e) => e.estado.actual === estado).length;

    const total = all.length;
    const pendientesRevision = countByState('Pendiente de Revisión');
    const aprobados = countByState('Aprobado - Pendiente de Pago');
    const pagoConfirmado = countByState(
      'Pago Confirmado - Pendiente Validación',
    );
    const certificados = countByState('Certificado Emitido');
    const rechazados = countByState('Rechazado');
    const expirados = countByState('Expirado');

    const pct = (n: number) =>
      total > 0 ? parseFloat(((n / total) * 100).toFixed(2)) : 0;

    // BUG 4 FIX: Contar mes ACTUAL, no el anterior
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Expedientes creados este mes
    const thisMonthExps = all.filter(
      (e) => new Date(e.metadata.fechaCreacion) >= thisMonthStart,
    );

    // Contar aprobados/rechazados por historial del mes actual (no por estado actual)
    let aprobadosMes = 0;
    let rechazadosMes = 0;
    let certificadosMes = 0;
    for (const exp of all) {
      for (const h of exp.historial) {
        if (new Date(h.fechaCambio) >= thisMonthStart) {
          if (h.estadoNuevo === 'Aprobado - Pendiente de Pago') aprobadosMes++;
          if (h.estadoNuevo === 'Rechazado') rechazadosMes++;
          if (h.estadoNuevo === 'Certificado Emitido') certificadosMes++;
        }
      }
    }

    // Alertas: certificados próximos a expirar (<=30 días)
    let proximosExpirar = 0;
    let pendientesVencidos = 0;
    for (const exp of all) {
      if (exp.certificadoPdf?.fechaVencimiento) {
        const diasRestantes = Math.ceil(
          (new Date(exp.certificadoPdf.fechaVencimiento).getTime() -
            now.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (diasRestantes <= 0) pendientesVencidos++;
        else if (diasRestantes <= 30) proximosExpirar++;
      }
    }

    return {
      totales: {
        expedientes: total,
        pendientesRevision,
        pendientesValidacionPago: pagoConfirmado,
        certificadosEmitidos: certificados,
      },
      porEstado: [
        {
          estado: 'Pendiente de Revisión',
          cantidad: pendientesRevision,
          porcentaje: pct(pendientesRevision),
        },
        {
          estado: 'Aprobado - Pendiente de Pago',
          cantidad: aprobados,
          porcentaje: pct(aprobados),
        },
        {
          estado: 'Pago Confirmado - Pendiente Validación',
          cantidad: pagoConfirmado,
          porcentaje: pct(pagoConfirmado),
        },
        {
          estado: 'Certificado Emitido',
          cantidad: certificados,
          porcentaje: pct(certificados),
        },
        {
          estado: 'Rechazado',
          cantidad: rechazados,
          porcentaje: pct(rechazados),
        },
        {
          estado: 'Expirado',
          cantidad: expirados,
          porcentaje: pct(expirados),
        },
      ],
      tendencias: {
        ultimoMes: {
          nuevos: thisMonthExps.length,
          aprobados: aprobadosMes,
          rechazados: rechazadosMes,
          certificados: certificadosMes,
        },
        variacion: {
          nuevos: 0,
          aprobados: 0,
          rechazados: 0,
          certificados: 0,
        },
      },
      alertas: {
        proximosExpirar,
        pendientesVencidos,
      },
    };
  }

  getActividadReciente(limit: number = 10) {
    const actividades: ActividadEntry[] = [];
    for (const exp of expedientesStore) {
      for (const h of exp.historial) {
        actividades.push({
          id: h.id,
          tipo: this.estadoToTipo(h.estadoNuevo),
          expediente: {
            id: exp.id,
            numeroExpediente: exp.numeroExpediente,
            deudor: exp.deudor.nombreCompleto,
          },
          usuario: h.usuario,
          fecha: h.fechaCambio,
        });
      }
    }
    actividades.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    );
    return { actividades: actividades.slice(0, limit) };
  }

  private estadoToTipo(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente de Revisión': 'EXPEDIENTE_CREADO',
      'Aprobado - Pendiente de Pago': 'EXPEDIENTE_APROBADO',
      'Rechazado': 'EXPEDIENTE_RECHAZADO',
      'Pago Confirmado - Pendiente Validación': 'PAGO_CONFIRMADO',
      'Certificado Emitido': 'CERTIFICADO_EMITIDO',
    };
    return map[estado] ?? 'ACCION';
  }
}
