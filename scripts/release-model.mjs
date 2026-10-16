// Stable production releases. Prerelease channels can be introduced separately.
export function parseVersion(value) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) throw new Error(`Expected a stable MAJOR.MINOR.PATCH version: ${value}`);
  const parts = value.split('.').map(Number);
  if (!parts.every(Number.isSafeInteger)) throw new Error('Version numbers exceed the safe integer range.');
  return parts;
}

export function bumpVersion(current, level) {
  const parts = parseVersion(current);
  const index = ['major', 'minor', 'patch'].indexOf(level);
  if (index < 0) throw new Error('Choose major, minor or patch.');
  parts[index]++;
  for (let i = index + 1; i < parts.length; i++) parts[i] = 0;
  const next = parts.join('.');
  parseVersion(next);
  return next;
}

export function sourceVersion(version, date) {
  return `Dental Stars Asset Manager\nVersion: ${version}\nRelease date: ${date}\nGit tag: v${version}\n\nVersion source of truth: package.json\nRelease notes: app/releases.json (older numbered releases remain in App Version History).\nRuntime: Vinext, PostgreSQL and app-managed authentication.\nThis source checkout excludes installed dependencies, build output, credentials and database data.\n`;
}

export function validateRelease(pkg, releases, source) {
  parseVersion(pkg.version);
  if (!Array.isArray(releases) || !releases.length || releases[0].version !== pkg.version) throw new Error('Latest release must match package.json version.');
  let previous;
  for (const release of releases) {
    const parts = parseVersion(release.version);
    if (previous) {
      const differing = parts.findIndex((part, i) => part !== previous[i]);
      if (differing < 0 || parts[differing] > previous[differing]) throw new Error('Releases must have unique versions in descending order.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(release.date) || !Number.isFinite(Date.parse(release.date)) || new Date(release.date).toISOString().slice(0, 10) !== release.date) throw new Error('Invalid release date.');
    if (typeof release.changes !== 'string' || !release.changes.trim()) throw new Error('Release notes are required.');
    previous = parts;
  }
  if (source.replace(/\r\n/g, '\n') !== sourceVersion(pkg.version, releases[0].date)) throw new Error('SOURCE_VERSION.txt is out of sync.');
}
