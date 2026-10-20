import { NextResponse } from "next/server";
import { verifyJWT } from "./lib/auth";
import corsHeaders, { isAllowedOrigin } from "./lib/cors";
import { X_HEADER_USER_EMAIL, X_HEADER_USER_ID, X_HEADER_USER_NAME } from "./lib/constant";

export function proxy(request) {
  const headers = corsHeaders(request);
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ message: "Origin is not allowed." }, { status: 403, headers });
  }
  if (request.method === "OPTIONS") return new NextResponse(null, { status: 204, headers });

  const path = request.nextUrl.pathname;
  if (path === "/api/auth/login" || path === "/api/auth/logout") return NextResponse.next();
  const user = verifyJWT(request);
  if (!user) return NextResponse.json({ message: "Please sign in." }, { status: 401, headers });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(X_HEADER_USER_ID, user.id);
  requestHeaders.set(X_HEADER_USER_EMAIL, user.email || "");
  requestHeaders.set(X_HEADER_USER_NAME, user.username || "");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/api/:path*"] };
