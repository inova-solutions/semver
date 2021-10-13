import { getCurrentBranch } from './git-helpers';
import { gitRepo } from './test/git-utils';

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

async function getCurrentBranchTest(cwd: string) {
  const currentCwd = process.cwd();
  try {
    process.chdir(cwd);
    return await getCurrentBranch();
  } finally {
    process.chdir(currentCwd);
  }
}
