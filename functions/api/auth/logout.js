import { cookie, json, sameOrigin } from "../../_shared/http.js";
import { SESSION_COOKIE } from "../../_shared/session.js";

export async function onRequestPost({ request }) {
  if (!sameOrigin(request)) return json({ error: "Request origin is not allowed." }, 403);
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": cookie(SESSION_COOKIE, "", 0),
    },
  });
}
