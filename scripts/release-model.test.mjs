import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { bumpVersion, parseVersion, sourceVersion, validateRelease } from './release-model.mjs';

test('release increments reset the appropriate subordinate numbers', () => {
  assert.equal(bumpVersion('1.9.8', 'patch'), '1.9.9');
  assert.equal(bumpVersion('1.9.8', 'minor'), '1.10.0');
  assert.equal(bumpVersion('1.9.8', 'major'), '2.0.0');
});
test('reject malformed or unsupported release inputs', () => {
  for (const value of ['01.0.0', 'v1.0.0', '1.0', '1.0.-1', '1.0.0-rc.1', '9007199254740992.0.0']) assert.throws(() => parseVersion(value));
  assert.throws(() => bumpVersion('1.0.0', 'feature'));
});
test('metadata detects drift, duplicates, ordering and invalid dates', () => {
  const pkg = { version: '1.2.0' };
  const releases = [{ version: '1.2.0', date: '2026-10-16', changes: 'Feature' }, { version: '1.1.0', date: '2026-10-15', changes: 'Earlier' }];
  const source = sourceVersion(pkg.version, releases[0].date);
  assert.doesNotThrow(() => validateRelease(pkg, releases, source));
  assert.doesNotThrow(() => validateRelease(pkg, releases, source.replace(/\n/g, '\r\n')));
  assert.throws(() => validateRelease({ version: '1.2.1' }, releases, source));
  assert.throws(() => validateRelease(pkg, releases, 'old archive metadata'));
  for (const change of [{ version: '1.2.0' }, { version: '2.0.0' }, { date: '2026-02-30' }, { changes: '' }]) assert.throws(() => validateRelease(pkg, [releases[0], { ...releases[1], ...change }], source));
});
test('CLI dry run and invalid requests leave release files unchanged', () => {
  const files = ['package.json', 'app/releases.json', 'SOURCE_VERSION.txt'];
  const read = () => files.map(path => readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
  const before = read();
  const script = fileURLToPath(new URL('./release.mjs', import.meta.url));
  const preview = spawnSync(process.execPath, [script, 'patch', 'Fix example', '--dry-run'], { encoding: 'utf8' });
  assert.equal(preview.status, 0, preview.stderr);
  assert.ok(preview.stdout.includes('Preview v' + bumpVersion(JSON.parse(before[0]).version, 'patch')));
  const invalid = spawnSync(process.execPath, [script, 'minor'], { encoding: 'utf8' });
  assert.notEqual(invalid.status, 0);
  assert.deepEqual(read(), before);
});
