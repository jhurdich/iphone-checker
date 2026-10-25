import { cookie } from "../../../_shared/http.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!env.GOOGLE_CLIENT_ID || !env.SESSION_SECRET) {
    return Response.redirect(`${url.origin}/?auth_error=google_unconfigured`, 302);
  }
  const state = crypto.randomUUID() + crypto.randomUUID();
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  return new Response(null, {
    status: 302,
    headers: {
      Location: googleUrl.href,
      "Cache-Control": "no-store",
      "Set-Cookie": cookie("__Host-stockscout_oauth_state", state, 600, "/"),
    },
  });
}
