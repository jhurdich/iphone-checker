import { cookieValue } from "./http.js";

const SESSION_COOKIE = "__Host-stockscout_session";
const encoder = new TextEncoder();

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64url(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function sign(value, secret) {
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(value));
  return base64url(new Uint8Array(signature));
}

export async function createSession(sub, secret) {
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const payload = `${sub}.${expires}`;
  return `${payload}.${await sign(payload, secret)}`;
}

export async function getSession(request, env) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token || !env.SESSION_SECRET) return null;
  const [sub, expiresText, signature, extra] = token.split(".");
  const expires = Number(expiresText);
  if (!sub || !signature || extra || !Number.isSafeInteger(expires) || expires <= Date.now() / 1000) return null;
  let valid = false;
  try {
    valid = await crypto.subtle.verify("HMAC", await hmacKey(env.SESSION_SECRET), fromBase64url(signature), encoder.encode(`${sub}.${expires}`));
  } catch { return null; }
  if (!valid) return null;
  return { sub, expires };
}

export { SESSION_COOKIE };
