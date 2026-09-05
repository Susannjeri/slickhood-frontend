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

if (apiUrl.hostname === 'app.slickhood.com') {
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY?.trim();
  if (!mapsKey) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_KEY is required for SlickHood production builds.');
  }
  if (!/^AIza[0-9A-Za-z_-]{30,}$/.test(mapsKey)) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_KEY does not have the expected Google API key format.');
  }
}
