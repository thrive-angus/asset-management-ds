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
    if (route === 'auth/login') continue;
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
  const page = await fetch(base + '/login');
  assert.equal(page.headers.get('x-frame-options'), 'SAMEORIGIN');
  console.log(`PASS ${count} built HTTP API authorization checks, cross-origin denial, auth body limits and page headers`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
