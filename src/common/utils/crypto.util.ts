import * as CryptoJS from 'crypto-js';

/**
 * Módulo de Criptografía Simple - PlusPagos Mock
 * Summer Campus 2026 - i2T Software Factory
 * 
 * Encriptación AES-256-CBC fácil de entender y usar.
 * Compatible entre el mock y cualquier cliente que use este mismo módulo.
 */

/**
 * Encripta un texto usando AES-256-CBC
 * 
 * @param {string} plainText - Texto a encriptar
 * @param {string} secretKey - Clave secreta (cualquier longitud)
 * @returns {string} - Texto encriptado en Base64
 * 
 * Formato de salida: Base64(IV_16_bytes + Ciphertext)
 */
export function encryptString(plainText: string, secretKey: string): string {
  // Derivar una clave de 256 bits usando SHA-256
  const key = CryptoJS.SHA256(secretKey);
  
  // Generar IV aleatorio de 16 bytes (requerido por AES-CBC)
  const iv = CryptoJS.lib.WordArray.random(16);
  
  // Encriptar
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  // Combinar IV + ciphertext y convertir a Base64
  const combined = iv.concat(encrypted.ciphertext);
  return CryptoJS.enc.Base64.stringify(combined);
}

/**
 * Desencripta un texto encriptado con encryptString
 * 
 * @param {string} encryptedText - Texto encriptado en Base64
 * @param {string} secretKey - Clave secreta (la misma usada para encriptar)
 * @returns {string|null} - Texto desencriptado o null si falla
 */
export function decryptString(encryptedText: string, secretKey: string): string | null {
  try {
    // Derivar la misma clave de 256 bits
    const key = CryptoJS.SHA256(secretKey);
    
    // Decodificar Base64
    const combined = CryptoJS.enc.Base64.parse(encryptedText);
    
    // Extraer IV (primeros 16 bytes = 4 words de 32 bits)
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
    
    // Extraer ciphertext (resto de los bytes)
    const ciphertext = CryptoJS.lib.WordArray.create(
      combined.words.slice(4),
      combined.sigBytes - 16
    );
    
    // Desencriptar
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as any,
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Error al desencriptar:', error.message);
    return null;
  }
}

/**
 * Genera un hash SHA-256 para validación de integridad
 * 
 * @param {string} data - Datos a hashear
 * @returns {string} - Hash en hexadecimal
 */
export function generateHash(data: string): string {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
}

/**
 * Genera un ID único para transacciones
 * @returns {string}
 */
export function generateTransactionId(): string {
  return 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Genera un ID numérico de plataforma
 * @returns {number}
 */
export function generatePlatformId(): number {
  return Math.floor(Math.random() * 900000) + 100000;
}
