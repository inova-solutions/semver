import chalk from 'chalk';
import { Config, isBetaBranch, isReleaseBranch } from '../config';
import { conventionalRecommendedBump } from '../conventional-changelog/conventional-commits';
import { getAllTags, isPr, lastSemverTag } from '../git-helpers';
import { increment } from './semver-helpers';
import { debug, info, warn } from '../logger';
import { nxAffectedProjects } from './nx-helpers';
import { ERRORS } from '../constants';
import { NextVersionOptions, VersionResult, Channel, BaseContext } from '../models';
import { writeFile } from '../utils';

/**
 * Determine the next version for your repo or your packages in your repo, depending on your workspace type.
 * The workspace type can be defined via the `workspace` option.
 * @param config The semver configuration from `.semver.json`.
 * @param options The options.
 * @returns Array of tags. Depends on the `workspace` option. If the option is not defined the array will contain only one tag for your repo.
 */
export async function nextVersion(context: BaseContext, options: NextVersionOptions): Promise<BaseContext> {
  const isOutputJson = options.output === 'json';
  const channel = context.channel;
  const config = context.config;

  // check if is a PR
  if (isPr()) {
    context.warning = `This run was triggered by a pull request and therefore a new version won't be published.`;
    if (options.output === 'json') {
      console.log(context);
    } else {
      warn(context.warning);
    }
    return null;
  }

  const tagPrefix = options.tagPrefix;

  const lastTag = await lastSemverTag({ channel, tagPrefix }); // last git tag
  const lastReleaseTag = await lastSemverReleaseTag({ channel, tagPrefix }); // last release (for beta it can also be a RC release tag)

  const isSwitchingToStable = !config.releaseCandidate && lastTag?.includes('rc');
  if (isSwitchingToStable && !options.bump) {
    options.bump = 'minor';
  }

  let recommendedBump = { releaseType: options.bump, reason: undefined };
  if (!recommendedBump.releaseType) {
    recommendedBump = await conventionalRecommendedBump({
      preset: config.commitMessageFormat,
      path: options.path,
      debug: options.debug,
      commitTypesToIgnore: config.commitTypesToIgnore,
      tagPrefix,
      output: options.output
    }, context);
  }
  if (recommendedBump === undefined && lastTag) return context;
  const bump = recommendedBump?.releaseType ?? 'patch';

  debug(options.debug, `current version is ${chalk.blueBright.bold(lastTag)}`);
  debug(options.debug, `last release was ${chalk.blueBright.bold(lastReleaseTag)}`);

  if (recommendedBump?.reason) info(!isOutputJson, `${chalk.greenBright.bold(recommendedBump.reason)}`);

  let packageTags: VersionResult[] = [];
  if (options.workspace === 'nx') {
    packageTags = await nextVersionNx(context, { bump, tagPrefix, debug: options.debug, path: options.path }, lastTag);
  }

  const incrementedVersion = increment(lastTag, lastReleaseTag, bump, channel, isSwitchingToStable);
  packageTags.push({
    tag: tagPrefix ? `${tagPrefix}${incrementedVersion}` : incrementedVersion,
    version: incrementedVersion,
  });
  context.versions = [...packageTags];

  if (options.outputFile) {
    await writeFile(JSON.stringify(packageTags, undefined, 2), options.outputFile);
  }

  return context;
}

/**
 * Gets the current channel.
 * @param config The semver configuration from `.semver.json`.
 * @returns The channel name.
 */
export async function getChannel(config: Config): Promise<Channel> {
  if (await isBetaBranch()) return 'beta';
  else if (await isReleaseBranch()) return config.releaseCandidate ? 'rc' : 'stable';
  throw new Error(ERRORS.UNKNOWN_BRANCH);
}

async function lastSemverReleaseTag(options: { channel: Channel; tagPrefix?: string }): Promise<string> {
  if (options.channel === 'beta') {
    return (await getAllTags({ tagPrefix: options.tagPrefix })).filter((v) => !v.includes(options.channel))[0];
  }
  return (await getAllTags({ channel: 'stable', tagPrefix: options.tagPrefix }))[0];
}

async function nextVersionNx(
  context: BaseContext,
  options: NextVersionOptions,
  lastTag: string
): Promise<VersionResult[]> {
  const isOutputJson = options.output === 'json';
  const mainTagPrefix = options.tagPrefix ? options.tagPrefix : '';
  const projects = await nxAffectedProjects(lastTag ? `${mainTagPrefix}${lastTag}` : undefined);
  const nextVersionResult: VersionResult[] = [];

  const getNextVersion = async (project: string) => {
    info(!isOutputJson, `run for ${chalk.bold(project)}`);
    const versions = (await nextVersion(context, {
      debug: options.debug,
      tagPrefix: `${project}/${mainTagPrefix}`,
      bump: options.bump,
    }))?.versions;
    if (versions?.length) {
      nextVersionResult.push({ project, tag: versions[0].tag, version: versions[0].version });
    }
    const nextProjectIndex = projects.indexOf(project) + 1;
    if (nextProjectIndex < projects.length) {
      await getNextVersion(projects[nextProjectIndex]);
    }
  };

  await getNextVersion(projects[0]);

  return nextVersionResult.filter((r) => !!r);
}
