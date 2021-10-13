import { getCurrentBranch, lastSemverTag, SemverTagOptions } from './git-helpers';
import { gitCheckout, gitCommits, gitRepo, gitTagVersion } from './test/git-utils';

describe('getCurrentBranch', () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('works for main', async () => {
    // arrange
    const { cwd } = await gitRepo(false, 'main');

    // act
    const branchName = await getCurrentBranchTest(cwd);

    // assert
    expect(branchName).toEqual('main');
  });

  it('works for release', async () => {
    // arrange
    const { cwd } = await gitRepo(false, 'releases/1.0');

    // act
    const branchName = await getCurrentBranchTest(cwd);

    // assert
    expect(branchName).toEqual('releases/1.0');
  });
});

describe('lastSemverTag', () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('works for beta', async () => {
    // arrange
    const { cwd } = await gitRepo(false, 'main');
    await commitAndTag('feat: new feat', '1.1.0-beta.7', cwd);
    await gitTagVersion('1.1.0-rc.1', undefined, { cwd });

    // act
    const tag = await lastSemverTagTest(cwd, { channel: 'beta' });

    // assert
    expect(tag).toEqual('1.1.0-beta.7');
  });

  it('works for rc', async () => {
    // arrange
    const { cwd } = await gitRepo(false, 'main');
    await commitAndTag('feat: new feat', '1.1.0-beta.7', cwd);
    await gitCheckout('releases/1.0', 'create', { cwd });
    await gitTagVersion('1.1.0-rc.1', undefined, { cwd });

    // act
    const tag = await lastSemverTagTest(cwd, { channel: 'rc' });

    // assert
    expect(tag).toEqual('1.1.0-rc.1');
  });
});

async function getCurrentBranchTest(cwd: string) {
  const currentCwd = process.cwd();
  try {
    process.chdir(cwd);
    return await getCurrentBranch();
  } finally {
    process.chdir(currentCwd);
  }
}

async function lastSemverTagTest(cwd: string, options: SemverTagOptions) {
  const currentCwd = process.cwd();
  try {
    process.chdir(cwd);
    return await lastSemverTag(options);
  } finally {
    process.chdir(currentCwd);
  }
}

async function commitAndTag(message: string, tag: string, cwd: string) {
  await gitCommits([message], { cwd });
  await gitTagVersion(tag, undefined, { cwd });
}
