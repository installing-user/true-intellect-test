import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../shared/infrastructure/database.service.js';
import { SessionUser } from '../domain/session-user.js';

@Injectable()
export class UserRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByEmail(email: string): Promise<(SessionUser & { passwordHash: string }) | undefined> {
    const [row] = await this.database.query<SessionUser & { passwordHash: string }>(
      `SELECT id, email, role, company_id AS "companyId", password_hash AS "passwordHash"
       FROM users WHERE email = $1`,
      [email],
    );
    return row;
  }
}
