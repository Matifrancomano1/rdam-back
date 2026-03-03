export const PLUSPAGOS_CONFIG = {
  // Matches .env variables: MERCHANT_GUID and SECRET_KEY
  MERCHANT_GUID: process.env.MERCHANT_GUID || 'test-merchant-001',
  SECRET_KEY: process.env.SECRET_KEY || 'clave-secreta-campus-2026',
  // PlusPagos Mock URL — must match the port where pluspagos-mock-simple/server.js is running
  BASE_URL: process.env.PLUSPAGOS_URL || 'http://localhost:10000',
};
