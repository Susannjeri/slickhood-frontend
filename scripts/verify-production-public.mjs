import { chromium } from '@playwright/test';

const baseUrl = process.env.SLICKHOOD_PRODUCTION_URL || 'https://app.slickhood.com';
const browser = await chromium.launch({ headless: true });
const failures = [];

async function verify(viewport, name) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on('pageerror', (error) => failures.push(`${name}: ${error.message}`));

  const loginResponse = await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  if (!loginResponse?.ok()) failures.push(`${name}: login HTTP ${loginResponse?.status()}`);
  await page.getByRole('heading', { name: /sign in/i }).waitFor();
  await page.getByRole('button', { name: /^sign in$/i }).waitFor();
  await page.getByRole('button', { name: /continue with google/i }).waitFor();

  await page.getByLabel(/email address/i).fill('auth-contract-probe@example.com');
  await page.getByLabel(/^password$/i).fill('NotARealPassword1!');
  const [authenticationResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/auth/login')),
    page.getByRole('button', { name: /^sign in$/i }).click(),
  ]);
  const authenticationUrl = new URL(authenticationResponse.url());
  if (authenticationUrl.pathname !== '/api/auth/login') {
    failures.push(`${name}: login submitted to ${authenticationUrl.pathname} instead of /api/auth/login`);
  }
  if (authenticationResponse.status() !== 401) {
    failures.push(`${name}: invalid login returned HTTP ${authenticationResponse.status()} instead of 401`);
  }

  const email = page.getByLabel(/email address/i);
  const box = await email.boundingBox();
  if (!box || box.width < Math.min(280, viewport.width - 40)) {
    failures.push(`${name}: login form rendered too narrowly`);
  }

  const registrationResponse = await page.goto(`${baseUrl}/register`, { waitUntil: 'domcontentloaded' });
  if (!registrationResponse?.ok()) failures.push(`${name}: registration HTTP ${registrationResponse?.status()}`);
  await page.getByText(/choose your business area/i).first().waitFor();

  const resetResponse = await page.goto(`${baseUrl}/forgot-password`, { waitUntil: 'domcontentloaded' });
  if (!resetResponse?.ok()) failures.push(`${name}: forgot-password HTTP ${resetResponse?.status()}`);
  await page.getByText(/forgot password|reset/i).first().waitFor();

  await page.goto(`${baseUrl}/dashboard/wealth`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/login(?:\?|$)/);
  await context.close();
}

try {
  await verify({ width: 1440, height: 900 }, 'desktop');
  await verify({ width: 390, height: 844 }, 'mobile');
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Production public authentication smoke passed on desktop and mobile.');
