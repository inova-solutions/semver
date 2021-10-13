import { readFile as _readFile, existsSync } from 'fs';
import { CONFIG_FILE } from './constants';
import { getCurrentBranch } from './git-helpers';

export interface Config {
  /**
   * Name of the branch that produces the beta builds.
   * Default is set to `main`.
   */
  betaBranchName?: string;
  /**
   * Name of the branch that produces the rc and stable builds.
   * It can be defined as a glob in which case the definition will be expanded to one per matching branch existing in the repository.
   * Default is set to `releases/*`.
   */
  releaseBranchName?: string;
  /**
   * By default semver uses Angular Commit Message Conventions.
   * The commit message format can be changed with this `commitMessageFormat` property.
   * Check [conventional-changelog-preset-loader](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-preset-loader) for further information.
   */
  commitMessageFormat?: string;
  /**
   * Indicates whether the current branch produces rc builds.
   * This is only relevant for release branches. Set this to `false` for producing stable builds from your release branch.
   * Default is set to `true`.
   */
  releaseCandidate: boolean;
  /**
   * Commit types to ignore.
   * Default: `ci`, `repo`, `docs`, `test`, `chore`
   */
  commitTypesToIgnore?: string[];
}

/**
 * Gets the configuration for the semver-cli.
 * @returns The configuration of semver.
 */
export async function getConfig(): Promise<Config> {
  const defaultConfig: Config = {
    betaBranchName: 'main',
    releaseBranchName: 'releases/*',
    commitMessageFormat: 'angular',
    releaseCandidate: true,
    commitTypesToIgnore: [`ci`, `repo`, `docs`, `test`, `chore`],
  };

  let config: Config = defaultConfig;
  if (existsSync(CONFIG_FILE)) {
    config = Object.assign(defaultConfig, JSON.parse(await readFile(CONFIG_FILE)));
  }

  return config;
}

/**
 * Check if current branch is a release branch.
 * @returns True if current branch is a release branch.
 */
export async function isReleaseBranch() {
  const config = await getConfig();
  const branchName = await getCurrentBranch();
  return config.releaseBranchName === branchName || branchName.match(`${config.releaseBranchName}`) !== null;
}

/**
 * Check if current branch is a prerelease branch.
 * @returns True if current branch is a prerelease branch.
 */
export async function isBetaBranch() {
  const config = await getConfig();
  const branchName = await getCurrentBranch();
  return config.betaBranchName === branchName;
}

async function readFile(path: string) {
  return new Promise<string>((resolve, reject) => {
    _readFile(path, (error, data) => {
      if (error) reject(error);
      resolve(data.toString());
    });
  });
}
