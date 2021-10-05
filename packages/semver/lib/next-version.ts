import chalk from 'chalk';
import { Config, isBetaBranch } from './config';
import { conventionalRecommendedBump } from './conventional-commits';
import { getAllTags, lastSemverTag as _lastSemverTag } from './git-helpers';
import { Channel, increment } from './semver-helpers';

export async function nextVersion(config: Config, options: { tagPrefix?: string; debug?: boolean }): Promise<string> {
  const channel: Channel = (await isBetaBranch()) ? 'beta' : config.releaseCandidate ? 'rc' : 'stable';

  debug(options.debug, `release channel: ${chalk.greenBright.bold(channel)}`);

  const recommendedBump = await conventionalRecommendedBump({
    tagPrefix: options.tagPrefix,
    preset: config.commitMessageFormat,
  });

  if (recommendedBump === undefined) return null;

  const lastTag = await lastSemverTag({ channel });
  const lastReleaseTag = await lastSemverReleaseTag({ channel });

  debug(options.debug, `current version: ${chalk.blueBright.bold(lastTag)}`);
  debug(options.debug, `last release: ${chalk.blueBright.bold(lastReleaseTag)}`);

  return increment(lastTag, lastReleaseTag, recommendedBump, channel);
}

async function lastSemverTag(options: { channel: Channel }): Promise<string> {
  if (options.channel === 'beta' || options.channel === 'rc') {
    return await _lastSemverTag(options);
  }
  return await _lastSemverTag({});
}

async function lastSemverReleaseTag(options: { channel: Channel }): Promise<string> {
  if (options.channel === 'beta') {
    return (await getAllTags({})).filter((v) => !v.includes(options.channel))[0];
  }
  return (await getAllTags({ skipUnstable: true }))[0];
}

function debug(enabled: boolean, text: string): void {
  if (enabled) console.log(text);
}
