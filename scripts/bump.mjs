// Bump the version and commit it, but create NO tag — `pnpm run publish` tags the release commit
// later. `pnpm version` couples commit + tag, so we bump the file only and commit it ourselves.
// Usage: pnpm bump <patch|minor|major>  (defaults to patch)
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const type = process.argv[2] ?? 'patch';

if (!['patch', 'minor', 'major'].includes(type)) {
  console.error(`Invalid bump type "${type}". Usage: pnpm bump <patch|minor|major>`);
  process.exit(1);
}

execSync(`pnpm version ${type} --no-git-tag-version`, { stdio: 'inherit' });

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
execSync('git add package.json', { stdio: 'inherit' });
execSync(`git commit -m "chore(release): v${version}"`, { stdio: 'inherit' });
