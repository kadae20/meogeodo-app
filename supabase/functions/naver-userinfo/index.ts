// Naver userinfo is nested under `response`. Supabase custom OAuth needs flat OIDC claims.
// Deploy with JWT verification off — Auth calls this with a Naver access token.
Deno.serve(async (req) => {
  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return Response.json({ error: "missing_authorization" }, { status: 401 });
  }

  const naver = await fetch("https://openapi.naver.com/v1/nid/me", {
    headers: { Authorization: authorization },
  });
  const body = await naver.json();
  if (!naver.ok) {
    return Response.json(body, { status: naver.status });
  }

  const profile = body.response ?? {};
  return Response.json({
    sub: String(profile.id ?? ""),
    email: profile.email ?? "",
    name: profile.name ?? profile.nickname ?? "",
    nickname: profile.nickname ?? "",
    picture: profile.profile_image ?? "",
  });
});
