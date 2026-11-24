import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginAttempts } from '../domain/login-attempts.js';
import { SessionUser } from '../domain/session-user.js';
import { hashPassword, verifyPassword } from '../infrastructure/password.js';
import { createSessionToken, hashSessionToken } from '../infrastructure/session-token.js';
import { SessionRepository } from '../infrastructure/session.repository.js';
import { UserRepository } from '../infrastructure/user.repository.js';

export const SESSION_SECONDS = 7 * 24 * 60 * 60;

// unknown emails still pay for one scrypt so response time does not reveal which emails exist
const dummyHash = hashPassword('dummy-password');

export class TooManyLoginAttemptsException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super('Слишком много попыток входа, попробуйте позже', HttpStatus.TOO_MANY_REQUESTS);
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly attempts: LoginAttempts,
  ) {}

  async login(email: string, password: string, ip: string): Promise<{ user: SessionUser; token: string }> {
    const normalized = email.trim().toLowerCase();
    const key = `${normalized}|${ip}`;
    const retryAfter = this.attempts.retryAfterSeconds(key);
    if (retryAfter > 0) throw new TooManyLoginAttemptsException(retryAfter);

    const row = await this.users.findByEmail(normalized);
    const valid = await verifyPassword(password, row?.passwordHash ?? (await dummyHash));
    if (!row || !valid) {
      this.attempts.fail(key);
      throw new UnauthorizedException('Неверный email или пароль');
    }
    this.attempts.reset(key);

    const token = createSessionToken();
    await this.sessions.create(hashSessionToken(token), row.id, SESSION_SECONDS);
    return { user: { id: row.id, email: row.email, role: row.role, companyId: row.companyId }, token };
  }

  async logout(token: string): Promise<void> {
    await this.sessions.delete(hashSessionToken(token));
  }

  authenticate(token: string): Promise<SessionUser | undefined> {
    return this.sessions.findActiveUser(hashSessionToken(token));
  }
}
