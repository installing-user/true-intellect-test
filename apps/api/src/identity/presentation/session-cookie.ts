export const SESSION_COOKIE = 'sid';

export function readSessionToken(cookieHeader: string | undefined): string | null {
  const match = cookieHeader?.match(/(?:^|;\s*)sid=([^;]+)/);

  return match ? match[1] : null;
}

// Secure only when the request came over HTTPS, so the plain-HTTP dev setup keeps working
export function sessionCookie(token: string, maxAgeSeconds: number, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;
}
