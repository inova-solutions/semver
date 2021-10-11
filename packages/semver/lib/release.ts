import { valid as validSemver } from 'semver';
import { existsSync, readFile, writeFile } from 'fs';
import { debug } from './logger';
import { NextVersionOptions } from './next-version/next-version';
import { nxAffectedProjects } from './next-version/nx-helpers';

export async function bump(options: NextVersionOptions, tags: string[]) {
  debug(options.debug, 'Start with bump...');

  // bump version in main package.json if exists
  if (existsSync('package.json')) {
    const packageJson = await readPackageJson('package.json');
    packageJson.version = getMainVersion(tags, options.tagPrefix);
    await updatePackageJson(packageJson, 'package.json');
  }

  if (options.workspace === 'nx') {
    bumpNxProjects(
      tags.filter((tag) => tag.includes('/')),
      options.tagPrefix
    );
  }
}

function getMainVersion(tags: string[], tagPrefix: string) {
  return tags.map((tag) => (tagPrefix ? tag.replace(tagPrefix, '') : tag)).filter((tag) => validSemver(tag))[0];
}

async function bumpNxProjects(tags: string[], tagPrefix: string) {
  const allProjects = await nxAffectedProjects(undefined);

  await Promise.all(
    tags.map(async (tag) => {
      const [project, semverTag] = tag.split('/')[1];
      if (allProjects.includes(project) && semverTag) {
        const version = semverTag.replace(tagPrefix, '');
        const packageJsonPath = getNxProjectPackageJson(project);
        if (packageJsonPath) {
          const packageJson = await readPackageJson(packageJsonPath);
          packageJson.version = version;
          await updatePackageJson(packageJson, packageJsonPath);
        }
      }
    })
  );
}

function getNxProjectPackageJson(project: string) {
  let path = `packages/${project}/package.json`;
  if (existsSync(path)) return path;
  path = `libs/${project}/package.json`;
  if (existsSync(path)) return path;
  return undefined;
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

async function updatePackageJson(packageJson: unknown, path: string) {
  return new Promise<void>((resolve, reject) => {
    writeFile(path, JSON.stringify(packageJson, undefined, 2), (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
