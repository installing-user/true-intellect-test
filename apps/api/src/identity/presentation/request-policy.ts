import { ForbiddenException, UnsupportedMediaTypeException } from '@nestjs/common';
import { AuthRequest } from './current-user.decorator.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// SameSite=Lax does not cover login CSRF via a plain HTML form; forms cannot send JSON, and browsers mark foreign sites
export function assertSafeWrite(request: AuthRequest): void {
  if (SAFE_METHODS.has(request.method)) return;
  if (request.headers['sec-fetch-site'] === 'cross-site') throw new ForbiddenException('Межсайтовый запрос отклонён');
  const type = request.headers['content-type'];
  const hasBody = type !== undefined || Number(request.headers['content-length'] ?? 0) > 0 || 'transfer-encoding' in request.headers;
  if (hasBody && !/^application\/json\s*(;|$)/i.test(String(type ?? ''))) {
    throw new UnsupportedMediaTypeException('Допустим только application/json');
  }
}
