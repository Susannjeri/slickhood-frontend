// Next.js request boundary for authentication and route authorization.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sidebarLinks, settingsLinks, SidebarLink } from "./config/sidebarConfig";
import { decodeServerToken } from "./lib/actions";
import { clearAccessTokenCookies, readAccessTokenCookie, writeAccessTokenCookies } from "./lib/access-token-cookie";
import { accessTokenMaxAge } from "./lib/session-token";

type RefreshedSession = { accessToken: string; refreshToken: string; maxAge: number };
const serverRefreshes = new Map<string, Promise<RefreshedSession | null>>();

async function refreshSession(req: NextRequest): Promise<RefreshedSession | null> {
  const refreshToken = req.cookies.get("refreshToken")?.value;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!refreshToken || !apiUrl) return null;
  const existing = serverRefreshes.get(refreshToken);
  if (existing) return existing;

  const attempt = refreshSessionWithToken(refreshToken, apiUrl);
  serverRefreshes.set(refreshToken, attempt);
  try {
    return await attempt;
  } finally {
    if (serverRefreshes.get(refreshToken) === attempt) serverRefreshes.delete(refreshToken);
  }
}

async function refreshSessionWithToken(refreshToken: string, apiUrl: string): Promise<RefreshedSession | null> {
  try {
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const provider = await response.json();
    const tokenData = provider?.data?.[0] ?? provider?.data;
    const accessToken = tokenData?.jwt;
    const newRefreshToken = tokenData?.refreshToken;
    const maxAge = typeof accessToken === "string" ? accessTokenMaxAge(accessToken) : null;
    if (!provider?.success || !accessToken || !newRefreshToken || !maxAge) return null;
    return { accessToken, refreshToken: newRefreshToken, maxAge };
  } catch {
    return null;
  }
}

function writeSession(response: NextResponse, session: RefreshedSession) {
  writeAccessTokenCookies(response.cookies, session.accessToken, session.maxAge);
  response.cookies.set("refreshToken", session.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

function clearSession(response: NextResponse) {
  clearAccessTokenCookies(response.cookies);
  response.cookies.set("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function proxy(req: NextRequest) {
  let token = readAccessTokenCookie(req.cookies);
  // if(!token){
  //   return NextResponse.redirect(new URL("/login", req.url));
  // }
  
  const { pathname } = req.nextUrl;
  // Paths that non logged-in users should not access can be added here
  const dashboardRoutes = ["/dashboard", "/callback/fw/payments"];
  const onboardingRoutes = ["/account-activated", "/business-areas", "/continue-setup", "/kyc"];

  // Extract all protected paths from config
  // const allLinks = [...sidebarLinks, ...settingsLinks];

  const allLinks: SidebarLink[] = [];

  [...sidebarLinks, ...settingsLinks].forEach((link)=> {
    //Add main link if it has href
    if (link.href) {
      allLinks.push(link);
    }

    //Add sublinks if they exist
    if (link.subLinks){
      allLinks.push(...link.subLinks)
    }
  })


  const protectedRoutes = allLinks
    .filter((link) => link.protected && link.href)
    .map((link) => link.href as string);
  const isDashboardRoute = dashboardRoutes.some((route) => 
    pathname.startsWith(route)
  );
  const isOnboardingRoute = onboardingRoutes.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const requiresAuthentication = isProtectedRoute || isDashboardRoute || isOnboardingRoute;
  let sessionResponse: NextResponse | null = null;
  let payload = token ? decodeServerToken(token) : null;

  // A valid refresh session should survive an expired short-lived access token.
  // Do not refresh on /login: an explicit visit to sign in must remain usable.
  if (requiresAuthentication && pathname !== "/login"
      && (!payload?.exp || payload.exp * 1000 <= Date.now())) {
    const refreshed = await refreshSession(req);
    if (refreshed) {
      token = refreshed.accessToken;
      payload = decodeServerToken(token);
      sessionResponse = NextResponse.next();
      writeSession(sessionResponse, refreshed);
    }
  }


  if (token) {
      try {
        payload = payload ?? decodeServerToken(token);
        if (!payload || !payload.exp || payload.exp * 1000 <= Date.now()) {
          const response = requiresAuthentication
            ? NextResponse.redirect(new URL("/login?reason=session-ended", req.url))
            : NextResponse.next();
          clearSession(response);
          return response;
        }
        const permissions = payload?.roles?.flatMap(role => role.permissions) || [];

        if (isProtectedRoute) {
          const routeConfig = allLinks
            .filter((link) => link.href && (pathname === link.href || pathname.startsWith(`${link.href}/`)))
            .sort((a, b) => (b.href?.length || 0) - (a.href?.length || 0))[0];
          if (routeConfig?.permissions?.length) {
            const hasPermission = routeConfig.permissions.some((perm) => {
              return permissions.includes(perm)
            }
            );
            
            if (!hasPermission) {
              const response = NextResponse.redirect(new URL("/dashboard", req.url));
              if (sessionResponse) {
                for (const cookie of sessionResponse.cookies.getAll()) response.cookies.set(cookie);
              }
              return response;
            }
          }
        }
    }
    catch {
      const response = requiresAuthentication
        ? NextResponse.redirect(new URL("/login?reason=session-ended", req.url))
        : NextResponse.next();
      clearSession(response);
      return response;
      }
    }
    // Case 2: No token (logged out)
    else {
      if (isProtectedRoute || isDashboardRoute || isOnboardingRoute) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }



  return sessionResponse ?? NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/verify",
    "/auth-select",
    "/role",
    "/reset",
    "/forgot-password",
    "/account-activated",
    "/continue-setup",
    "/kyc",
    "/business-areas/:path*",
    "/callback/fw/payments",
    "/dashboard/:path*"
  ],
};
