import { readFileSync, writeFileSync } from 'node:fs';
import { bumpVersion, sourceVersion, validateRelease } from './release-model.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const pkg = JSON.parse(read('package.json'));
const releases = JSON.parse(read('app/releases.json'));
validateRelease(pkg, releases, read('SOURCE_VERSION.txt'));
const args = process.argv.slice(2).filter(arg => arg !== '--');
if (args[0] === '--check') {
  if (args.length !== 1) throw new Error('Unexpected check arguments.');
  console.log(`Release metadata verified: v${pkg.version}`);
} else {
  const dryRun = args.includes('--dry-run');
  const positional = args.filter(arg => arg !== '--dry-run');
  const [level, ...notes] = positional;
  const version = bumpVersion(pkg.version, level);
  const changes = notes.join(' ').trim();
  if (!changes || notes.some(note => note.startsWith('--'))) throw new Error('Usage: pnpm release <patch|minor|major> "Release notes" [--dry-run]');
  // Use the maintainer's local release day rather than silently switching to UTC.
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  pkg.version = version;
  releases.unshift({ version, date, changes });
  const source = sourceVersion(version, date);
  validateRelease(pkg, releases, source);
  if (!dryRun) {
    for (const [path, content] of [['package.json', JSON.stringify(pkg, null, 2) + '\n'], ['app/releases.json', JSON.stringify(releases, null, 2) + '\n'], ['SOURCE_VERSION.txt', source]]) writeFileSync(new URL(path, root), content);
  }
  console.log(`${dryRun ? 'Preview' : 'Prepared'} v${version}: ${changes}`);
  console.log('Review changes, run checks, commit, then create an annotated v' + version + ' tag on the release commit. Push main to deploy; push the tag to retain the release reference.');
}
