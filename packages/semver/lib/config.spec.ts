import type { Config } from './config';
import * as configModule from './config';
import * as gitHelpers from './git-helpers';

const { getConfig, isBetaBranch, isReleaseBranch } = configModule;

describe('config, read', () => {
  beforeEach(() => jest.spyOn(configModule.configFileAccess, 'fileExists').mockReturnValue(false));
  afterEach(() => jest.resetAllMocks());
  it('default config works', async () => {
    expect(await getConfig()).toEqual<Config>({
      betaBranchName: 'main',
      releaseBranchName: 'releases/*',
      commitMessageFormat: 'angular',
      releaseCandidate: true,
      commitTypesToIgnore: [`ci`, `repo`, `docs`, `test`, `chore`, `refactor`, `build`],
    });
  });
  it('config merge with defaults works', async () => {
    // arrange
    const configMock: Config = {
      betaBranchName: 'master',
      releaseCandidate: false,
      commitTypesToIgnore: [`ci`, `repo`, `chore`],
    };
    jest.spyOn(configModule.configFileAccess, 'fileExists').mockReturnValue(true);
    jest.spyOn(configModule.configFileAccess, 'readFile').mockResolvedValue(JSON.stringify(configMock));

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
  beforeEach(() => jest.spyOn(configModule.configFileAccess, 'fileExists').mockReturnValue(false));
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
  beforeEach(() => jest.spyOn(configModule.configFileAccess, 'fileExists').mockReturnValue(false));
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
