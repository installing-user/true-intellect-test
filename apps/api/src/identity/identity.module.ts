import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './application/auth.service.js';
import { LoginAttempts } from './domain/login-attempts.js';
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
    { provide: LoginAttempts, useValue: new LoginAttempts() },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class IdentityModule {}
