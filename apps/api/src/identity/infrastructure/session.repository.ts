import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../shared/infrastructure/database.service.js';
import { SessionUser } from '../domain/session-user.js';

@Injectable()
export class SessionRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(tokenHash: string, userId: number, ttlSeconds: number): Promise<void> {
    await this.database.query('DELETE FROM sessions WHERE expires_at < now()');
    await this.database.query(
      `INSERT INTO sessions (token_hash, user_id, expires_at)
       VALUES ($1, $2, now() + make_interval(secs => $3))`,
      [tokenHash, userId, ttlSeconds],
    );
  }

  async delete(tokenHash: string): Promise<void> {
    await this.database.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  }

  async findActiveUser(tokenHash: string): Promise<SessionUser | undefined> {
    const [user] = await this.database.query<SessionUser>(
      `SELECT u.id, u.email, u.role, u.company_id AS "companyId"
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [tokenHash],
    );

    return user;
  }
}
