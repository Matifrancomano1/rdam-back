import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { expedientesStore } from '../expedientes/expedientes.service';
import { createHash } from 'crypto';

export interface Certificado {
  id: string;
  numeroCertificado: string;
  expedienteId: string;
  fechaEmision: string;
  fechaVencimiento: string;
  archivoUrl: string;
  codigoQR: string;
  hash: string;
  revocado: boolean;
  fechaRevocacion?: string;
  motivoRevocacion?: string;
  contadorDescargas: number;
  fechaPrimeraDescarga?: string;
}

export const certificadosStore: Certificado[] = [];
let certSecuencial = 1;

@Injectable()
export class CertificadosService {
  generar(expedienteId: string): Certificado {
    const exp = expedientesStore.find((e) => e.id === expedienteId);
    if (!exp) throw new NotFoundException('Expediente no encontrado');

    const now = new Date();
    const vencimiento = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
    const year = now.getFullYear();
    const num = String(certSecuencial++).padStart(5, '0');
    const numeroCertificado = `CERT-RDAM-${year}-${num}`;

    const hash = createHash('sha256')
      .update(`${numeroCertificado}-${expedienteId}-${now.toISOString()}`)
      .digest('hex');

    const cert: Certificado = {
      id: uuidv4(),
      numeroCertificado,
      expedienteId,
      fechaEmision: now.toISOString(),
      fechaVencimiento: vencimiento.toISOString(),
      archivoUrl: `/certificados/${numeroCertificado}/descargar`,
      codigoQR: `https://rdam.gob.ar/validar/${numeroCertificado}`,
      hash: `sha256:${hash}`,
      revocado: false,
      contadorDescargas: 0,
    };
    certificadosStore.push(cert);
    return cert;
  }

  descargar(id: string) {
    const cert = certificadosStore.find((c) => c.id === id);
    if (!cert) throw new NotFoundException('Certificado no encontrado');
    if (!cert.fechaPrimeraDescarga)
      cert.fechaPrimeraDescarga = new Date().toISOString();
    cert.contadorDescargas++;
    return cert;
  }

  validar(numeroCertificado: string) {
    const cert = certificadosStore.find((c) => c.numeroCertificado === numeroCertificado);
    if (!cert)
      return { valido: false, numeroCertificado, estado: 'No encontrado', revocado: false };

    const exp = expedientesStore.find((e) => e.id === cert.expedienteId);
    const ahora = new Date();
    const vencido = new Date(cert.fechaVencimiento) < ahora;

    return {
      valido: !cert.revocado && !vencido,
      numeroCertificado: cert.numeroCertificado,
      expediente: exp?.numeroExpediente ?? '',
      deudor: exp?.deudor.nombreCompleto ?? '',
      numeroIdentificacion: exp?.deudor.numeroIdentificacion ?? '',
      fechaEmision: cert.fechaEmision,
      fechaVencimiento: cert.fechaVencimiento,
      estado: cert.revocado ? 'Revocado' : vencido ? 'Vencido' : 'Vigente',
      revocado: cert.revocado,
    };
  }
}
