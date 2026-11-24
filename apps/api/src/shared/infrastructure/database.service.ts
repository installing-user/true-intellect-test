import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Pool, type QueryResultRow } from 'pg';

const TIMEOUT_MS = 2_000;

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  // statement_timeout stops the query on the server; query_timeout alone only abandons it on the client
  private readonly pool = new Pool({
    connectionTimeoutMillis: TIMEOUT_MS,
    query_timeout: TIMEOUT_MS,
    statement_timeout: TIMEOUT_MS,
  });

  constructor() {
    this.pool.on('error', (error) => {
      this.logger.warn(error.message);
    });
  }

  async ping(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<T[]> {
    const result = await this.pool.query<T>(text, params);
    return result.rows;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
