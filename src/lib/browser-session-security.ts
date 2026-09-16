export const BROWSER_SESSION_CSRF_HEADER = "x-slickhood-csrf";
export const BROWSER_SESSION_CSRF_VALUE = "browser-session-v1";

export type BrowserSessionRejection = { status: number; description: string };

export function browserSessionMutationInit(body: unknown = {}): RequestInit {
  return {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      [BROWSER_SESSION_CSRF_HEADER]: BROWSER_SESSION_CSRF_VALUE,
    },
    body: JSON.stringify(body),
  };
}

/** Protects the local cookie bridge from cross-site or downgraded writes. */
export function rejectUnsafeBrowserSessionMutation(request: Request): BrowserSessionRejection | null {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return { status: 415, description: "Browser session requests must use application/json." };
  }
  if (request.headers.get(BROWSER_SESSION_CSRF_HEADER) !== BROWSER_SESSION_CSRF_VALUE) {
    return { status: 403, description: "Browser session request verification failed." };
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return { status: 403, description: "Cross-site browser session requests are not allowed." };
  }

  const requestUrl = new URL(request.url);
  const configuredOrigin = process.env.BROWSER_SESSION_ORIGIN?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0].trim();
  // Prefer Host because it is the browser-visible authority in the normal proxy
  // path. X-Forwarded-Host is only a fallback for proxies that rewrite Host.
  const requestHost = request.headers.get("host")?.trim() || forwardedHost || requestUrl.host;
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0].trim().toLowerCase();
  const requestProtocol = forwardedProtocol || requestUrl.protocol.replace(":", "").toLowerCase();
  let expectedOrigin = `${requestProtocol}://${requestHost}`;
  if (configuredOrigin) {
    try {
      expectedOrigin = new URL(configuredOrigin).origin;
    } catch {
      return { status: 500, description: "Browser session origin is not configured correctly." };
    }
  }

  // A production build is exercised over a loopback HTTP server before it can
  // be packaged. This exception is opt-in, restricted to loopback on both sides,
  // and is never configured on the deployed host.
  const loopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
  let expectedHostname = "";
  try {
    expectedHostname = new URL(expectedOrigin).hostname;
  } catch {
    return { status: 500, description: "Browser session origin is not configured correctly." };
  }
  const allowInsecureLoopback = process.env.BROWSER_SESSION_ALLOW_INSECURE_LOOPBACK === "true"
    && loopbackHosts.has(requestUrl.hostname)
    && loopbackHosts.has(expectedHostname);

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== expectedOrigin) {
        return { status: 403, description: "Cross-origin browser session requests are not allowed." };
      }
    } catch {
      return { status: 403, description: "Browser session request origin is invalid." };
    }
  } else if (process.env.NODE_ENV === "production") {
    return { status: 403, description: "Browser session request origin is required." };
  }

  if (process.env.NODE_ENV === "production" && !allowInsecureLoopback) {
    if (requestProtocol !== "https" || !expectedOrigin.startsWith("https://")) {
      return { status: 403, description: "Browser sessions require HTTPS." };
    }
  }
  return null;
}
