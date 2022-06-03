import { getConfig } from './config';
import { getCurrentBranch } from './git-helpers';
import { LastVersionOptions } from './models';
import { gitCheckout, gitCommits, gitRepo, gitTagVersion } from './test/git-utils';
import { lastVersion } from './last-version';
import { ERRORS } from './constants';

describe('nextVersion', () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('works for main', async () => {
    // arrange

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    await commitAndTag('feat: next feat', '1.0.0-beta.2', cwd);

    // act
    const ctx = await testLastVersion(cwd, {});

    // assert
    expect(ctx.versions[0].version).toEqual('1.0.0-beta.2');
  });

  it('should throw error for unknown branch', async () => {
    // arrange

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    await commitAndTag('feat: next feat', '1.0.0-beta.2', cwd);
    // -- create feature branch
    await gitCheckout('users/bob/bobs-new-feat', 'create', { cwd });

    // act & assert
    await expect(testLastVersion(cwd, {})).rejects.toThrow(ERRORS.UNKNOWN_BRANCH);
  });

  it('should works with unknown branch when channel is set to beta', async () => {
    // arrange

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    await commitAndTag('feat: next feat', '1.0.0-beta.2', cwd);
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    // -- create feature branch
    await gitCheckout('users/bob/bobs-new-feat', 'create', { cwd });

    // act
    const ctx = await testLastVersion(cwd, { channel: 'beta' });

    // assert
    expect(ctx.versions[0].version).toEqual('1.0.0-beta.2');
  });

  it('should works with unknown branch when channel is set to rc', async () => {
    // arrange

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    await commitAndTag('feat: next feat', '1.0.0-beta.2', cwd);
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await commitAndTag('feat: another feat', '1.1.0-beta.1', cwd);
    // -- create feature branch
    await gitCheckout('users/bob/bobs-new-feat', 'create', { cwd });

    // act
    const ctx = await testLastVersion(cwd, { channel: 'rc' });

    // assert
    expect(ctx.versions[0].version).toEqual('1.0.0-rc.1');
  });

  it('should works with unknown branch when channel is set to stable', async () => {
    // arrange

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    await commitAndTag('feat: next feat', '1.0.0-beta.2', cwd);
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    // -- create release
    await gitCheckout('releases/1.0', 'create', { cwd });
    await commitAndTag('build: switch to stable', '1.0.0', cwd);
    // -- switch back to main for an another feat.
    await gitCheckout('main', 'checkout', { cwd });
    await commitAndTag('feat: another feat', '1.1.0-beta.1', cwd);
    // -- create feature branch
    await gitCheckout('users/bob/bobs-new-feat', 'create', { cwd });

    // act
    const ctx = await testLastVersion(cwd, { channel: 'stable' });

    // assert
    expect(ctx.versions[0].version).toEqual('1.0.0');
  });

  it('versions should be undefined if no tag vor requested channel', async () => {
    // arrange

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    await commitAndTag('feat: next feat', '1.0.0-beta.2', cwd);
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    // -- create feature branch
    await gitCheckout('users/bob/bobs-new-feat', 'create', { cwd });

    // act
    const ctx = await testLastVersion(cwd, { channel: 'stable' });

    // assert
    expect(ctx.versions.length).toBe(0);
  });
});

async function testLastVersion(cwd: string, options: LastVersionOptions) {
  const currentCwd = process.cwd();
  try {
    process.chdir(cwd);
    const config = await getConfig();
    const currentBranch = await getCurrentBranch();
    return await lastVersion({ config, currentBranch, channel: options.channel }, options);
  } finally {
    process.chdir(currentCwd);
  }
}

async function commitAndTag(message: string, tag: string, cwd: string) {
  await gitCommits([message], { cwd });
  await gitTagVersion(tag, undefined, { cwd });
}
