import { valid as validSemver } from 'semver';
import { existsSync, readFile, writeFile, rm } from 'fs';
import { debug, warn } from './logger';
import { nxAffectedProjects } from './next-version/nx-helpers';
import { addGitTag, commit, isBranchUpToDate, isPr } from './git-helpers';
import { NextVersionOptions, NextVersionResult } from './models';

/**
 * Create a new release.
 * Bump the version in the package.json if this file exists and add the git tags.
 * @param options Options.
 * @param nextVersions Tags for the release.
 */
export async function release(options: NextVersionOptions, nextVersions: NextVersionResult[]) {
  if (!nextVersions) return;

  // check if branch is up to date
  if (!(await isBranchUpToDate())) {
    warn(`The local branch is behind the remote one, therefore a new version won't be published.`);
    await cleanOutput(options.outputFile);
    return;
  }

  // check if is a PR
  if (isPr()) {
    warn(`This run was triggered by a pull request and therefore a new version won't be published.`);
    await cleanOutput(options.outputFile);
    return;
  }

  debug(options.debug, 'Start with bump...');
  // set the commits author and commiter info and prevent the `git` CLI to prompt for username/password
  setGitAuthor();

  let hasChanges = false;
  const mainVersion = getMainVersion(nextVersions);
  // bump version in main package.json if exists
  if (existsSync('package.json')) {
    const packageJson = await readPackageJson('package.json');
    packageJson.version = mainVersion.version;
    await updatePackageJson(packageJson, 'package.json');
    hasChanges = true;
  }

  // bump version in nx projects if package.json exists
  if (options.workspace === 'nx') {
    await bumpNxProjects(nextVersions.filter((nextVersion) => nextVersion.project));
    hasChanges = true;
  }

  if (hasChanges) {
    commit(`chore(release): ${mainVersion.tag}`, true);
  }

  // add git tags
  nextVersions.forEach((nextVersion) => addGitTag(nextVersion.tag));
}

function getMainVersion(nextVersions: NextVersionResult[]) {
  return nextVersions.filter((result) => !result.project).filter((tag) => validSemver(tag.version))[0];
}

async function bumpNxProjects(nextVersions: NextVersionResult[]) {
  const allProjects = await nxAffectedProjects(undefined);

  await Promise.all(
    nextVersions.map(async (tag) => {
      if (allProjects.includes(tag.project)) {
        const packageJsonPaths = [getNxProjectPackageJson(tag.project), getNxProjectDistPackageJson(tag.project)];

        await Promise.all(
          packageJsonPaths
            .filter((p) => !!p)
            .map(async (packageJsonPath) => {
              const packageJson = await readPackageJson(packageJsonPath);
              packageJson.version = tag.version;
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

async function cleanOutput(outputFile: string) {
  return new Promise<void>((resolve, reject) => {
    if (outputFile && existsSync(outputFile)) {
      rm(outputFile, (error) => (error ? reject(error) : resolve()));
    }
    resolve();
  });
}
