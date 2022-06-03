import { gitRepo, gitCommits, gitTagVersion, gitCommitFile, push, gitCheckout, getLastCommit } from './test/git-utils';
import { release } from './release';
import { Config, getConfig } from './config';
import { getChannel, nextVersion } from './next-version/next-version';
import { getBranchRelatedTags, getCurrentBranch } from './git-helpers';
import * as logger from './logger';
import * as gitHelpers from './git-helpers';
import { readFile } from 'fs';
import { join } from 'path';
import { BaseContext, BumpOptions } from './models';

describe('release', () => {
  jest.setTimeout(90000);
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('no commits, no new tags', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: a feat for version 1'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });

    const gitTagsBeforeRelease = await getGitTags(cwd);

    // act
    await testRelease(cwd, config, {});

    // assert
    const gitTagsAfterRelease = await getGitTags(cwd);
    expect(gitTagsAfterRelease).toEqual(gitTagsBeforeRelease);
  });

  it('git tagging works', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(true);
    await gitCommits(['feat: a feat for version 1'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCommits(['feat: a new feature'], { cwd });
    await push({ cwd });

    // act
    await testRelease(cwd, config, {});

    // assert
    const gitTagsAfterRelease = await getGitTags(cwd);
    expect(gitTagsAfterRelease).toContain('1.0.0-beta.2');
  });

  it('package.json version bump works', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(true);
    await gitCommits(['feat: a feat for version 1'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCommitFile('package.json', 'fix: deps', { cwd }, '{"version": "1.0.0-beta.1"}');
    await push({ cwd });

    // act
    await testRelease(cwd, config, {});

    // assert
    const packageJson = await readPackageJson(join(cwd, 'package.json'));
    expect(packageJson.version).toEqual('1.0.0-beta.2');
  });

  it('no release if branch not up to date', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(true);
    await gitCommits(['feat: a feat for version 1'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCommits(['feat: a new feature'], { cwd });

    const warnSpy = jest.spyOn(logger, 'warn');

    // act
    await testRelease(cwd, config, {});

    // assert
    const gitTagsAfterRelease = await getGitTags(cwd);
    expect(gitTagsAfterRelease).not.toContain('1.0.0-beta.2');
    expect(warnSpy).toHaveBeenCalledWith(
      `The local branch is behind the remote one, therefore a new version won't be published.`
    );
  });

  it('push on detached head works', async () => {
    // arrange
    const config = await getConfig();
    jest.spyOn(gitHelpers, 'getCurrentBranch').mockImplementation(() => new Promise((resolve) => resolve('main')));

    const { cwd } = await gitRepo(true);
    await gitCommits(['feat: a feat for version 1'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCommits(['feat: a new feature'], { cwd });
    await gitCommitFile('package.json', 'fix: deps', { cwd }, '{"version": "1.0.0-beta.1"}');
    await gitCommits(['feat: more features', 'feat: and more features'], { cwd });
    await push({ cwd });
    await gitCheckout(await getLastCommit({ cwd }), 'checkout', { cwd });

    // act
    await testRelease(cwd, config, { bump: 'minor' });

    // assert
    const gitTagsAfterRelease = await getGitTags(cwd);
    expect(gitTagsAfterRelease).toContain('1.0.0-beta.2');
  });

  it('skipChoreCommit works', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(true);
    await gitCommits(['feat: a feat for version 1'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCommitFile('package.json', 'fix: deps', { cwd }, '{"version": "1.0.0-beta.1"}');
    await push({ cwd });
    const head = await getLastCommit({ cwd });

    // act
    await testRelease(cwd, config, { skipChoreCommit: true });

    // assert
    const headAfterRelease = await getLastCommit({ cwd });
    const packageJson = await readPackageJson(join(cwd, 'package.json'));
    expect(packageJson.version).toEqual('1.0.0-beta.1');
    expect(head).toEqual(headAfterRelease);
  });
});

async function testRelease(cwd: string, config: Config, options: BumpOptions) {
  const currentCwd = process.cwd();
  try {
    process.chdir(cwd);
    const channel = await getChannel(config);
    const currentBranch = await getCurrentBranch();
    let ctx: BaseContext = {
      config,
      channel,
      currentBranch,
    };

    ctx = await nextVersion(ctx, options);

    await release(ctx, options);
  } finally {
    process.chdir(currentCwd);
  }
}

async function getGitTags(cwd: string) {
  const currentCwd = process.cwd();
  try {
    process.chdir(cwd);
    return await getBranchRelatedTags({ channel: 'beta' });
  } finally {
    process.chdir(currentCwd);
  }
}

async function readPackageJson(path: string) {
  return new Promise<{ version: string }>((resolve, reject) => {
    readFile(path, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(JSON.parse(data.toString()));
    });
  });
}
