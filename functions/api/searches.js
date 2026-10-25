import { json, sameOrigin } from "../_shared/http.js";
import { getSession } from "../_shared/session.js";

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return json({ error: "Sign in to view saved searches." }, 401);
  if (!env.DB) return json({ error: "Saved searches are not configured yet." }, 503);
  const result = await env.DB.prepare(`SELECT id, model, color, storage, location, created_at
    FROM saved_searches WHERE google_sub = ? ORDER BY created_at DESC LIMIT 100`)
    .bind(session.sub).all();
  return json({ searches: result.results || [] });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Request origin is not allowed." }, 403);
  const session = await getSession(request, env);
  if (!session) return json({ error: "Sign in with Google to save searches." }, 401);
  if (!env.DB) return json({ error: "Saved searches are not configured yet." }, 503);
  let value;
  try { value = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const fields = ["model", "color", "storage", "location"];
  for (const field of fields) {
    if (typeof value[field] !== "string" || !value[field].trim() || value[field].trim().length > 120) {
      return json({ error: `Please choose a valid ${field}.` }, 400);
    }
  }
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO saved_searches (id, google_sub, model, color, storage, location)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, session.sub, ...fields.map((field) => value[field].trim()))
    .run();
  return json({ search: { id, ...Object.fromEntries(fields.map((field) => [field, value[field].trim()])) } }, 201);
}
