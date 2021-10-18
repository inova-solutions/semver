import { gitTagVersion, gitCommitFile } from '../test/git-utils';
import { nextVersion } from './next-version';
import { Config, getConfig } from '../config';
import { createWorkspace, generateLibrary } from '../test/nx-utils';
import { NextVersionOptions, NextVersionResult } from '../models';
import { readFile as _readFile } from 'fs';
import { join } from 'path';

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
    const versions = await testNextVersion(cwd, config, {
      workspace: 'nx',
    });

    // assert
    expect(versions.sort((a, b) => sortByProject(a, b))).toEqual<NextVersionResult[]>([
      { version: '1.0.0-beta.1', tag: '1.0.0-beta.1' },
      { version: '1.0.0-beta.1', tag: 'lib-a/1.0.0-beta.1', project: 'lib-a' },
      { version: '1.0.0-beta.1', tag: 'lib-b/1.0.0-beta.1', project: 'lib-b' },
      { version: '1.0.0-beta.1', tag: 'lib-c/1.0.0-beta.1', project: 'lib-c' },
    ]);
  });

  it('write output file works', async () => {
    // arrange
    const config = await getConfig();
    const cwd = workspacePath;
    // act
    const versions = await testNextVersion(cwd, config, {
      workspace: 'nx',
      outputFile: 'out.json',
    });

    // assert
    const fileContent = await readFile<NextVersionResult[]>(join(cwd, 'out.json'));
    expect(versions).toEqual(fileContent);
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
    const versions = await testNextVersion(cwd, config, {
      workspace: 'nx',
    });

    // assert
    const sortedResult = versions.sort((a, b) => sortByProject(a, b));
    expect(sortedResult[0]).toEqual<NextVersionResult>({ tag: '1.0.0-beta.2', version: '1.0.0-beta.2' });
    expect(sortedResult[1]).toEqual<NextVersionResult>({
      tag: 'lib-b/1.0.0-beta.2',
      version: '1.0.0-beta.2',
      project: 'lib-b',
    });
  });

  it('a new feat for lib-c with tagPrefix', async () => {
    // arrange
    const config = await getConfig();
    const cwd = workspacePath;

    await gitTagVersion('v1.0.0-beta.1', undefined, { cwd });
    await gitTagVersion('lib-a/v1.0.0-beta.1', undefined, { cwd });
    await gitTagVersion('lib-b/v1.0.0-beta.1', undefined, { cwd });
    await gitTagVersion('lib-c/v1.0.0-beta.1', undefined, { cwd });

    await gitCommitFile('packages/lib-c/src/feat-1c.ts', 'fix(lib-c): a new feat in the c lib', { cwd });

    // act
    const versions = await testNextVersion(cwd, config, {
      workspace: 'nx',
      tagPrefix: 'v',
    });

    // assert
    const sortedResult = versions.sort((a, b) => sortByProject(a, b));
    expect(sortedResult[0]).toEqual<NextVersionResult>({ tag: 'v1.0.0-beta.2', version: '1.0.0-beta.2' });
    expect(sortedResult[1]).toEqual<NextVersionResult>({
      tag: 'lib-c/v1.0.0-beta.2',
      version: '1.0.0-beta.2',
      project: 'lib-c',
    });
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

async function readFile<T>(path: string) {
  return new Promise<T>((resolve, reject) => {
    _readFile(path, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(JSON.parse(data.toString()));
    });
  });
}

function sortByProject(a: NextVersionResult, b: NextVersionResult) {
  const projectA = (a.project ?? '').toUpperCase();
  const projectB = (b.project ?? '').toUpperCase();

  if (projectA < projectB) return -1;
  if (projectA > projectB) return 1;
  return 0;
}
