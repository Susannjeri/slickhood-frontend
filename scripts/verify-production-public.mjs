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
