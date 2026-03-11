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

    console.log(
      `[CERT] Certificado generado: ${numeroCertificado} para expediente ${exp.numeroExpediente}`,
    );

    return cert;
  }

  descargar(id: string) {
    const cert = certificadosStore.find((c) => c.id === id);
    if (!cert) throw new NotFoundException('Certificado no encontrado');
    if (!cert.fechaPrimeraDescarga)
      cert.fechaPrimeraDescarga = new Date().toISOString();
    cert.contadorDescargas++;

    console.log(
      `[CERT] Descarga de certificado ${cert.numeroCertificado} (descarga #${cert.contadorDescargas})`,
    );

    return cert;
  }

  validar(numeroCertificado: string) {
    let cert = certificadosStore.find(
      (c) => c.numeroCertificado === numeroCertificado,
    );

    // Fallback: search in expedientesStore by certificadoPdf
    let exp = cert
      ? expedientesStore.find((e) => e.id === cert!.expedienteId)
      : expedientesStore.find(
          (e) => e.certificadoPdf?.numeroCertificado === numeroCertificado,
        );

    // If found in expedientesStore but not in certificadosStore, build cert
    if (!cert && exp?.certificadoPdf) {
      cert = {
        id: exp.certificadoPdf.id,
        numeroCertificado: exp.certificadoPdf.numeroCertificado,
        expedienteId: exp.id,
        fechaEmision: exp.certificadoPdf.fechaEmision,
        fechaVencimiento: exp.certificadoPdf.fechaVencimiento,
        archivoUrl: exp.certificadoPdf.urlDescarga,
        codigoQR: '',
        hash: exp.certificadoPdf.hashSha256,
        revocado: false,
        contadorDescargas: 0,
      };
    }

    if (!cert) {
      console.log(
        `[CERT] Validación fallida: certificado ${numeroCertificado} no encontrado`,
      );
      return {
        valido: false,
        numeroCertificado,
        estado: 'No encontrado',
        revocado: false,
      };
    }

    if (!exp) {
      exp = expedientesStore.find((e) => e.id === cert.expedienteId);
    }
    const ahora = new Date();
    const vencido = new Date(cert.fechaVencimiento) < ahora;

    // Verificar integridad del hash si el expediente tiene certificadoPdf
    let hashIntegro = true;
    if (exp?.certificadoPdf?.buffer) {
      const hashRecalculado = createHash('sha256')
        .update(exp.certificadoPdf.buffer)
        .digest('hex');
      hashIntegro = exp.certificadoPdf.hashSha256 === hashRecalculado;
      if (!hashIntegro) {
        console.warn(
          `[CERT] ⚠️ INTEGRIDAD COMPROMETIDA: Hash del certificado ${numeroCertificado} no coincide. Almacenado: ${exp.certificadoPdf.hashSha256.substring(0, 16)}... Recalculado: ${hashRecalculado.substring(0, 16)}...`,
        );
      }
    }

    const valido = !cert.revocado && !vencido && hashIntegro;
    const diasRestantes = Math.max(
      0,
      Math.ceil(
        (new Date(cert.fechaVencimiento).getTime() - ahora.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    const proximoAVencer = !vencido && diasRestantes <= 30;

    console.log(
      `[CERT] Validación de ${numeroCertificado}: ${valido ? 'VÁLIDO' : 'INVÁLIDO'} (revocado=${cert.revocado}, vencido=${vencido}, diasRestantes=${diasRestantes}, hashIntegro=${hashIntegro})`,
    );

    let estado: string;
    if (cert.revocado) estado = 'Revocado';
    else if (!hashIntegro) estado = 'Integridad comprometida';
    else if (vencido) estado = 'Vencido';
    else if (proximoAVencer) estado = 'Próximo a vencer';
    else estado = 'Vigente';

    return {
      valido,
      numeroCertificado: cert.numeroCertificado,
      expediente: exp?.numeroExpediente ?? '',
      deudor: exp?.deudor.nombreCompleto ?? '',
      numeroIdentificacion: exp?.deudor.numeroIdentificacion ?? '',
      fechaEmision: cert.fechaEmision,
      fechaVencimiento: cert.fechaVencimiento,
      diasRestantes,
      estado,
      revocado: cert.revocado,
      hashIntegro,
    };
  }
}
