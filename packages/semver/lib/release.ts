import { valid as validSemver } from 'semver';
import { existsSync, readFile, writeFile } from 'fs';
import { debug } from './logger';
import { NextVersionOptions } from './next-version/next-version';
import { nxAffectedProjects } from './next-version/nx-helpers';
import { addGitTag, commit } from './git-helpers';
import { push } from '.';

/**
 * Create a new release.
 * Bump the version in the package.json if this file exists and add the git tags.
 * @param options Options.
 * @param tags Tags for the release.
 */
export async function release(options: NextVersionOptions, tags: string[]) {
  if (!tags) return;
  debug(options.debug, 'Start with bump...');
  // set the commits author and commiter info and prevent the `git` CLI to prompt for username/password
  setGitAuthor();

  let hasChanges = false;
  const mainVersion = getMainVersion(tags, options.tagPrefix);
  // bump version in main package.json if exists
  if (existsSync('package.json')) {
    const packageJson = await readPackageJson('package.json');
    packageJson.version = mainVersion;
    await updatePackageJson(packageJson, 'package.json');
    hasChanges = true;
  }

  // bump version in nx projects if package.json exists
  if (options.workspace === 'nx') {
    await bumpNxProjects(
      tags.filter((tag) => tag.includes('/')),
      options.tagPrefix
    );
    hasChanges = true;
  }

  if (hasChanges) {
    commit(`chore(release): ${mainVersion}`);
    push();
  }

  // add git tags
  tags.forEach((tag) => addGitTag(tag));
}

function getMainVersion(tags: string[], tagPrefix: string) {
  return tags.map((tag) => (tagPrefix ? tag.replace(tagPrefix, '') : tag)).filter((tag) => validSemver(tag))[0];
}

async function bumpNxProjects(tags: string[], tagPrefix: string) {
  const allProjects = await nxAffectedProjects(undefined);

  await Promise.all(
    tags.map(async (tag) => {
      const [project, semverTag] = tag.split('/');
      if (allProjects.includes(project) && semverTag) {
        const version = semverTag.replace(tagPrefix, '');
        const packageJsonPaths = [getNxProjectPackageJson(project), getNxProjectDistPackageJson(project)];

        await Promise.all(
          packageJsonPaths
            .filter((p) => !!p)
            .map(async (packageJsonPath) => {
              const packageJson = await readPackageJson(packageJsonPath);
              packageJson.version = version;
              await updatePackageJson(packageJson, packageJsonPath);
            })
        );
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
function getNxProjectDistPackageJson(project: string) {
  let path = `dist/packages/${project}/package.json`;
  if (existsSync(path)) return path;
  path = `dist/libs/${project}/package.json`;
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

function setGitAuthor() {
  const author = 'inova-semver-bot';
  const email = 'inova-semver-bot@inova.ch';
  process.env.GIT_AUTHOR_NAME = author;
  process.env.GIT_AUTHOR_EMAIL = email;
  process.env.GIT_COMMITTER_NAME = author;
  process.env.GIT_COMMITTER_EMAIL = email;
}
