// Next.js request boundary for authentication and route authorization.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sidebarLinks, settingsLinks, SidebarLink } from "./config/sidebarConfig";
import { decodeServerToken } from "./lib/actions";
import { readAccessTokenCookie } from "./lib/access-token-cookie";

export async function proxy(req: NextRequest) {
  const token = readAccessTokenCookie(req.cookies);
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


  if (token) {
      try {
        const payload = decodeServerToken(token);
        if (!payload || !payload.exp || payload.exp * 1000 <= Date.now()) {
          const requiresAuthentication = isProtectedRoute || isDashboardRoute || isOnboardingRoute;
          const response = requiresAuthentication
            ? NextResponse.redirect(new URL("/login", req.url))
            : NextResponse.next();
          response.cookies.delete("token");
          return response;
        }
        const permissions = payload?.roles?.flatMap(role => role.permissions) || [];

        if (isProtectedRoute) {
          const routeConfig = allLinks
            .filter((link) => link.href && (pathname === link.href || pathname.startsWith(`${link.href}/`)))
            .sort((a, b) => (b.href?.length || 0) - (a.href?.length || 0))[0];
          if (routeConfig?.permissions) {
            const hasPermission = routeConfig.permissions.some((perm) => {
              return permissions.includes(perm)
            }
            );
            
            if (!hasPermission) {
              return NextResponse.redirect(new URL("/dashboard", req.url));
            }
          }
        }
    }
    catch {
      const requiresAuthentication = isProtectedRoute || isDashboardRoute || isOnboardingRoute;
      const response = requiresAuthentication
        ? NextResponse.redirect(new URL("/login", req.url))
        : NextResponse.next();
      response.cookies.delete("token");
      return response;
      }
    }
    // Case 2: No token (logged out)
    else {
      if (isProtectedRoute || isDashboardRoute || isOnboardingRoute) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }



  return NextResponse.next();
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
