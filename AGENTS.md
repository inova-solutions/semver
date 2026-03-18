<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Repository-Specific Guidance

## Workspace Shape

- This repository is a small Nx workspace with a single publishable library project: `semver` in `packages/semver`.
- The CLI entrypoint is `packages/semver/cli/semver.ts`.
- Most business logic lives in `packages/semver/lib/**`.
- `packages/semver/package.json` describes the published package `@inova/semver`; the root `package.json` is for workspace tooling and local scripts.

## Package Manager And Commands

- This repo uses `npm`, not `pnpm` or `yarn`.
- Before running CLI scripts locally, install dependencies in both places:
  - `npm ci` in the workspace root
  - `npm ci` in `packages/semver`
- Prefer `npm exec nx run semver:build`, `npm exec nx run semver:test`, and `npm exec nx run semver:lint`.
- Useful root scripts for local behavior checks are:
  - `npm run start`
  - `npm run last-version`
  - `npm run next-version`
  - `npm run bump`
  - `npm run local-build`
- The repo contains both a root `package-lock.json` and `packages/semver/package-lock.json`. If you change dependencies for the published package, review whether both lockfiles need updates.
- If a root script such as `npm run next-version` fails with missing package modules like `commander` or `figlet`, verify the `packages/semver` install first.

## Domain Context

- This project computes and publishes semantic versions from git history, git tags, branch names, and conventional commit messages.
- Default branch semantics come from `packages/semver/lib/config.ts`:
  - `main` produces `beta` versions
  - `releases/*` produces `rc` versions by default, or stable releases when `releaseCandidate` is `false`
- Repository-level configuration is read from `.semver.json` at the workspace root when present.
- Changes in `git-helpers.ts`, `release.ts`, `last-version.ts`, or `next-version/**` are high-risk because they affect tagging, branch detection, CI behavior, and release side effects.
- Nx-specific versioning logic shells out to `npx nx show projects`; preserve command compatibility with the pinned Nx setup in this repo unless the task is explicitly an Nx migration.

## Testing And Verification

- Tests live next to the source as `*.spec.ts`, with important integration-style coverage under `packages/semver/lib/**` and `packages/semver/lib/next-version/**`.
- Many tests create temporary git repositories and temporary Nx workspaces. Git must be available, and these tests exercise real filesystem and CLI behavior rather than pure unit mocks.
- After changing runtime logic, prefer running the relevant Nx target(s) for `semver`. For release/version-calculation changes, also consider the root scripts above as smoke tests when safe.
- CI installs dependencies in both the workspace root and `packages/semver`, then runs affected `test`, `lint`, and `build` jobs. Do not assume a root-only install is the whole story.

## Formatting Expectations

- Apply ESLint and Prettier to every file you change before finishing the task.
- Prefer targeted formatting/linting for changed files, but do not leave modified files unformatted or with avoidable lint violations.
- When TypeScript files are changed, `npm exec nx run semver:lint` is the default lint check for this repository.

## Safety Notes For Agents

- There is currently no dedicated dry-run mode for the release flow.
- Use `npm run next-version`, `npm run last-version`, or the equivalent CLI commands as read-only preview commands.
- `--skipChoreCommit` on `bump` is not a dry-run flag. It skips the chore commit, but release tagging and push side effects still happen.
- Do not run `npm run bump` unless the user explicitly wants release side effects. It can update `package.json`, create git commits, create tags, and push to the remote.
- Avoid committing generated `dist/` output unless the user asks for it.
- Preserve packaging details when editing build-related files:
  - CLI bin mapping in `packages/semver/package.json`
  - markdown assets copied by the Nx build target
- The autogenerated Nx guidance above references skills such as `nx-workspace` and `nx-generate`. If those skills are unavailable in the current session, inspect `project.json`/`nx.json` directly and use the Nx MCP tools instead of guessing.
