import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';

@Injectable()
export class DatabaseService {
  public readonly sql: NeonQueryFunction<false, false>;

  constructor(private configService: ConfigService) {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL no está configurada. Verificá tu archivo .env',
      );
    }
    this.sql = neon(databaseUrl);
    console.log('[DB] Conexión a Neon PostgreSQL configurada');
  }

  /** Test de conectividad */
  async healthCheck(): Promise<{ connected: boolean; version: string }> {
    try {
      const result = await this.sql`SELECT version()`;
      return {
        connected: true,
        version: (result[0] as { version: string }).version.split(',')[0],
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DB] ❌ Health check failed:', msg);
      return { connected: false, version: msg };
    }
  }
}
