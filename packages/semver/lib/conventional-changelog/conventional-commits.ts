// Adapted from https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-recommended-bump
import * as conventionalChangelogPresetLoader from 'conventional-changelog-preset-loader';
import * as conventionalCommitsParser from 'conventional-commits-parser';
import * as gitRawCommits from 'git-raw-commits';
import * as concat from 'concat-stream';
import chalk from 'chalk';
import { Commit } from 'conventional-commits-parser';
import { Callback, Options as BumpOptions } from 'conventional-recommended-bump';
import { presetResolver, PresetResolverResult } from './preset-resolver';
import { lastSemverTag } from '../git-helpers';
import { Channel } from '../next-version/semver-helpers';
import { debug, warn } from '../logger';

const VERSIONS: Callback.Recommendation.ReleaseType[] = ['major', 'minor', 'patch'];
type Options = Omit<BumpOptions, 'ignoreReverted' | 'skipUnstable' | 'config'> & {
  channel: Channel;
  debug?: boolean;
  commitTypesToIgnore?: string[];
};
export type ReleaseType = Callback.Recommendation.ReleaseType;

/**
 * Get a recommended version bump based on conventional commits.
 * @param options Options
 * @returns Bump type, major, minor, patch.
 */
export async function conventionalRecommendedBump(
  options: Options
): Promise<{ releaseType: ReleaseType; reason: string }> {
  const presetPackage = loadPrestLoader(options.preset);
  const config = await presetResolver(presetPackage);

  return await whatBump(options, config);
}

function loadPrestLoader(preset: string) {
  try {
    return conventionalChangelogPresetLoader(preset);
  } catch (error) {
    if (error.message === 'does not exist')
      throw new Error(`Unable to load the "${preset}" preset package. Please make sure it's installed.`);
    else throw error;
  }
}

async function whatBump(options: Options, config: PresetResolverResult) {
  const tag = await lastSemverTag({ channel: options.channel, tagPrefix: options.tagPrefix });
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
  return new Promise<{ releaseType: ReleaseType; reason: string }>((resolve, reject) => {
    try {
      gitRawCommits({
        format: '%B%n-hash-%n%H',
        from: from,
        path: options.path,
      })
        .pipe(conventionalCommitsParser(parserOpts))
        .pipe(
          concat((commits: Commit[]) => {
            const commitTypesToIgnore = options.commitTypesToIgnore ?? [];
            const relevantCommits: Commit[] = commits.filter((c) => !commitTypesToIgnore.includes(c.type));

            if (!relevantCommits || !relevantCommits.length) {
              warnNoCommits(commits?.length > 0, options.path);
              resolve(undefined);
              return;
            }

            const result = _whatBump(relevantCommits);
            let level: Callback.Recommendation.ReleaseType;

            if (result?.level >= 0) {
              level = VERSIONS[result.level];
            }

            resolve({ releaseType: level, reason: result.reason });
          })
        );
    } catch (error) {
      reject(error);
    }
  });
}

function warnNoCommits(hasIrrelevantCommits: boolean, path: string) {
  if (hasIrrelevantCommits) {
    warn(path ? `No relevant commits in "${path}" since last release` : 'No relevant commits since last release');
  } else {
    warn(path ? `No commits in "${path}" since last release` : 'No commits since last release');
  }
}