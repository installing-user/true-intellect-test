import { HttpException, HttpStatus, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenBucket } from '../domain/token-bucket.js';
import { SessionUser } from '../domain/session-user.js';
import { hashPassword, verifyPassword } from '../infrastructure/password.js';
import { createSessionToken, hashSessionToken } from '../infrastructure/session-token.js';
import { SessionRepository } from '../infrastructure/session.repository.js';
import { UserRepository } from '../infrastructure/user.repository.js';

export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const IP_LOGIN_LIMIT = Symbol('IP_LOGIN_LIMIT');
export const ACCOUNT_LOGIN_LIMIT = Symbol('ACCOUNT_LOGIN_LIMIT');

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
    @Inject(IP_LOGIN_LIMIT) private readonly ipLimit: TokenBucket,
    @Inject(ACCOUNT_LOGIN_LIMIT) private readonly accountLimit: TokenBucket,
  ) {}

  async login(email: string, password: string, ip: string): Promise<{ user: SessionUser; token: string }> {
    const normalized = email.trim().toLowerCase();
    const retryAfter = Math.max(this.ipLimit.retryAfterSeconds(ip), this.accountLimit.retryAfterSeconds(normalized));

    if (retryAfter > 0) throw new TooManyLoginAttemptsException(retryAfter);

    const row = await this.users.findByEmail(normalized);
    const valid = await verifyPassword(password, row?.passwordHash ?? (await dummyHash));

    if (!row || !valid) {
      this.ipLimit.take(ip);
      this.accountLimit.take(normalized);
      throw new UnauthorizedException('Неверный email или пароль');
    }

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
