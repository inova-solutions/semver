// Adapted from https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-recommended-bump
import { execFile } from 'child_process';
import conventionalCommitsParser from 'conventional-commits-parser';
import chalk from 'chalk';
import { Commit } from 'conventional-commits-parser';
import { loadPreset, PresetResolverResult, WhatBump } from './preset-resolver';
import { lastSemverTag } from '../git-helpers';
import { debug, warn } from '../logger';
import { BaseContext, OutputFormat, ReleaseType } from '../models';

const VERSIONS: ReleaseType[] = ['major', 'minor', 'patch'];
type Options = {
  preset: string;
  tagPrefix?: string;
  path?: string;
  whatBump?: WhatBump;
  debug?: boolean;
  output: OutputFormat;
  commitTypesToIgnore?: string[];
};

/**
 * Get a recommended version bump based on conventional commits.
 * @param options Options
 * @returns Bump type, major, minor, patch.
 */
export async function conventionalRecommendedBump(
  options: Options,
  ctx: BaseContext,
): Promise<{ releaseType: ReleaseType; reason: string }> {
  const config = await loadPreset(options.preset);

  return await whatBump(options, config, ctx);
}

async function whatBump(options: Options, config: PresetResolverResult, ctx: BaseContext) {
  const tag = await lastSemverTag({ channel: ctx.channel, tagPrefix: options.tagPrefix });
  debug(options.debug, `get commits since ${chalk.blueBright.bold(tag)}`);
  const _whatBump = options.whatBump || config.recommendedBumpOpts?.whatBump;

  if (typeof _whatBump !== 'function') {
    throw Error('whatBump must be a function');
  }

  // TODO: For now we defer to `config.recommendedBumpOpts.parserOpts` if it exists, as our initial refactor
  // efforts created a `parserOpts` object under the `recommendedBumpOpts` object in each preset package.
  // In the future we want to merge differences found in `recommendedBumpOpts.parserOpts` into the top-level
  // `parserOpts` object and remove `recommendedBumpOpts.parserOpts` from each preset package if it exists.
  const parserOpts = config.recommendedBumpOpts?.parserOpts ? config.recommendedBumpOpts.parserOpts : config.parserOpts;

  const from = tag ? (options.tagPrefix ? `${options.tagPrefix}${tag}` : tag) : undefined;
  const commits = await getCommits(from, options.path, parserOpts);
  const commitTypesToIgnore = options.commitTypesToIgnore ?? [];
  const relevantCommits: Commit[] = commits.filter((commit) => !commitTypesToIgnore.includes(commit.type));

  if (!relevantCommits.length) {
    warnNoCommits(commits.length > 0, options.path, ctx, options.output === 'json');
    return undefined;
  }

  const result = await Promise.resolve(_whatBump(relevantCommits));
  const level = result?.level != null ? VERSIONS[result.level] : undefined;
  return { releaseType: level, reason: result?.reason };
}

function warnNoCommits(hasIrrelevantCommits: boolean, path: string, ctx: BaseContext, isOutputJson: boolean) {
  if (hasIrrelevantCommits) {
    ctx.warning = path
      ? `No relevant commits in "${path}" since last release`
      : 'No relevant commits since last release';
  } else {
    ctx.warning = path ? `No commits in "${path}" since last release` : 'No commits since last release';
  }

  if (!isOutputJson) warn(ctx.warning);
}

async function getCommits(from: string | undefined, path: string | undefined, parserOpts: unknown): Promise<Commit[]> {
  const DELIMITER = '------------------------ >8 ------------------------';
  const gitArgs = ['log', `--format=%B%n-hash-%n%H%n${DELIMITER}`];

  if (from) {
    gitArgs.push(`${from}..HEAD`);
  }

  if (path) {
    gitArgs.push('--', path);
  }

  const stdout = await runGitLog(gitArgs);
  return stdout
    .split(`${DELIMITER}\n`)
    .map((commit) => commit.trim())
    .filter(Boolean)
    .map((commit) => parseCommit(commit, parserOpts))
    .filter((commit): commit is Commit => Boolean(commit));
}

function parseCommit(commit: string, parserOpts: unknown): Commit | null {
  const parserWithSync = conventionalCommitsParser as typeof conventionalCommitsParser & {
    sync: (rawCommit: string, options: unknown) => Commit | null;
  };

  return parserWithSync.sync(commit, parserOpts);
}

function runGitLog(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { maxBuffer: Infinity }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      if (stderr) {
        reject(new Error(stderr.toString()));
        return;
      }

      resolve(stdout.toString());
    });
  });
}
