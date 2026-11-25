import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC } from '../../shared/presentation/public.decorator.js';
import { AuthService } from '../application/auth.service.js';
import { AuthRequest } from './current-user.decorator.js';
import { assertSafeWrite } from './request-policy.js';
import { readSessionToken } from './session-cookie.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();

    assertSafeWrite(request);

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);

    if (isPublic) return true;

    const token = readSessionToken(request.headers.cookie);

    if (!token) throw new UnauthorizedException();
    const user = await this.auth.authenticate(token);

    if (!user) throw new UnauthorizedException();
    request.user = user;

    return true;
  }
}
