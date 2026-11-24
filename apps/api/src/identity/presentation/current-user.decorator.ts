import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionUser } from '../domain/session-user.js';

export interface AuthRequest {
  method: string;
  headers: Record<string, string | string[] | undefined> & { cookie?: string };
  user?: SessionUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthRequest>().user,
);
