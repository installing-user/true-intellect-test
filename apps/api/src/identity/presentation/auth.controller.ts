import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Public } from '../../shared/presentation/public.decorator.js';
import { AuthService, SESSION_SECONDS, TooManyLoginAttemptsException } from '../application/auth.service.js';
import { SessionUser } from '../domain/session-user.js';
import { AuthRequest, CurrentUser } from './current-user.decorator.js';
import { readSessionToken, sessionCookie } from './session-cookie.js';

interface HeaderResponse {
  setHeader(name: string, value: string): void;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: { email?: unknown; password?: unknown } | undefined,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: HeaderResponse,
  ): Promise<SessionUser> {
    const { email, password } = body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new BadRequestException('Укажите email и пароль');
    }
    try {
      const { user, token } = await this.auth.login(email, password, ip);
      res.setHeader('Set-Cookie', sessionCookie(token, SESSION_SECONDS));
      return user;
    } catch (error) {
      if (error instanceof TooManyLoginAttemptsException) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds));
      }
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: AuthRequest, @Res({ passthrough: true }) res: HeaderResponse): Promise<void> {
    const token = readSessionToken(req.headers.cookie);
    if (token) await this.auth.logout(token);
    res.setHeader('Set-Cookie', sessionCookie('', 0));
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }
}
