const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const schema = Object.fromEntries(['settings', 'staff', 'assets', 'history', 'audits', 'auditChecks', 'authUsers', 'authSessions'].map(name => [name,
  { name, ...Object.fromEntries(['id', 'email', 'userId', 'date', 'assetId', 'auditId'].map(field => [field, { name: field }])) },
]));
let user = null, cookie = '', data = {}, dbCalls = 0, budget = true, authCalls = 0, sessionCalls = 0;
let authenticated = null, account = null;
let sessionToken = '', sqlAllowed = true;
const sqlCalls = [];
const db = {
  select() {
    dbCalls++;
    if (!user) throw Error('Anonymous database access');
    return { from(table) {
      let values = data[table.name] || [];
      const query = {
        where(condition) { values = values.filter(row => row[condition.column.name] === condition.value); return query; },
        then(resolve, reject) { return Promise.resolve(values).then(resolve, reject); },
      };
      return query;
    } };
  },
  delete(table) {
    return { async where(condition) {
      data[table.name] = (data[table.name] || []).filter(row => row[condition.column.name] !== condition.value);
    } };
  },
};
const localAuth = {
  SESSION_COOKIE: 'ds_session',
  sessionAccount: async () => account,
  authenticateByPassword: async () => { authCalls++; return authenticated; },
  createSession: async () => { sessionCalls++; return 'test-token'; },
};
const cache = new Map();
function load(file) {
  file = path.resolve(root, file);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', code)(exports, name => {
    if (name === 'next/headers') return {
      headers: async () => new Headers({ cookie }),
      cookies: async () => ({ get: () => sessionToken ? { value: sessionToken } : undefined }),
    };
    if (name === 'cloudflare:workers') return { env: {} };
    if (name === 'drizzle-orm') return { eq: (column, value) => ({ column, value }), desc: () => null };
    if (name.startsWith('.')) {
      const target = path.resolve(path.dirname(file), name);
      if (target === path.join(root, 'db')) return { getDb: () => db, getPgPool: () => ({
        query: async (sql, values) => { sqlCalls.push({ sql, values }); return { rowCount: sqlAllowed ? 1 : 0 }; },
      }) };
      if (target === path.join(root, 'db/schema')) return schema;
      if (target === path.join(root, 'app/chatgpt-auth')) return { getChatGPTUser: async () => user };
      if (target === path.join(root, 'app/local-auth')) return localAuth;
      if (target === path.join(root, 'app/login-throttle')) return {
        reserveLoginAttempt: async () => budget, clearLoginAttempts: async () => {}, LOGIN_RETRY_SECONDS: 900,
      };
      return load(target + '.ts');
    }
    return require(name);
  });
  return exports;
}
function request(url = '/api/test', options = {}) {
  return new Request('https://app.example.com' + url, options);
}
function setup(role, reset = false) {
  user = role ? { userId: 'user', email: 'user@example.com', displayName: 'User', mustResetPassword: reset } : null;
  cookie = '';
  data = { settings: [{ id: 'access', data: JSON.stringify({ 'user@example.com': role }) }], staff: [] };
}
async function main() {
  let endpoints = 0;
  for (const file of fs.readdirSync(path.join(root, 'app/api'), { recursive: true })) {
    if (path.basename(file) !== 'route.ts' || file.replaceAll('\\', '/') === 'auth/login/route.ts') continue;
    const route = load(path.join('app/api', file));
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      if (typeof route[method] !== 'function') continue;
      setup(null); dbCalls = 0;
      const response = await route[method](request('/api/' + file.replaceAll('\\', '/').replace('/route.ts', ''), {
        method, ...(!['GET', 'HEAD'].includes(method) ? { body: '{}' } : {}),
      }));
      assert([401, 403].includes(response.status), `${method} ${file}: ${response.status}`);
      assert.equal(dbCalls, 0, `${method} ${file} read the DB before authorization`);
      endpoints++;
    }
  }
  console.log(`PASS all ${endpoints} protected API methods reject anonymous requests before database access`);

  const permissions = load('app/permissions.ts');
  for (const role of ['Staff', 'Viewer', 'Asset Manager', 'Administrator', 'Suspended', 'Pending']) {
    setup(role);
    for (const level of ['read', 'manage', 'admin']) {
      const allowed = level === 'read' ? !['Suspended', 'Pending'].includes(role)
        : level === 'manage' ? ['Administrator', 'Asset Manager'].includes(role) : role === 'Administrator';
      if (allowed) assert.equal((await permissions.requireAccess(level)).role, role);
      else await assert.rejects(() => permissions.requireAccess(level), error => error.status === 403);
    }
  }
  setup('Administrator', true);
  for (const level of ['read', 'manage', 'admin']) await assert.rejects(() => permissions.requireAccess(level), error => error.status === 403);
  assert.equal((await load('app/api/access/route.ts').GET()).status, 403);
  assert.equal((await load('app/api/role-preview/route.ts').POST(request('/api/role-preview', { method: 'POST', body: '{"role":"Viewer"}' }))).status, 403);
  console.log('PASS role matrix and mandatory password reset restrict business data and preview');

  const response = permissions.apiError(new Error('secret password_hash SQL DATABASE_URL'));
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, 'Unable to complete this action.');
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  assert.equal(permissions.apiError(new permissions.AccessError('Denied', 403)).status, 403);
  console.log('PASS unexpected errors hide internal details and preserve expected authorization errors');

  const { rejectCrossOriginWrite } = load('app/request-security.ts');
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    for (const headers of [{ origin: 'https://evil.example.com' }, { origin: 'null' }, { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' }, {}]) {
      assert.equal(rejectCrossOriginWrite(request('/api/access', { method, headers })), true);
    }
    assert.equal(rejectCrossOriginWrite(request('/api/access', { method, headers: { origin: 'https://app.example.com' } })), false);
    assert.equal(rejectCrossOriginWrite(request('/api/access', { method, headers: { 'sec-fetch-site': 'same-origin' } })), false);
  }
  assert.equal(rejectCrossOriginWrite(request('/api/test', { method: 'POST', headers: { origin: 'https://app.example.com', 'x-forwarded-host': 'evil.example.com' } })), false);
  assert.equal(rejectCrossOriginWrite(request('/api/test', { method: 'POST', headers: { origin: 'https://evil.example.com', 'x-forwarded-host': 'evil.example.com' } })), true);
  assert.equal(rejectCrossOriginWrite(request('/api/test', { method: 'POST', headers: { origin: 'http://app.example.com' } }), 'https://app.example.com'), true);
  const { middleware } = load('middleware.ts');
  const denied = middleware(request('/api/access', { method: 'POST', headers: { origin: 'https://evil.example.com' } }));
  assert.equal(denied.status, 403);
  const allowed = middleware(request('/api/access', { method: 'POST', headers: { origin: 'https://app.example.com' } }));
  assert.equal(allowed.headers.get('x-middleware-next'), '1');
  assert.equal(allowed.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(allowed.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(allowed.headers.get('X-Frame-Options'), 'SAMEORIGIN');
  console.log('PASS middleware blocks cross-origin writes and adds private API caching and security headers');

  const { safeReturnPath } = load('app/safe-return-path.ts');
  for (const target of ['//evil.example.com', '/\\evil.example.com', '/\n/evil.example.com', 'https://evil.example.com', null]) assert.equal(safeReturnPath(target), '/');
  assert.equal(safeReturnPath('/staff?tab=equipment'), '/staff?tab=equipment');
  console.log('PASS login, reset and logout redirect targets remain local');

  const passwords = load('app/password-auth.ts');
  assert.equal(passwords.verifyPassword('password', '00:'), false);
  assert.match(passwords.passwordStrengthError('x'.repeat(1025)), /at most/);
  assert.equal(passwords.verifyPassword('x'.repeat(1025), passwords.hashPassword('Valid-Test-Password-123')), false);
  console.log('PASS password hashing rejects malformed hashes and excessive password lengths');

  const actualAuth = load('app/local-auth.ts');
  for (const expiresAt of ['invalid-date', '2000-01-01T00:00:00.000Z']) {
    setup('Staff'); sessionToken = 'expired';
    data.authSessions = [{ id: sessionToken, userId: 'user', expiresAt }];
    assert.equal(await actualAuth.sessionAccount(), null);
    assert.equal(data.authSessions.length, 0);
  }
  setup('Staff'); sessionToken = 'valid';
  data.authSessions = [{ id: sessionToken, userId: 'user', expiresAt: new Date(Date.now() + 60000).toISOString() }];
  data.authUsers = [{ id: 'user', email: user.email, displayName: user.displayName, mustResetPassword: false }];
  assert.equal((await actualAuth.sessionAccount()).user.id, 'user');
  console.log('PASS expired and malformed-expiry sessions fail closed while valid sessions remain usable');

  const throttle = load('app/login-throttle.ts');
  sqlCalls.length = 0;
  assert.equal(await throttle.reserveLoginAttempt(' USER@EXAMPLE.COM '), true);
  assert.match(sqlCalls[0].sql, /ON CONFLICT/);
  assert.match(sqlCalls[0].sql, /RETURNING id/);
  assert.equal(sqlCalls[0].values[1], 10);
  assert.match(sqlCalls[0].values[0], /^[a-f0-9]{64}$/);
  sqlAllowed = false;
  assert.equal(await throttle.reserveLoginAttempt('user@example.com'), false);
  assert.equal(sqlCalls[0].values[0], sqlCalls[1].values[0]);
  await throttle.clearLoginAttempts('user@example.com');
  assert.match(sqlCalls[2].sql, /^DELETE/);
  assert.equal(sqlCalls[2].values[0], sqlCalls[0].values[0]);
  console.log('PASS throttle uses parameterized atomic SQL and normalized account keys (SQL execution mocked)');

  const login = load('app/api/auth/login/route.ts');
  const send = body => login.POST(request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  budget = false; authCalls = sessionCalls = 0;
  const blocked = await send({ email: 'user@example.com', password: 'Test-Password-123' });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('Retry-After'), '900');
  assert.equal(authCalls, 0); assert.equal(sessionCalls, 0);
  budget = true; authenticated = null;
  assert.equal((await send({ email: 'unknown@example.com', password: 'wrong' })).status, 401);
  authenticated = { id: 'user', mustResetPassword: false };
  const valid = await send({ email: 'user@example.com', password: 'Test-Password-123', returnTo: '/\\evil.example.com' });
  assert.equal(valid.status, 200); assert.equal((await valid.json()).next, '/');
  assert.match(valid.headers.get('set-cookie'), /HttpOnly/);
  assert.equal((await send({ email: 'user@example.com', password: 'x'.repeat(1025) })).status, 400);
  console.log('PASS login throttles before hashing, keeps generic failures, and sets an HTTP-only session cookie');

  const huge = await send({ email: 'user@example.com', password: 'x'.repeat(20000) });
  assert.equal(huge.status, 413);
  const { readAuthRequest } = load('app/auth-request.ts');
  const stream = new ReadableStream({ start(controller) {
    controller.enqueue(new Uint8Array(9000)); controller.enqueue(new Uint8Array(9000)); controller.close();
  } });
  await assert.rejects(() => readAuthRequest(request('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stream, duplex: 'half',
  })), error => error.status === 413);
  await assert.rejects(() => readAuthRequest(request('/api/auth/login', { method: 'POST', body: '{}' })), error => error.status === 415);
  await assert.rejects(() => readAuthRequest(request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'null' })), error => error.status === 400);
  console.log('PASS auth bodies enforce a streaming 16 KB cap and reject non-JSON or malformed input');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
