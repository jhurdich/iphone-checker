import { json } from "../../_shared/http.js";
import { getSession } from "../../_shared/session.js";

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session || !env.DB) return json({ user: null });
  const user = await env.DB.prepare("SELECT email, display_name FROM users WHERE google_sub = ?")
    .bind(session.sub).first();
  if (!user) return json({ user: null });
  return json({ user: { email: user.email, name: user.display_name } });
}
