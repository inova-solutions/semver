import { gitRepo, gitCommits, gitTagVersion, gitCheckout, gitCommitFile, push } from '../test/git-utils';
import { getChannel, nextVersion } from './next-version';
import { Config, getConfig } from '../config';
import { ERRORS } from '../constants';
import { NextVersionOptions } from '../models';
import * as gitHelpers from '../git-helpers';
import * as logger from '../logger';
import { getCurrentBranch } from '../git-helpers';

describe('nextVersion in main, no release branch exists', () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

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

  it('no relevant commits since last release', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: a feat for version 1'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCommits(['docs: should not bump'], { cwd });
    await gitCommits(['test(lib-a): add tests'], { cwd });
    await gitCommits(['ci: update config'], { cwd });
    await gitCommits(['chore: update changelog'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version).toBeNull();
  });

  it('no relevant commits since last release', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: a feat for version 1'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCommits(['build: should not bump'], { cwd });

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
    expect(version[0].tag).toEqual('1.0.0-beta.1');
    expect(version[0].version).toEqual('1.0.0-beta.1');
    expect(version[0].project).toBeUndefined();
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
    expect(version[0].tag).toEqual('1.0.0-beta.2');
  });

  it('breaking change, should tag with 1.0.0-beta.2', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCommits(
      [
        `feat: breaking change feature
    BREAKING CHANGE: oh-no`,
      ],
      { cwd }
    );

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.0.0-beta.2');
  });
});

