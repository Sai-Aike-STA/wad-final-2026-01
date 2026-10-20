export function isAllowedOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const frontend = process.env.FRONTEND_URL?.replace(/\/$/, "");
  return origin === request.nextUrl.origin || origin === frontend ||
    (process.env.NODE_ENV === "development" && origin === "http://localhost:5173");
}

export default function corsHeaders(request) {
  const headers = {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  const origin = request.headers.get("origin");
  if (origin && isAllowedOrigin(request)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
