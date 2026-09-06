const readinessUrl = process.env.BACKEND_HEALTHCHECK_URL;
const publicOrigin = (process.env.SLICKHOOD_PRODUCTION_URL || 'https://app.slickhood.com').replace(/\/$/, '');
const expectedScope = new Set(['wealth', 'insurance', 'affiliate', 'services', 'soko', 'helpdesk']);
const failures = [];

function fail(name, reason) {
  failures.push(name);
  console.error(`FAIL  ${name}: ${reason}`);
}

function pass(name) {
  console.log(`PASS  ${name}`);
}

async function boundedFetch(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(12_000), redirect: 'manual' });
}

if (!readinessUrl?.startsWith('https://')) {
  fail('backend readiness URL', 'BACKEND_HEALTHCHECK_URL must be an HTTPS production-readiness endpoint');
} else {
  try {
    const response = await boundedFetch(readinessUrl);
    const body = await response.json();
    const component = body?.components?.productionReadiness;
    const details = component?.details;
    const scope = new Set(String(details?.scope || '').split(',').map((item) => item.trim()).filter(Boolean));
    const complete = [...expectedScope].every((item) => scope.has(item));
    if (response.status === 200 && body?.status === 'UP' && component?.status === 'UP'
        && Array.isArray(details?.missingOrUnsafeConfiguration)
        && details.missingOrUnsafeConfiguration.length === 0 && complete) {
      pass('backend production readiness');
    } else {
      fail('backend production readiness', 'endpoint is not UP, complete or safely configured');
    }
  } catch {
    fail('backend production readiness', 'endpoint is unreachable or returned invalid JSON');
  }
}

try {
  const response = await boundedFetch(`${publicOrigin}/login`);
  if (response.status === 200) pass('public login reachability');
  else fail('public login reachability', `unexpected HTTP ${response.status}`);
} catch {
  fail('public login reachability', 'request failed');
}

try {
  const response = await boundedFetch(`${publicOrigin}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: publicOrigin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  const allowOrigin = response.headers.get('access-control-allow-origin');
  const sameOriginOk = [200, 204].includes(response.status)
    && [null, publicOrigin].includes(allowOrigin);
  const hostile = await boundedFetch(`${publicOrigin}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://untrusted.invalid',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  const hostileDenied = [400, 401, 403].includes(hostile.status)
    && hostile.headers.get('access-control-allow-origin') === null;
  if (sameOriginOk && hostileDenied) {
    pass('production HTTPS same-origin and CORS rejection contract');
  } else {
    fail('production HTTPS same-origin and CORS rejection contract', 'production origin failed or an untrusted origin was allowed');
  }
} catch {
  fail('production HTTPS same-origin and CORS rejection contract', 'preflight request failed');
}

if (failures.length) {
  console.error(`BLOCKED: ${failures.length} production preflight check(s) failed.`);
  process.exit(1);
}
console.log('READY: frontend production preflight passed.');
