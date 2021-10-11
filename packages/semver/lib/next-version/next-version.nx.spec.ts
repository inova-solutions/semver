import { gitTagVersion, gitCommitFile } from '../test/git-utils';
import { nextVersion, NextVersionOptions } from './next-version';
import { Config, getConfig } from '../config';
import { createWorkspace, generateLibrary } from '../test/nx-utils';

let workspacePath;

describe('nextVersion in main, for nx workspace', () => {
  jest.setTimeout(90000);

  beforeAll(() => initWorkspace());

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('first version for all packages', async () => {
    // arrange
    const config = await getConfig();
    const cwd = workspacePath;
    // act
    const version = await testNextVersion(cwd, config, {
      workspace: 'nx',
    });

    // assert
    expect(version).toContain('1.0.0-beta.1');
    expect(version).toContain('lib-a/1.0.0-beta.1');
    expect(version).toContain('lib-b/1.0.0-beta.1');
    expect(version).toContain('lib-c/1.0.0-beta.1');
  });

  it('a new feat for lib-b', async () => {
    // arrange
    const config = await getConfig();
    const cwd = workspacePath;

    await gitTagVersion('1.0.0-beta.1', undefined, { cwd });
    await gitTagVersion('lib-a/1.0.0-beta.1', undefined, { cwd });
    await gitTagVersion('lib-b/1.0.0-beta.1', undefined, { cwd });
    await gitTagVersion('lib-c/1.0.0-beta.1', undefined, { cwd });

    await gitCommitFile('packages/lib-b/src/feat-1.ts', 'fix(lib-b): a new feat in the b lib', { cwd });

    // act
    const version = await testNextVersion(cwd, config, {
      workspace: 'nx',
    });

    // assert
    expect(version).toContain('1.0.0-beta.2');
    expect(version).toContain('lib-b/1.0.0-beta.2');
  });
});

async function testNextVersion(cwd: string, config: Config, options: NextVersionOptions) {
  const currentCwd = process.cwd();
  try {
    process.chdir(cwd);
    return await nextVersion(config, options);
  } finally {
    process.chdir(currentCwd);
  }
}

async function initWorkspace() {
  workspacePath = await createWorkspace('inova');
  await generateLibrary('lib-a', workspacePath);
  await generateLibrary('lib-b', workspacePath);
  await generateLibrary('lib-c', workspacePath);
}
