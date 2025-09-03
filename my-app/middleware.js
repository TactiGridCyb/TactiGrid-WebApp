// middleware.js
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const AUTH_API_PREFIX = "/api/auth";
const EXT_RE = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|eot|css|js|map)$/i;

// Narrowly allow SSR (server-side) GETs to this API only
function isMissionFetch(pathname, method) {
  return method === "GET" && /^\/api\/missionFunctions\/[^/]+$/.test(pathname);
}

// Browsers send Fetch-Metadata headers; Node/SSR usually doesn't.
// If there is NO sec-fetch-site, we treat it as a server-side/internal fetch.
function isServerSideFetch(req) {
  return !req.headers.get("sec-fetch-site");
}

async function isAuthed(req) {
  const token = req.cookies.get("authToken")?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req) {
  const { pathname, searchParams } = req.nextUrl;

  // 0) Bypass static & Next internals (fonts included)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/fonts") ||
    EXT_RE.test(pathname) ||
    ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest"].includes(pathname)
  ) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api");
  const isAuthApi = pathname.startsWith(AUTH_API_PREFIX);
  const authed = await isAuthed(req);

  // 1) API protection
  if (isApi) {
    // Always allow auth endpoints
    if (isAuthApi) return NextResponse.next();

    // ✅ Allow ONLY server-side GETs to /api/missionFunctions/:id
    if (isServerSideFetch(req) && isMissionFetch(pathname, req.method)) {
      return NextResponse.next();
    }

    // Everything else requires user auth
    if (!authed) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return NextResponse.next();
  }

  // 2) Page protection — logged-out users can see "/" and "/unconnected" only
  if (!authed) {
    const isHome = pathname === "/";
    const isUnconnected = pathname === "/unconnected";
    if (!isHome && !isUnconnected) {
      const url = req.nextUrl.clone();
      url.pathname = "/unconnected";
      const q = searchParams.toString();
      url.searchParams.set("next", pathname + (q ? `?${q}` : ""));
      // change URL to /unconnected; use rewrite(url) if you prefer keeping original
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|_next/font|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|images|assets|fonts).*)",
  ],
};
