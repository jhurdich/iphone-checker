import { json, sameOrigin } from "../../_shared/http.js";
import { getSession } from "../../_shared/session.js";

export async function onRequestDelete({ request, env, params }) {
  if (!sameOrigin(request)) return json({ error: "Request origin is not allowed." }, 403);
  const session = await getSession(request, env);
  if (!session) return json({ error: "Sign in to manage saved searches." }, 401);
  const result = await env.DB.prepare("DELETE FROM saved_searches WHERE id = ? AND google_sub = ?")
    .bind(params.id, session.sub).run();
  return json({ deleted: result.meta?.changes === 1 });
}
