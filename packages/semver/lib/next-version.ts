import chalk from 'chalk';
import { Task } from '@nrwl/devkit';
import { Config, isBetaBranch } from './config';
import { conventionalRecommendedBump, ReleaseType } from './conventional-commits';
import { getAllTags, lastSemverTag as _lastSemverTag } from './git-helpers';
import { Channel, increment } from './semver-helpers';
import { exec } from 'child_process';

export interface NextVersionOptions {
  tagPrefix?: string;
  path?: string;
  debug?: boolean;
  workspace?: 'nx';
  bump?: ReleaseType;
}

/**
 * Determine the next version for your repo or your packages in your repo, depending on your workspace type.
 * The workspace type can be defined via the `workspace` option.
 * @param config The semver configuration from `.semver.json`.
 * @param options The options.
 * @returns Array of tags. Depends on the `workspace` option. If the option is not defined the array will contain only one tag for your repo.
 */
export async function nextVersion(config: Config, options: NextVersionOptions): Promise<string[]> {
  const channel: Channel = (await isBetaBranch()) ? 'beta' : config.releaseCandidate ? 'rc' : 'stable';
  const tagPrefix = options.tagPrefix;

  debug(options.debug, `release channel: ${chalk.greenBright.bold(channel)}`);

  let recommendedBump = { releaseType: options.bump, reason: undefined };
  if (!recommendedBump.releaseType) {
    recommendedBump = await conventionalRecommendedBump({
      preset: config.commitMessageFormat,
      path: options.path,
      tagPrefix,
      channel,
    });
  }
  if (recommendedBump === undefined) return null;

  const bump = recommendedBump.releaseType;
  const lastTag = await lastSemverTag({ channel, tagPrefix });
  const lastReleaseTag = await lastSemverReleaseTag({ channel, tagPrefix });

  debug(options.debug, `current version: ${chalk.blueBright.bold(lastTag)}`);
  debug(options.debug, `last release: ${chalk.blueBright.bold(lastReleaseTag)}`);

  if (recommendedBump.reason) console.log(`summary: ${chalk.blueBright.bold(recommendedBump.reason)}`);

  let packageTags: string[] = [];
  if (options.workspace === 'nx') {
    const projects = await nxAffectedProjects(lastTag);
    packageTags = await Promise.all(
      projects.map(async (p) => (await nextVersion(config, { debug: options.debug, tagPrefix: `${p}/`, bump }))[0])
    );
  }

  const incrementedVersion = increment(lastTag, lastReleaseTag, bump, channel);
  packageTags.push(tagPrefix ? `${tagPrefix}${incrementedVersion}` : incrementedVersion);
  return packageTags;
}

async function nxAffectedProjects(base: string): Promise<string[]> {
  const baseCmd = 'npx nx print-affected --target=build';
  const cmd = base ? `${baseCmd} --base=${base} --head=HEAD` : `${baseCmd} --all`;

  return new Promise<string[]>((resolve, reject) => {
    exec(cmd, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      const tasks: Task[] = JSON.parse(stdout)?.tasks;
      if (!tasks) {
        reject('The command "nx print-affected" does not return the expected output');
        return;
      }
      resolve(tasks.map((k) => k.target.project));
    });
  });
}

async function lastSemverTag(options: { channel: Channel; tagPrefix?: string }): Promise<string> {
  if (options.channel === 'beta' || options.channel === 'rc') {
    return await _lastSemverTag(options);
  }
  return await _lastSemverTag({ tagPrefix: options.tagPrefix });
}

async function lastSemverReleaseTag(options: { channel: Channel; tagPrefix?: string }): Promise<string> {
  if (options.channel === 'beta') {
    return (await getAllTags({ tagPrefix: options.tagPrefix })).filter((v) => !v.includes(options.channel))[0];
  }
  return (await getAllTags({ channel: 'stable', tagPrefix: options.tagPrefix }))[0];
}

function debug(enabled: boolean, text: string): void {
  if (enabled) console.log(text);
}
