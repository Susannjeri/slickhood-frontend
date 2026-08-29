import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Standalone tracing uses symlinks that require Windows Developer Mode.
  // Production CI runs on Linux and retains the deployable standalone bundle;
  // local Windows builds use standard output without changing system policy.
  output: process.platform === 'win32' ? undefined : 'standalone',
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
      "frame-src https://accounts.google.com",
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
  eslint: {
    // Warning: This will allow production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
    ? { exclude: ['error'] }
    : false,
  }
};

export default nextConfig;
