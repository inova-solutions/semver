import { gitRepo, gitCommits, gitTagVersion, gitCommitFile } from './test/git-utils';
import { release } from './release';
import { Config, getConfig } from './config';
import { nextVersion, NextVersionOptions } from './next-version/next-version';
import { getBranchRelatedTags } from './git-helpers';
import { readFile } from 'fs';
import { join } from 'path';

describe('release', () => {
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

    // act
    await testRelease(cwd, config, {});

    // assert
    const packageJson = await readPackageJson(join(cwd, 'package.json'));
    expect(packageJson.version).toEqual('1.0.0-beta.2');
  });

});

async function testRelease(cwd: string, config: Config, options: NextVersionOptions) {
  const currentCwd = process.cwd();
  try {
    process.chdir(cwd);
    await release(options, await nextVersion(config, options));
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
