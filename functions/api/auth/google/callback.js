import { cookie, cookieValue, json } from "../../../_shared/http.js";
import { createSession, SESSION_COOKIE } from "../../../_shared/session.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const returnedState = cookieValue(request, "__Host-stockscout_oauth_state");
  const clearState = cookie("__Host-stockscout_oauth_state", "", 0, "/");
  if (!state || !returnedState || state !== returnedState || !code) {
    return new Response("Google sign-in could not be verified. Please try again.", { status: 400, headers: { "Set-Cookie": clearState, "Cache-Control": "no-store" } });
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.SESSION_SECRET || !env.DB) {
    return new Response("Sign-in is not fully configured yet.", { status: 503, headers: { "Set-Cookie": clearState, "Cache-Control": "no-store" } });
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) return new Response("Google sign-in failed. Please try again.", { status: 502, headers: { "Set-Cookie": clearState, "Cache-Control": "no-store" } });
  const tokens = await tokenResponse.json();
  if (!tokens.access_token) return new Response("Google did not return a sign-in token.", { status: 502, headers: { "Set-Cookie": clearState, "Cache-Control": "no-store" } });

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileResponse.ok) return new Response("Google profile could not be verified.", { status: 502, headers: { "Set-Cookie": clearState, "Cache-Control": "no-store" } });
  const profile = await profileResponse.json();
  if (!profile.sub || !profile.email || profile.email_verified !== true) {
    return new Response("Use a verified Google email address to sign in.", { status: 403, headers: { "Set-Cookie": clearState, "Cache-Control": "no-store" } });
  }

  await env.DB.prepare(`INSERT INTO users (google_sub, email, display_name)
    VALUES (?, ?, ?)
    ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email, display_name = excluded.display_name`)
    .bind(profile.sub, profile.email, profile.name || "")
    .run();

  const session = await createSession(profile.sub, env.SESSION_SECRET);
  const headers = new Headers({ Location: `${url.origin}/?signed_in=1`, "Cache-Control": "no-store" });
  headers.append("Set-Cookie", cookie(SESSION_COOKIE, session, 60 * 60 * 24 * 30));
  headers.append("Set-Cookie", clearState);
  return new Response(null, {
    status: 302,
    headers,
  });
}
