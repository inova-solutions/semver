import { Config, getConfig, isBetaBranch, isReleaseBranch } from './config';
import { mockExistsSync, mockReadFile } from './test/fs.mock';
import * as gitHelpers from './git-helpers';

describe('config, read', () => {
  afterEach(() => jest.resetAllMocks());
  it('default config works', async () => {
    expect(await getConfig()).toEqual<Config>({
      betaBranchName: 'main',
      releaseBranchName: 'releases/*',
      commitMessageFormat: 'angular',
      releaseCandidate: true,
      commitTypesToIgnore: [`ci`, `repo`, `docs`, `test`, `chore`],
    });
  });
  it('config merge with defaults works', async () => {
    // arrange
    const configMock: Config = {
      betaBranchName: 'master',
      releaseCandidate: false,
      commitTypesToIgnore: [`ci`, `repo`, `chore`],
    };
    mockExistsSync(true);
    mockReadFile(null, configMock);

    // act
    const config = await getConfig();

    // assert
    expect(config).toEqual<Config>({
      betaBranchName: 'master',
      releaseBranchName: 'releases/*',
      commitMessageFormat: 'angular',
      releaseCandidate: false,
      commitTypesToIgnore: [`ci`, `repo`, `chore`],
    });
  });
});

describe('isReleaseBranch', () => {
  afterEach(() => jest.resetAllMocks());

  [
    { branchName: 'releases/1.0', expectedMatch: true },
    { branchName: 'releases/mars', expectedMatch: true },
    { branchName: 'release/snickers', expectedMatch: false },
    { branchName: 'release', expectedMatch: false },
  ].forEach(({ branchName, expectedMatch }) => {
    it(`should return ${expectedMatch} for ${branchName}`, async () => {
      // arrange
      jest.spyOn(gitHelpers, 'getCurrentBranch').mockResolvedValue(branchName);
      // act, assert
      expect(await isReleaseBranch()).toEqual(expectedMatch);
    });
  });
});

describe('isBetaBranch', () => {
  afterEach(() => jest.resetAllMocks());

  [
    { branchName: 'main', expectedMatch: true },
    { branchName: 'beta/master', expectedMatch: false },
    { branchName: 'master', expectedMatch: false },
    { branchName: 'master3', expectedMatch: false },
  ].forEach(({ branchName, expectedMatch }) => {
    it(`should return ${expectedMatch} for ${branchName}`, async () => {
      // arrange
      jest.spyOn(gitHelpers, 'getCurrentBranch').mockResolvedValue(branchName);
      // act, assert
      expect(await isBetaBranch()).toEqual(expectedMatch);
    });
  });
});
