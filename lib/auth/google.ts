import type { NextResponse } from "next/server";

export const GOOGLE_OAUTH_COOKIE = {
  state: "google_oauth_state",
  nonce: "google_oauth_nonce",
  next: "google_oauth_next",
} as const;

const COOKIE_MAX_AGE = 60 * 10;

export function googleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function googleRedirectUri(origin: string) {
  return `${origin}/auth/google`;
}

export function randomToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

function cookieBase(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export function attachGoogleOAuthCookies(
  response: NextResponse,
  origin: string,
  values: { state: string; nonce: string; next: string }
) {
  const base = cookieBase(origin.startsWith("https://"));
  response.cookies.set(GOOGLE_OAUTH_COOKIE.state, values.state, base);
  response.cookies.set(GOOGLE_OAUTH_COOKIE.nonce, values.nonce, base);
  response.cookies.set(GOOGLE_OAUTH_COOKIE.next, values.next, base);
}

export function clearGoogleOAuthCookies(response: NextResponse) {
  for (const name of Object.values(GOOGLE_OAUTH_COOKIE)) {
    response.cookies.delete(name);
  }
}
