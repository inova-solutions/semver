import * as findVersions from 'find-versions';
import * as _gitSemverTags from 'git-semver-tags';
import { exec, execSync } from 'child_process';
import { valid as validSemver, sort as sortSemver, SemVer } from 'semver';
import { CONFIG_FILE, isBetaBranch, isReleaseBranch } from './config';
import { Channel } from './next-version/semver-helpers';

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
    throw new Error(`branch not recognized, use ${CONFIG_FILE} for configuration`);
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
  execSync(`git tag ${gitTag} ${commit}`, { stdio: 'inherit' });
  execSync(`git push origin ${gitTag}`, { stdio: 'inherit' });
}

/**
 * Commit git changes.
 * @param message Commit message.
 */
export function commit(message: string): void {
  execSync(`git add .`, { stdio: 'inherit' });
  execSync(`git commit -m "${message}""`, { stdio: 'inherit' });
}

function parseGitTagResult(result: string, options: SemverTagOptions): string[] {
  const tags = filterByPrefix(result.split('\n'), options.tagPrefix)
    .map((tag) => validSemver(tag))
    .filter((v) => !!v);
  return sortSemver(filterByChannel(tags, options.channel)).reverse();
}

async function getBranchHeadDetached(): Promise<string> {
  const cmd = 'git show -s --pretty=%d HEAD';

  return new Promise<string>((resolve, reject) => {
    exec(cmd, (error, stdout) => {
      if (error) reject(error);

      const branch = stdout
        .replace('(', '')
        .replace(')', '')
        .split(', ')
        .find((branch) => branch.startsWith('origin/') || branch.startsWith('upstream/'));

      resolve(branch ? branch.match(/^(origin|upstream)\/(?<branch>.+)/)[2] : undefined);
    });
  });
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
