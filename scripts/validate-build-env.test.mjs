import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = fileURLToPath(new URL('./validate-build-env.mjs', import.meta.url));
const production = {
  NEXT_PUBLIC_API_URL: 'https://app.slickhood.com/api',
  NEXT_PUBLIC_SITE_URL: 'https://slickhood.com',
  NEXT_PUBLIC_CLIENT_ID: '123-example.apps.googleusercontent.com',
  NEXT_PUBLIC_GOOGLE_MAPS_KEY: `AIza${'a'.repeat(35)}`,
  NEXT_PUBLIC_COMMIT_HASH: 'a'.repeat(40),
};
function check(values, overrides = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'slickhood-env-test-'));
  try {
    writeFileSync(join(directory, '.env.production'), Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n'));
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('NEXT_PUBLIC_') && !key.startsWith('__NEXT_')));
    return spawnSync(process.execPath, [script], { cwd: directory, env: { ...env, NODE_ENV: 'production', ...overrides }, encoding: 'utf8' });
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
test('production env file is loaded before build validation', () => assert.equal(check(production).status, 0));
test('explicit release SHA overrides stale file value', () => assert.equal(check({ ...production, NEXT_PUBLIC_COMMIT_HASH: 'stale' }, { NEXT_PUBLIC_COMMIT_HASH: 'b'.repeat(40) }).status, 0));
test('missing API URL still blocks deployment', () => assert.notEqual(check({}).status, 0));
test('insecure production API still blocks deployment', () => assert.notEqual(check({ ...production, NEXT_PUBLIC_API_URL: 'http://app.slickhood.com/api' }).status, 0));
test('incorrect production API path still blocks deployment', () => assert.notEqual(check({ ...production, NEXT_PUBLIC_API_URL: 'https://app.slickhood.com' }).status, 0));
