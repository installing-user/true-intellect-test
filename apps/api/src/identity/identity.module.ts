import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ACCOUNT_LOGIN_LIMIT, AuthService, IP_LOGIN_LIMIT } from './application/auth.service.js';
import {
  ACCOUNT_LOGIN_BURST,
  ACCOUNT_LOGIN_REFILL_MS,
  LOGIN_BURST,
  LOGIN_REFILL_MS,
  TokenBucket,
} from './domain/token-bucket.js';
import { SessionRepository } from './infrastructure/session.repository.js';
import { UserRepository } from './infrastructure/user.repository.js';
import { AuthController } from './presentation/auth.controller.js';
import { AuthGuard } from './presentation/auth.guard.js';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    UserRepository,
    SessionRepository,
    { provide: IP_LOGIN_LIMIT, useValue: new TokenBucket(LOGIN_BURST, LOGIN_REFILL_MS) },
    { provide: ACCOUNT_LOGIN_LIMIT, useValue: new TokenBucket(ACCOUNT_LOGIN_BURST, ACCOUNT_LOGIN_REFILL_MS) },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class IdentityModule {}