describe('nextVersion in main, the first release branch is in rc mode', () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('patch should be 1.0.1-beta.1, after rc build 1.0.0-rc.1', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCheckout('main', 'checkout', { cwd });
    await gitCommits(['fix: a fix'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.0.1-beta.1');
  });

  it('new feat should be 1.1.0-beta.1, after rc build 1.0.0-rc.1', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCheckout('main', 'checkout', { cwd });
    await gitCommits(['feat: the new feature'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.1.0-beta.1');
  });

  it('another patch should be 1.1.0-beta.2, after rc build 1.0.0-rc.1', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCheckout('main', 'checkout', { cwd });
    await commitAndTag('feat: the new feature', '1.1.0-beta.1', cwd);
    await gitCommits(['fix: the another patch'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.1.0-beta.2');
  });

  it('another new feat should be 1.1.0-beta.2, after rc build 1.0.0-rc.1', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCheckout('main', 'checkout', { cwd });
    await gitCommits(['feat: the new feature'], { cwd });
    await gitTagVersion('1.1.0-beta.1', undefined, { cwd });
    await gitCommits(['feat: another new feature'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.1.0-beta.2');
  });

  it('breaking change should be 2.0.0-beta.1, after rc build 1.0.0-rc.1', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCheckout('main', 'checkout', { cwd });
    await gitCommits(
      [
        `feat: the new feature
    BREAKING CHANGE: oh-no
    `,
      ],
      { cwd }
    );

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('2.0.0-beta.1');
  });

  it('patch after breaking change should be 2.0.0-beta.2, when rc build is 1.0.0-rc.1', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCheckout('main', 'checkout', { cwd });
    await gitCommits(
      [
        `feat: the new feature
    BREAKING CHANGE: oh-no
    `,
      ],
      { cwd }
    );
    await gitTagVersion('2.0.0-beta.1', undefined, { cwd });
    await gitCommits(['fix: fix for the breaking'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('2.0.0-beta.2');
  });
});

describe('nextVersion in main, the first release branch is in stable mode', () => {
  jest.setTimeout(90000);
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('patch should be 1.0.1-beta.1, after stable build 1.0.0', async () => {
    // arrange
    const config = await getConfig();
    config.releaseCandidate = false;

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCommits(['repo: switch to stable'], { cwd });
    await gitTagVersion('1.0.0', undefined, { cwd });
    await gitCheckout('main', 'checkout', { cwd });
    await gitCommits(['fix: a fix'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.0.1-beta.1');
  });

  it('new feat should be 1.1.0-beta.1, after stable build 1.0.0', async () => {
    // arrange
    const config = await getConfig();
    config.releaseCandidate = false;

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCommits(['repo: switch to stable'], { cwd });
    await gitTagVersion('1.0.0', undefined, { cwd });
    await gitCheckout('main', 'checkout', { cwd });
    await gitCommits(['feat: the new feature'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.1.0-beta.1');
  });

  it('another new feat should be 1.1.0-beta.2, after stable build 1.0.0', async () => {
    // arrange
    const config = await getConfig();
    config.releaseCandidate = false;

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCommits(['repo: switch to stable'], { cwd });
    await gitTagVersion('1.0.0', undefined, { cwd });
    await gitCheckout('main', 'checkout', { cwd });
    await gitCommits(['feat: the new feature'], { cwd });
    await gitTagVersion('1.1.0-beta.1', undefined, { cwd });
    await gitCommits(['feat: another new feature'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.1.0-beta.2');
  });

  it('breaking change should be 2.0.0-beta.1, after stable build 1.0.0', async () => {
    // arrange
    const config = await getConfig();
    config.releaseCandidate = false;

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0', undefined, { cwd });
    await gitCheckout('main', 'checkout', { cwd });
    await gitCommits(
      [
        `feat: the new feature
    BREAKING CHANGE: oh-no
    `,
      ],
      { cwd }
    );

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('2.0.0-beta.1');
  });

  it('patch after breaking change should be 2.0.0-beta.2, when stable build is 1.0.0', async () => {
    // arrange
    const config = await getConfig();
    config.releaseCandidate = false;

    const { cwd } = await gitRepo(false);
    await gitCommits(['feat: first feat'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0', undefined, { cwd });
    await gitCheckout('main', 'checkout', { cwd });
    await gitCommits(
      [
        `feat: the new feature
    BREAKING CHANGE: oh-no
    `,
      ],
      { cwd }
    );
    await gitTagVersion('2.0.0-beta.1', undefined, { cwd });
    await gitCommits(['fix: fix for the breaking'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('2.0.0-beta.2');
  });
});

describe('nextVersion in release, rc mode is enabled', () => {
  jest.setTimeout(90000);
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('first version should be 1.0.0-rc.1', async () => {
    // arrange
    const config = await getConfig();

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    await commitAndTag('feat: next feat', '1.0.0-beta.2', cwd);
    // -- create release branch
    await gitCheckout('releases/1.0', 'create', { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.0.0-rc.1');
  });

  it('patch should not increment minor, only rc build no', async () => {
    // arrange
    const config = await getConfig();

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    // -- create release branch
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCommits(['fix: cherry pick from main'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.0.0-rc.2');
  });

  it('feat should not increment minor, only rc build no', async () => {
    // arrange
    const config = await getConfig();

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    // -- create release branch
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCommits(['feat: cherry pick from main'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.0.0-rc.2');
  });

  it('feat should not increment minor, only rc build no, even beta has already next major', async () => {
    // arrange
    const config = await getConfig();

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    // -- create release branch
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await commitAndTag('fix: a new fix for rc', '1.0.0-rc.2', cwd);
    // -- switch back to main and commit a breaking change
    await gitCheckout('main', 'checkout', { cwd });
    await commitAndTag(
      `feat: new feature with breaking api
    BREAKING CHANGE: oh-no`,
      '2.0.0-beta.1',
      cwd
    );
    // -- switch back to release and add a feature
    await gitCheckout('releases/1.0', 'checkout', { cwd });
    await gitCommits(['feat: cherry pick from main'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.0.0-rc.3');
  });

  it('increment correctly for a new release branch but for same version', async () => {
    // arrange
    const config = await getConfig();

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    await commitAndTag('feat: next feat', '1.0.0-beta.2', cwd);
    // -- create release branch (in rc mode)
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    // -- add new features to main
    await gitCheckout('main', 'checkout', { cwd });
    await commitAndTag('feat(lib-a): a new feature for the next rc build', '1.1.0-beta.1', cwd);
    // -- create a new release branch but for same version 1.0 (the original 1.0 will be archived)
    await gitCheckout('releases/1.0b', 'create', { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.0.0-rc.2');
  });
});

describe('nextVersion in release, stable mode is enabled', () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('first version should be 1.0.0', async () => {
    // arrange
    const config = await getConfig();
    config.releaseCandidate = false;

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    await commitAndTag('feat: next feat', '1.0.0-beta.2', cwd);
    // -- create release branch
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitCommits(['repo: set releaseCandidate to false'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.0.0');
  });

  it('fix should increment patch in stable mode', async () => {
    // arrange
    const config = await getConfig();
    config.releaseCandidate = false;

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    await commitAndTag('feat: next feat', '1.0.0-beta.2', cwd);
    // -- create release branch
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await commitAndTag('repo: set releaseCandidate to false', '1.0.0', cwd);
    await gitCommits(['fix: a hotfix'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.0.1');
  });

  it('new features are not allowed', async () => {
    // arrange
    const config = await getConfig();
    config.releaseCandidate = false;

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    await commitAndTag('feat: next feat', '1.0.0-beta.2', cwd);
    // -- create release branch
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await commitAndTag('repo: set releaseCandidate to false', '1.0.0', cwd);
    await gitCommits(['feat: a new feature'], { cwd });

    // act & assert
    await expect(testNextVersion(cwd, config, {})).rejects.toThrow();
  });

  it('second release work as expected', async () => {
    // arrange
    const config = await getConfig();
    config.releaseCandidate = false;

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    await commitAndTag('feat: next feat', '1.0.0-beta.2', cwd);
    // -- create release branch 1
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await commitAndTag('build: mark as stable', '1.0.0', cwd);
    // -- add new feat to main and tag it with nextVersion
    await gitCheckout('main', 'checkout', { cwd });
    await gitCommits(['feat: new feat in main'], { cwd });
    let nextVersion = (await testNextVersion(cwd, config, {}))[0];
    expect(nextVersion.tag).toEqual('1.1.0-beta.1');
    await gitTagVersion(nextVersion.tag, undefined, { cwd });
    // -- release that new feat. in a new release branch, but create a rc first
    config.releaseCandidate = true;
    await gitCheckout('releases/1.1', 'create', { cwd });
    nextVersion = (await testNextVersion(cwd, config, {}))[0];
    expect(nextVersion.tag).toEqual('1.1.0-rc.1');
    await gitTagVersion(nextVersion.tag, undefined, { cwd });
    config.releaseCandidate = false;
    await gitCommits(['build: mark as stable'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.1.0');
  });

  it('patch on an old release branch generates the correct version', async () => {
    // arrange
    const config = await getConfig();
    config.releaseCandidate = false;

    // -- init main
    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', '1.0.0-beta.1', cwd);
    await commitAndTag('feat: next feat', '1.0.0-beta.2', cwd);
    // -- create release branch 1
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await commitAndTag('repo: set releaseCandidate to false', '1.0.0', cwd);

    // -- back to main and a new feat
    await gitCheckout('main', 'checkout', { cwd });
    await commitAndTag('feat: new feat in main', '1.1.0-beta.1', cwd);

    // -- create release branch 2
    await gitCheckout('releases/2.0', 'create', { cwd });
    await gitTagVersion('1.1.0', undefined, { cwd });

    // -- back to release branch 1 and a patch
    await gitCheckout('releases/1.0', 'checkout', { cwd });
    await gitCommits(['fix: a patch'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version[0].tag).toEqual('1.0.1');
  });
});

describe('nextVersion in main, with tagPrefix', () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('second feature, should tag with v1.0.0-beta.2', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', 'v1.0.0-beta.1', cwd);
    await gitCommits(['feat: second feat'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, { tagPrefix: 'v' });

    // assert
    expect(version[0].tag).toEqual('v1.0.0-beta.2');
    expect(version[0].version).toEqual('1.0.0-beta.2');
    expect(version[0].project).toBeUndefined();
  });

  it('breaking change, should tag with v1.0.0-beta.2', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: first feat', 'v1.0.0-beta.1', cwd);
    await gitCommits(
      [
        `feat: breaking change feature
    BREAKING CHANGE: oh-no`,
      ],
      { cwd }
    );

    // act
    const version = await testNextVersion(cwd, config, { tagPrefix: 'v' });

    // assert
    expect(version[0].tag).toEqual('v1.0.0-beta.2');
  });

  it('multiple prefixes works', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await commitAndTag('feat(app1): first feat', 'app1/1.0.0-beta.1', cwd);
    await commitAndTag('feat(app2): first feat', 'app2/1.0.0-beta.1', cwd);
    await gitCommits(['feat(app1): second feat for first app'], { cwd });

    // act
    const version = await testNextVersion(cwd, config, { tagPrefix: 'app1/' });

    // assert
    expect(version[0].tag).toEqual('app1/1.0.0-beta.2');
    expect(version[0].version).toEqual('1.0.0-beta.2');
    expect(version[0].project).toBeUndefined();
  });
});

describe('nextVersion in main, with tagPrefix and path', () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('first version for a specific path', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: a global feat', '1.0.0-beta.3', cwd);
    await gitCommitFile('apps/first-app/README.md', 'fix(first-app): second feat', { cwd });
    await gitCommitFile('apps/second-app/README.md', 'feat(second-app): second feat', { cwd });

    // act
    const version = await testNextVersion(cwd, config, { tagPrefix: 'first-app/', path: 'apps/first-app' });

    // assert
    expect(version[0].tag).toEqual('first-app/1.0.0-beta.1');
  });

  it('patch for a specific path after rc release', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false);
    await commitAndTag('feat: a global feat', '1.0.0-beta.3', cwd);
    await gitTagVersion('first-app/1.0.0-beta.1', undefined, { cwd });
    await gitTagVersion('1.0.0-rc.1', undefined, { cwd });
    await gitTagVersion('first-app/1.0.0-rc.1', undefined, { cwd });
    await gitCommitFile('apps/first-app/README.md', 'fix(first-app): second feat', { cwd });
    await gitCommitFile('apps/second-app/README.md', 'feat(second-app): second feat', { cwd });

    // act
    const version = await testNextVersion(cwd, config, { tagPrefix: 'first-app/', path: 'apps/first-app' });

    // assert
    expect(version[0].tag).toEqual('first-app/1.0.1-beta.1');
  });
});

describe('nextVersion unknown branch', () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('should throw error', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(false, 'feature/my-feat-branch');
    await commitAndTag('feat: a global feat', '1.0.0-beta.3', cwd);
    await gitCommits(['fix: set releaseCandidate to false'], { cwd });

    // act & assert
    await expect(testNextVersion(cwd, config, {})).rejects.toThrow(ERRORS.UNKNOWN_BRANCH);
  });

  it('no next version in a PR', async () => {
    // arrange
    const config = await getConfig();

    const { cwd } = await gitRepo(true);
    await gitCommits(['feat: a feat for version 1'], { cwd });
    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitCommits(['feat: a new feature'], { cwd });
    await push({ cwd });

    jest.spyOn(gitHelpers, 'isPr').mockReturnValue(true);
    const warnSpy = jest.spyOn(logger, 'warn');

    // act
    const version = await testNextVersion(cwd, config, {});

    // assert
    expect(version).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      `This run was triggered by a pull request and therefore a new version won't be published.`
    );
  });
});

async function testNextVersion(cwd: string, config: Config, options: NextVersionOptions) {
  const currentCwd = process.cwd();
  try {
    process.chdir(cwd);
    const channel = await getChannel(config);
    const currentBranch = await getCurrentBranch();
    const result = await nextVersion({ config, channel, currentBranch, versions: null }, options);
    return result?.versions ?? null;
  } finally {
    process.chdir(currentCwd);
  }
}

async function commitAndTag(message: string, tag: string, cwd: string) {
  await gitCommits([message], { cwd });
  await gitTagVersion(tag, undefined, { cwd });
}
