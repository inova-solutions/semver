import * as findVersions from 'find-versions';
import * as _gitSemverTags from 'git-semver-tags';
import { exec, execSync } from 'child_process';
import { valid as validSemver, sort as sortSemver, SemVer } from 'semver';
import { isBetaBranch, isReleaseBranch } from './config';
import { ERRORS } from './constants';
import { VstsEnv } from 'env-ci';
import * as envCi from 'env-ci';
import { Channel } from './models';
import { warn } from './logger';

export type SemverTagOptions = Pick<_gitSemverTags.Options, 'tagPrefix'> & { channel?: Channel };

/**
 * Gets name of the current branch.
 * @returns Name of the current branch.
 */
export async function getCurrentBranch(): Promise<string> {
  const cmd = 'git branch --show-current';

  return new Promise<string>((resolve, reject) => {
    exec(cmd, async (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      let branch = stdout.toString().trim();
      if (branch) {
        resolve(branch);
        return;
      }
      // try another way if head is detached
      branch = await getBranchHeadDetached();
      if (branch) resolve(branch);
      else reject('Current branch could not be determined');
    });
  });
}

/**
 * Gets the last semver tag.
 * @param options Options.
 * @returns The last semver tag.
 */
export async function lastSemverTag(options: SemverTagOptions) {
  let tags: string[] = [];
  if (await isReleaseBranch()) {
    tags = await getBranchRelatedTags(options);
  } else if (await isBetaBranch()) {
    tags = await getAllTags(options);
  } else {
    throw new Error(ERRORS.UNKNOWN_BRANCH);
  }
  return tags[0];
}

/**
 * Gets the version of git.
 * @returns Version of git.
 */
export async function getGitVersion(): Promise<string> {
  const cmd = 'git --version';

  return new Promise<string>((resolve, reject) => {
    exec(cmd, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(findVersions(stdout)[0]);
    });
  });
}

/**
 * Get all git semver tags related to current branch, in reverse chronological order.
 * @param options Options
 * @returns Git semver tags.
 */
export async function getBranchRelatedTags(options: SemverTagOptions): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    _gitSemverTags(options, (error, tags) => {
      if (error) {
        reject(error);
        return;
      }
      const filteredByPrefix = tags
        .filter((tag) => !options.tagPrefix || (options.tagPrefix && tag.startsWith(options.tagPrefix)))
        .map((tag) => (options.tagPrefix ? tag.replace(options.tagPrefix, '') : tag));
      resolve(filterByChannel(filteredByPrefix, options.channel));
    });
  });
}

/**
 * Get all git semver tags of the repo, in reverse chronological order.
 * @param options Options.
 * @returns All semver tags.
 */
export async function getAllTags(options: SemverTagOptions): Promise<string[]> {
  const cmd = 'git tag -l --no-color';

  return new Promise<string[]>((resolve, reject) => {
    exec(cmd, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(parseGitTagResult(stdout, options));
    });
  });
}

/**
 * Add a new git tag and push it to the origin.
 * @param gitTag Tag.
 * @param commit Commit to tag (default is HEAD).
 */
export function addGitTag(gitTag: string, commit = 'HEAD'): void {
  execSync(`git tag ${gitTag} ${commit}`);
  execSync(`git push origin ${gitTag}`);
}

/**
 * Gets the branch name from origin.
 */
export function getOrigin() {
  execSync(`git for-each-ref --format='%(upstream:short)' "$(git symbolic-ref -q HEAD)"`).toString().trim();
}

/**
 * Commit git changes.
 * @param message Commit message.
 */
export function commit(message: string): void {
  execSync(`git add .`);
  execSync(`git commit -m "${message}"`);
}

/**
 * Push git changes.
 */
export async function push(): Promise<void> {
  if (await isDetachedHead()) {
    const branch = await getCurrentBranch();
    execSync(`git push origin HEAD:${branch}`);
  } else {
    const repoUrl = execSync(`git config --get remote.origin.url`).toString().trim();
    execSync(`git push --tags ${repoUrl}`);
  }
}

/**
 * Check if current local branch is up to date.
 * @returns `true` if the HEAD of the current local branch is the same as the HEAD of the remote branch, falsy otherwise.
 */
export async function isBranchUpToDate() {
  return (await getGitHead()) === (await getGitRemoteHead()).match(/^(?<ref>\w+)?/)[1];
}

/**
 * Check if is a PR.
 * @returns `true` if current CI run is a PR build.
 */
export function isPr() {
  const res = envCi();
  return res.isCi && res.service && (res as VstsEnv).isPr;
}

/**
 * Check if HEAD is detached.
 * @returns Returns `true` if HEAD is detached.
 */
export async function isDetachedHead(): Promise<boolean> {
  const cmd = 'git rev-parse --abbrev-ref HEAD';
  return new Promise<boolean>((resolve, reject) => {
    exec(cmd, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim() === 'HEAD');
    });
  });
}

function parseGitTagResult(result: string, options: SemverTagOptions): string[] {
  const tags = filterByPrefix(result.split('\n'), options.tagPrefix)
    .map((tag) => validSemver(tag))
    .filter((v) => !!v);
  return sortSemver(filterByChannel(tags, options.channel)).reverse();
}

async function getBranchHeadDetached(): Promise<string> {
  const runCMD = (cmd) =>
    new Promise<string>((resolve, reject) => {
      exec(cmd, (error, stdout) => {
        if (error) reject(error);

        const branch = stdout
          .replace('(', '')
          .replace(')', '')
          .split(', ')
          .map((r) => r.trim())
          .find((branch) => branch.startsWith('origin/') || branch.startsWith('upstream/'));

        resolve(branch ? branch.match(/^(origin|upstream)\/(?<branch>.+)/)[2] : undefined);
      });
    });

  let res: envCi.CiEnv;
  try {
    res = envCi();
  } catch (error) {
    warn(error);
  }

  if(res?.branch) return res.branch;

  let branchName = await runCMD('git show -s --pretty=%d HEAD');
  // try with previous commit if branch not found
  if (!branchName) branchName = await runCMD('git show -s --pretty=%d HEAD~1');

  return branchName;
}

function filterByChannel(tags: string[], channel: Channel): string[] {
  if (channel) {
    return tags
      .map((t) => new SemVer(t))
      .filter((v) => (channel === 'stable' && !v.prerelease?.length) || v.prerelease?.includes(channel))
      .map((v) => v.version);
  }
  return tags;
}

function filterByPrefix(tags: string[], tagPrefix: string): string[] {
  return tags
    .filter((tag) => !tagPrefix || (tagPrefix && tag.startsWith(tagPrefix)))
    .map((tag) => (tagPrefix ? tag.replace(tagPrefix, '') : tag));
}

async function getGitHead() {
  const cmd = 'git rev-parse HEAD';
  return new Promise<string>((resolve, reject) => {
    exec(cmd, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function getGitRemoteHead() {
  const cmd = 'git ls-remote --heads';
  return new Promise<string>((resolve, reject) => {
    exec(cmd, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}
