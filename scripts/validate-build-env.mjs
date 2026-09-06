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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl !== 'https://slickhood.com') {
    throw new Error('Production NEXT_PUBLIC_SITE_URL must be https://slickhood.com.');
  }

  const googleClientId = process.env.NEXT_PUBLIC_CLIENT_ID?.trim();
  if (!googleClientId || !/^[0-9]+-[0-9A-Za-z_-]+\.apps\.googleusercontent\.com$/.test(googleClientId)) {
    throw new Error('NEXT_PUBLIC_CLIENT_ID must contain a valid Google OAuth web client ID.');
  }

  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY?.trim();
  if (!mapsKey) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_KEY is required for SlickHood production builds.');
  }
  if (!/^AIza[0-9A-Za-z_-]{30,}$/.test(mapsKey)) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_KEY does not have the expected Google API key format.');
  }

  const commitHash = process.env.NEXT_PUBLIC_COMMIT_HASH?.trim();
  if (!commitHash || !/^[0-9a-f]{7,40}$/i.test(commitHash)) {
    throw new Error('NEXT_PUBLIC_COMMIT_HASH must identify the immutable production release commit.');
  }
}
