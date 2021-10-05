import * as findVersions from 'find-versions';
import * as _gitSemverTags from 'git-semver-tags';
import { exec } from 'child_process';
import { valid as validSemver, sort as sortSemver, prerelease } from 'semver';
import { CONFIG_FILE, isBetaBranch, isReleaseBranch } from './config';
import { Channel } from './semver-helpers';

export type SemverTagOptions = Pick<_gitSemverTags.Options, 'skipUnstable' | 'tagPrefix'> & { channel?: Channel };

/**
 * Gets name of the current branch.
 * @returns Name of the current branch.
 */
export async function getCurrentBranch(): Promise<string> {
  const cmd = 'git branch --show-current';

  return new Promise<string>((resolve, reject) => {
    exec(cmd, async (error, stdout) => {
      if (error) reject(error);

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
      if (error) reject(error);
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
      if (error) reject(error);
      resolve(tags.filter((v) => !options.channel || v.includes(options.channel)));
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
      if (error) reject(error);
      resolve(parseGitTagResult(stdout, options));
    });
  });
}

function parseGitTagResult(result: string, options: SemverTagOptions): string[] {
  return sortSemver(
    result
      .split('\n')
      .map((tag) => validSemver(tag))
      .filter((v) => !!v)
      .filter((v) => (!isPrerelease(v) && options.skipUnstable) || !options.skipUnstable)
      .filter((v) => !options.channel || v.includes(options.channel))
  ).reverse();
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

function isPrerelease(version: string) {
  return prerelease(version) !== null;
}
