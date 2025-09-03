// middleware.js
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const AUTH_API_PREFIX = "/api/auth";
// treat any file-like path as a static asset (fonts, images, css, js, maps)
const EXT_RE = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|eot|css|js|map)$/i;

async function isAuthed(req) {
  const token = req.cookies.get("authToken")?.value; // <- your cookie name
  if (!token) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req) {
  const { pathname, searchParams } = req.nextUrl;

  // 0) BYPASS all static assets & Next internals (fonts included)
  if (
    pathname.startsWith("/_next") ||           // _next/static, _next/image, _next/font
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/fonts") ||           // if you serve /public/fonts/*
    EXT_RE.test(pathname) ||
    ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest"].includes(pathname)
  ) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api");
  const isAuthApi = pathname.startsWith(AUTH_API_PREFIX);
  const authed = await isAuthed(req);

  // 1) API protection (allow only /api/auth/** when logged out)
  if (isApi) {
    if (isAuthApi) return NextResponse.next();
    if (!authed) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return NextResponse.next();
  }

  // 2) PAGE protection
  // Logged-out users can see "/" and "/unconnected" only.
  if (!authed) {
    const isHome = pathname === "/";
    const isUnconnected = pathname === "/unconnected";
    if (!isHome && !isUnconnected) {
      const url = req.nextUrl.clone();
      url.pathname = "/unconnected";
      const q = searchParams.toString();
      url.searchParams.set("next", pathname + (q ? `?${q}` : ""));
      // Use redirect if you want the URL to change to /unconnected
      // Use rewrite if you want to keep the original path but render Unconnected
      return NextResponse.redirect(url);
      // return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    // run on all pages EXCEPT these static buckets
    "/((?!_next/static|_next/image|_next/font|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|images|assets|fonts).*)",
  ],
};
