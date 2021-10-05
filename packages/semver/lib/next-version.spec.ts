import { gitRepo, gitCommits, gitTagVersion, gitCheckout } from './test/git-utils';
import { nextVersion } from './next-version';
import { Config, getConfig } from './config';

describe('nextVersion in main, no release branch exists', () => {
  afterEach(() => jest.resetAllMocks());
  it('no commits since last release', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: a feat for version 1'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version).toBeNull();
  });

  it('first feat, should tag with 1.0.0-beta.1', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version).toEqual('1.0.0-beta.1');
  });

  it('second feature, should tag with 1.0.0-beta.2', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCommits(['feat: second feat'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version).toEqual('1.0.0-beta.2');
  });

  it('breaking change, should tag with 1.0.0-beta.2', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCommits([`feat: breaking change feature
    BREAKING CHANGE: oh-no`], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version).toEqual('1.0.0-beta.2');
  });
});

describe('nextVersion in main, the first release branch is in rc mode', () => {
  afterEach(() => jest.resetAllMocks());

  it('patch should be 1.0.1-beta.1, after rc build 1.0.0-rc.1', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', {cwd});
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCheckout('main', 'checkout', {cwd});
    await gitCommits(['fix: a fix'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version).toEqual('1.0.1-beta.1');
  });

  it('new feat should be 1.1.0-beta.1, after rc build 1.0.0-rc.1', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', {cwd});
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCheckout('main', 'checkout', {cwd});
    await gitCommits(['feat: the new feature'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version).toEqual('1.1.0-beta.1');
  });

  it('another new feat should be 1.1.0-beta.2, after rc build 1.0.0-rc.1', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', {cwd});
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCheckout('main', 'checkout', {cwd});
    await gitCommits(['feat: the new feature'], { cwd });
    await gitTagVersion('1.1.0-beta.1', undefined, { cwd });
    await gitCommits(['feat: another new feature'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version).toEqual('1.1.0-beta.2');
  });

  it('breaking change should be 2.0.0-beta.1, after rc build 1.0.0-rc.1', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', {cwd});
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCheckout('main', 'checkout', {cwd});
    await gitCommits([`feat: the new feature
    BREAKING CHANGE: oh-no
    `], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version).toEqual('2.0.0-beta.1');
  });

  it('patch after breaking change should be 2.0.0-beta.2, when rc build is 1.0.0-rc.1', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', {cwd});
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCheckout('main', 'checkout', {cwd});
    await gitCommits([`feat: the new feature
    BREAKING CHANGE: oh-no
    `], { cwd });
    await gitTagVersion('2.0.0-beta.1', undefined, { cwd });
    await gitCommits(['fix: fix for the breaking'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version).toEqual('2.0.0-beta.2');
  });
});

async function testNextVersion(cwd: string, config: Config, options: { tagPrefix?: string; debug?: boolean }) {
  const currentCwd = process.cwd();
  try {
    process.chdir(cwd);
    return await nextVersion(config, options);
  } finally {
    process.chdir(currentCwd);
  }
}
