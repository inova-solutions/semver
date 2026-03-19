# inova semver projects

Projects for managing semantic versioning in git repos.

## Local Development

Install dependencies in both the workspace root and the published package before running local CLI commands:

```bash
npm ci
cd packages/semver
npm ci
```

This repository keeps separate `package-lock.json` files for the root workspace and `packages/semver`. Commands such as `npm run next-version`, `npm run last-version`, and `npm run bump` depend on the package-local install and can fail with missing modules if only the root install was done.

## Safety Note

Do not run `npm run bump` unless you intentionally want to trigger side effects on the real repository.

The `bump` command performs real release side effects by default. It can update `package.json`, create commits, create git tags, and push changes to the remote repository.

Use `npm run bump -- --dry-run` when you want to execute the full read path without changing files or git state. In dry-run mode, write operations are replaced by informational logs. Use `npm run next-version` or `npm run last-version` when you only want to inspect version information.

## @inova/semver

CLI for managing semantic versioning in git repos.

Check [README](./packages/semver/README.md).
