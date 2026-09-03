const value = process.env.NEXT_PUBLIC_API_URL;

if (!value) {
  if (process.env.CI || process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_URL is required for production builds.');
  }
  process.exit(0);
}

let apiUrl;
try {
  apiUrl = new URL(value);
} catch {
  throw new Error('NEXT_PUBLIC_API_URL must be an absolute URL.');
}

if (apiUrl.hostname === 'app.slickhood.com' && apiUrl.pathname.replace(/\/$/, '') !== '/api') {
  throw new Error('Production NEXT_PUBLIC_API_URL must be https://app.slickhood.com/api.');
}

if (apiUrl.hostname === 'app.slickhood.com' && apiUrl.protocol !== 'https:') {
  throw new Error('Production NEXT_PUBLIC_API_URL must use HTTPS.');
}
