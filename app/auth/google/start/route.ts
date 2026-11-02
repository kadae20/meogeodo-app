import { NextResponse } from "next/server";
import {
  attachGoogleOAuthCookies,
  googleEnv,
  googleRedirectUri,
  randomToken,
} from "@/lib/auth/google";
import { safeNext } from "@/lib/auth/safe-next";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const env = googleEnv();
  if (!env) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const state = randomToken();
  const nonce = randomToken();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.clientId);
  url.searchParams.set("redirect_uri", googleRedirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);

  const response = NextResponse.redirect(url.toString());
  attachGoogleOAuthCookies(response, origin, {
    state,
    nonce,
    next: safeNext(searchParams.get("next")),
  });
  return response;
}
