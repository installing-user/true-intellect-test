export const SESSION_COOKIE = 'sid';

export function readSessionToken(cookieHeader: string | undefined): string | null {
  const match = cookieHeader?.match(/(?:^|;\s*)sid=([^;]+)/);
  return match ? match[1] : null;
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}
