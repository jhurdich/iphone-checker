export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return origin === new URL(request.url).origin;
}

export function cookieValue(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  for (const piece of cookies.split(";")) {
    const [key, ...value] = piece.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

export function cookie(name, value, maxAge, path = "/") {
  return `${name}=${value}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
