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

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthExps = all.filter(
      (e) =>
        new Date(e.metadata.fechaCreacion) >= lastMonth &&
        new Date(e.metadata.fechaCreacion) < thisMonth,
    );

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
        { estado: 'Expirado', cantidad: expirados, porcentaje: pct(expirados) },
      ],
      tendencias: {
        ultimoMes: {
          nuevos: lastMonthExps.length,
          aprobados: lastMonthExps.filter(
            (e) => e.estado.actual === 'Aprobado - Pendiente de Pago',
          ).length,
          rechazados: lastMonthExps.filter(
            (e) => e.estado.actual === 'Rechazado',
          ).length,
          certificados: lastMonthExps.filter(
            (e) => e.estado.actual === 'Certificado Emitido',
          ).length,
        },
        variacion: { nuevos: 0, aprobados: 0, rechazados: 0, certificados: 0 },
      },
      alertas: {
        proximosExpirar: 0,
        pendientesVencidos: 0,
      },
    };
  }

  getActividadReciente(limit: number = 10) {
    // Gather historial entries from all expedientes, sorted by date desc
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
      'Rechazado ': 'EXPEDIENTE_RECHAZADO',
      'Pago Confirmado - Pendiente Validación': 'PAGO_CONFIRMADO',
      'Certificado Emitido': 'CERTIFICADO_EMITIDO',
    };
    return map[estado] ?? 'ACCION';
  }
}
