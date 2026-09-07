import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Make rolling/self-hosted deployments version-aware. Without a stable
  // deployment identifier, an open tab can submit Server Action IDs from the
  // previous build and Next.js renders a generic navigation failure page.
  // The release workflow supplies the immutable source SHA, while each
  // rollout supplies a unique DEPLOYMENT_VERSION. Keeping these separate
  // prevents an open tab from reusing Server Action IDs after a hotfix built
  // from the same source commit.
  deploymentId: process.env.DEPLOYMENT_VERSION || process.env.NEXT_PUBLIC_COMMIT_HASH,
  // Standalone tracing uses symlinks that require Windows Developer Mode.
  // Production CI runs on Linux and retains the deployable standalone bundle;
  // local Windows builds use standard output without changing system policy.
  output: process.platform === 'win32' && process.env.SLICKHOOD_FORCE_STANDALONE !== 'true'
    ? undefined
    : 'standalone',
  // Keep the standalone server at .next/standalone/server.js even when the
  // deployment host has an unrelated lockfile above this repository.
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    let apiOrigin = '';
    try {
      apiOrigin = process.env.NEXT_PUBLIC_API_URL
        ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
        : '';
    } catch {
      apiOrigin = '';
    }
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com https://maps.googleapis.com https://maps.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      `connect-src 'self' ${apiOrigin} https://api.ipify.org https://accounts.google.com https://*.googleapis.com https://*.gstatic.com`,
      // Only authenticated, locally created PDF blobs and Google sign-in may be framed.
      "frame-src blob: https://accounts.google.com",
      "worker-src 'self' blob:",
      ...(process.env.NEXT_PUBLIC_API_URL?.startsWith('https://')
        ? ["upgrade-insecure-requests"]
        : []),
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self)' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
    ? { exclude: ['error'] }
    : false,
  }
};

export default nextConfig;
