// Run against a separately started production preview; never sends credentials.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const base = new URL(process.argv[2] || 'http://127.0.0.1:3199').origin;

async function main() {
  let count = 0;
  for (const file of fs.readdirSync(path.join(root, 'app/api'), { recursive: true })) {
    if (path.basename(file) !== 'route.ts') continue;
    const route = file.replaceAll('\\', '/').replace(/\/route.ts$/, '');
    if (['auth/login','auth/forgot-password','auth/reset-password'].includes(route)) continue;
    const source = fs.readFileSync(path.join(root, 'app/api', file), 'utf8');
    for (const [, method] of source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\(/g)) {
      const response = await fetch(base + '/api/' + route, {
        method,
        headers: { Origin: base, 'Content-Type': 'application/json' },
        ...(!['GET', 'HEAD'].includes(method) ? { body: '{}' } : {}),
      });
      assert([401, 403].includes(response.status), `${method} ${route}: ${response.status}`);
      assert.match(response.headers.get('cache-control'), /no-store/);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      count++;
    }
  }
  const blocked = await fetch(base + '/api/auth/login', {
    method: 'POST', headers: { Origin: 'https://invalid.example', 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(blocked.status, 403);
  const huge = await fetch(base + '/api/auth/login', {
    method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'x'.repeat(20000) }),
  });
  assert.equal(huge.status, 413);
  const badType = await fetch(base + '/api/auth/login', { method: 'POST', headers: { Origin: base }, body: '{}' });
  assert.equal(badType.status, 415);
  for (const route of ['forgot-password', 'reset-password']) {
    const url = base + '/api/auth/' + route;
    assert.equal((await fetch(url, {method:'POST',headers:{Origin:'https://invalid.example','Content-Type':'application/json'},body:'{}'})).status,403);
    assert.equal((await fetch(url, {method:'POST',headers:{Origin:base},body:'{}'})).status,415);
    assert.equal((await fetch(url, {method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({token:'x'.repeat(20000)})})).status,413);
  }
  assert.equal((await fetch(base+'/api/auth/reset-password',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({token:'invalid'})})).status,400);
  for (const route of ['forgot-password','recover-password']) {
    const screen = await fetch(base+'/'+route);
    assert.equal(screen.status,200);
    assert.match(screen.headers.get('cache-control'),/no-store/);
    assert.equal(screen.headers.get('referrer-policy'),'no-referrer');
  }
  const security = await fetch(base+'/account/security',{redirect:'manual'});
  assert([302,303,307].includes(security.status));
  assert.match(security.headers.get('location'),/login/);
  const page = await fetch(base + '/login');
  assert.equal(page.headers.get('x-frame-options'), 'SAMEORIGIN');
  console.log(`PASS ${count} built HTTP API authorization checks, cross-origin denial, auth body limits and page headers`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
