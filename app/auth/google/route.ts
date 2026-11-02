import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  GOOGLE_OAUTH_COOKIE,
  clearGoogleOAuthCookies,
  googleEnv,
  googleRedirectUri,
} from "@/lib/auth/google";
import { safeNext } from "@/lib/auth/safe-next";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const fail = () => {
    const response = NextResponse.redirect(`${origin}/login?error=oauth`);
    clearGoogleOAuthCookies(response);
    return response;
  };

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const env = googleEnv();
  const store = cookies();
  const expectedState = store.get(GOOGLE_OAUTH_COOKIE.state)?.value;
  const nonce = store.get(GOOGLE_OAUTH_COOKIE.nonce)?.value;
  const next = safeNext(store.get(GOOGLE_OAUTH_COOKIE.next)?.value ?? null);

  if (!code || !state || !env || !expectedState || state !== expectedState) {
    return fail();
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.clientId,
      client_secret: env.clientSecret,
      redirect_uri: googleRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  const tokenBody = (await tokenRes.json()) as { id_token?: string };
  if (!tokenRes.ok || !tokenBody.id_token) {
    return fail();
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: tokenBody.id_token,
    nonce: nonce || undefined,
  });
  if (error) return fail();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail();

  const { count } = await supabase
    .from("family_profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const dest = (count ?? 0) === 0 ? "/app/onboarding" : next;
  const response = NextResponse.redirect(`${origin}${dest}`);
  clearGoogleOAuthCookies(response);
  return response;
}
