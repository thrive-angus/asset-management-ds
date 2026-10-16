// Exercise the real access handler and password hashing without a production database.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const schema = Object.fromEntries(['settings', 'staff', 'history', 'authUsers', 'authSessions'].map(name => [
  name, { name, id: { name: 'id' }, email: { name: 'email' }, userId: { name: 'userId' } },
]));
let rows, failTransaction;
const actor = { userId: 'admin', email: 'admin@example.com', displayName: 'Admin' };
const db = {
  select() {
    return { from(table) {
      let data = rows[table.name];
      const query = {
        where(condition) { data = data.filter(row => row[condition.column.name] === condition.value); return query; },
        then(resolve, reject) { return Promise.resolve(data).then(resolve, reject); },
      };
      return query;
    } };
  },
  insert(table) {
    return { values(value) {
      let conflict;
      const query = {
        onConflictDoUpdate(options) { conflict = options; return query; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            const existing = rows[table.name].find(row => row.id === value.id);
            if (existing && conflict) Object.assign(existing, conflict.set);
            else if (existing) throw Error('Duplicate ID');
            else rows[table.name].push({ ...value });
          }).then(resolve, reject);
        },
      };
      return query;
    } };
  },
  update(table) {
    return { set(value) { return { async where(condition) {
      for (const row of rows[table.name]) if (row[condition.column.name] === condition.value) Object.assign(row, value);
    } }; } };
  },
  delete(table) {
    return { async where(condition) {
      rows[table.name] = rows[table.name].filter(row => row[condition.column.name] !== condition.value);
    } };
  },
  async transaction(callback) {
    const before = structuredClone(rows);
    try {
      const result = await callback(db);
      if (failTransaction) throw Error('Database commit failed');
      return result;
    } catch (error) { rows = before; throw error; }
  },
};
function load(relative, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('exports', 'require', code)(exports, name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    return require(name);
  });
  return exports;
}
const passwords = load('app/password-auth.ts');
const { userAccountExpectedRole } = load('app/user-access-model.ts');
const { availableStaffLogins, staffDetailsFromLogin } = load('app/staff-login-model.ts');
const permissions = load('app/permissions.ts', {
  './access-policy-model': {}, './chatgpt-auth': {}, '../db': {},
  'next/headers': {}, '../db/schema': schema,
});
const route = load('app/api/access/route.ts', {
  '../../asset-identifiers': { equipmentTypeOptions: value => value },
  '../../../db': { getDb: () => db }, '../../../db/schema': schema,
  'drizzle-orm': { eq: (column, value) => ({ column, value }) },
  '../../permissions': { ...permissions, requireAccess: async () => actor },
  '../../password-auth': passwords,
});
function setup() { rows = { settings: [], staff: [], history: [], authUsers: [], authSessions: [] }; failTransaction = false; }
const input = { kind: 'user-account', email: 'new@example.com', displayName: 'New User', role: 'Staff', password: 'Test-Password-123!', expectedRole: null };
async function send(change = {}) {
  const response = await route.POST(new Request('https://test/api/access', { method: 'POST', body: JSON.stringify({ ...input, ...change }) }));
  assert.match(response.headers.get('content-type'), /application\/json/);
  return { status: response.status, body: await response.json() };
}
async function main() {
  const unlinkedLogins = availableStaffLogins([
    { email: ' CHRIS.M@EXAMPLE.COM ', displayName: 'Chris Kitane' },
    { email: 'chris.m@example.com', displayName: 'Duplicate' },
    { email: 'existing@example.com', displayName: 'Existing Staff' },
    { email: 'different-login@example.com', displayName: 'Verified Link' },
  ], [{ email: ' EXISTING@example.com ' }], { 'different-login@example.com': 'STAFF-1' });
  assert.deepEqual(unlinkedLogins, [{ email: 'chris.m@example.com', displayName: 'Chris Kitane' }]);
  assert.deepEqual(staffDetailsFromLogin(unlinkedLogins[0]), {
    firstName: 'Chris', lastName: 'Kitane', name: 'Chris Kitane', email: 'chris.m@example.com',
  });
  assert.deepEqual(staffDetailsFromLogin({ email: 'one@example.com', displayName: 'Prince' }), {
    firstName: 'Prince', lastName: '', name: 'Prince', email: 'one@example.com',
  });
  assert.equal(staffDetailsFromLogin({ email: 'blank@example.com' }).firstName, '');
  assert.equal(availableStaffLogins(unlinkedLogins, [{ email: 'chris.m@example.com' }], {}).length, 0);
  console.log('PASS Add Staff reuses unlinked login details, excludes existing links and avoids inventing missing names');

  for (const role of ['Staff', 'Viewer', 'Asset Manager', 'Administrator', 'Suspended']) {
    setup();
    const loadedAccess = { [input.email]: role };
    rows.settings.push({ id: 'access', data: JSON.stringify(loadedAccess) });
    const expectedRole = userAccountExpectedRole(' NEW@EXAMPLE.COM ', loadedAccess, permissions.OWNER_EMAIL);
    assert.equal(expectedRole, role);
    assert.equal((await send({ role, expectedRole })).status, 200);
    assert.equal(rows.authUsers.length, 1);
    assert(passwords.verifyPassword(input.password, rows.authUsers[0].passwordHash));
    assert.equal(JSON.parse(rows.settings.find(row => row.id === 'access').data)[input.email], role);
  }
  assert.equal(userAccountExpectedRole('unknown@example.com', {}, permissions.OWNER_EMAIL), null);
  assert.equal(userAccountExpectedRole(permissions.OWNER_EMAIL, {}, permissions.OWNER_EMAIL), 'Administrator');
  console.log('PASS Create User resolves the entered email against loaded roles and creates logins for existing role assignments');

  setup();
  const loadedAccess = { [input.email]: 'Staff' };
  rows.settings.push({ id: 'access', data: JSON.stringify({ [input.email]: 'Suspended' }) });
  const changed = await send({ expectedRole: userAccountExpectedRole(input.email, loadedAccess, permissions.OWNER_EMAIL) });
  assert.equal(changed.status, 409);
  assert.equal(rows.authUsers.length, 0);
  assert.equal(JSON.parse(rows.settings[0].data)[input.email], 'Suspended');
  assert.equal(rows.history.length, 0);
  console.log('PASS a role changed after loading still blocks creation without overwriting access');

  setup();
  assert.equal((await send()).status, 200);
  assert.equal(rows.authUsers.length, 1);
  assert(passwords.verifyPassword(input.password, rows.authUsers[0].passwordHash));
  assert.equal(rows.authUsers[0].mustResetPassword, true);
  assert.equal(JSON.parse(rows.settings.find(row => row.id === 'access').data)[input.email], 'Staff');
  assert.equal(JSON.parse(rows.history[0].data).action, 'Login created');
  console.log('PASS account creation saves password hash, reset flag, role and audit together');

  assert.equal((await send({ expectedRole: 'Staff', displayName: 'Updated', password: undefined })).status, 200);
  assert.equal(rows.authUsers[0].displayName, 'Updated');
  assert(passwords.verifyPassword(input.password, rows.authUsers[0].passwordHash));
  console.log('PASS editing without a password preserves the existing password');

  const accountId = rows.authUsers[0].id;
  rows.authSessions.push({ id: 'old-session', userId: accountId }, { id: 'other-session', userId: 'other' });
  assert.equal((await send({ expectedRole: 'Staff', password: 'Replacement-Password-123!' })).status, 200);
  assert.deepEqual(rows.authSessions.map(row => row.id), ['other-session']);
  assert(passwords.verifyPassword('Replacement-Password-123!', rows.authUsers[0].passwordHash));
  rows.authSessions.push({ id: 'renamed-session', userId: accountId });
  assert.equal((await send({ currentEmail: input.email, email: 'renamed@example.com', expectedRole: 'Staff', password: undefined })).status, 200);
  assert.deepEqual(rows.authSessions.map(row => row.id), ['other-session']);
  console.log('PASS admin password resets and email changes revoke only the affected user sessions');

  const before = JSON.stringify(rows);
  const stale = await send({ email: 'renamed@example.com' });
  assert.equal(stale.status, 409);
  assert.match(stale.body.error, /Access changed/);
  assert.equal(JSON.stringify(rows), before);
  console.log('PASS asynchronous stale-role conflict returns JSON 409 without changes');

  for (const kind of ['user-account', 'access']) {
    setup();
    const invalid = await send({ kind, personalStaffId: 'missing' });
    assert.equal(invalid.status, 400);
    assert.match(invalid.body.error, /active staff/);
  }
  console.log('PASS both asynchronous actions return JSON 400 for invalid staff links');

  setup();
  const missingPassword = await send({ password: undefined });
  assert.equal(missingPassword.status, 400);
  assert.match(missingPassword.body.error, /password is required/);
  console.log('PASS missing new-account password returns JSON 400 from inside the transaction');

  for (const kind of ['user-account', 'access']) {
    setup(); failTransaction = true;
    const snapshot = JSON.stringify(rows);
    const failure = await send({ kind });
    assert.equal(failure.status, 500);
    assert.equal(failure.body.error, 'Unable to complete this action.');
    assert.equal(JSON.stringify(rows), snapshot);
  }
  console.log('PASS transaction failures return JSON 500 and roll back both actions');

  const { readApiResponse } = load('app/api-response.ts');
  await assert.rejects(() => readApiResponse(new Response('<html>Server error</html>', { status: 500 })), error => /server encountered an error/.test(error.message) && !/Refresh/.test(error.message));
  await assert.rejects(() => readApiResponse(new Response('', { status: 401 })), /sign in again/);
  console.log('PASS client distinguishes server failure from expired session');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
