import { readFile, writeFile } from 'fs';
import { NxJsonConfiguration } from '@nrwl/devkit';
import { join } from 'path';
import { getCurrentBranch } from '../git-helpers';
import { tempDir } from './path-utils';
import { exec } from 'child_process';

/**
 * Create a new nx workspace with `npm` preset.
 * @param name Name of the workspace.
 * @returns Path to the created workspace.
 */
export async function createWorkspace(name: string): Promise<string> {
  let cwd = tempDir();
  const createCmd = `npx --yes create-nx-workspace --preset=npm --name=${name} --nx-cloud=false --interactive=false --skipGit=true`;

  await runCmd(createCmd, cwd);
  cwd = join(cwd, name);

  // init git manually
  await runCmd('git init', cwd);
  await runCmd('git config user.email "tester@example.com"', cwd);
  await runCmd('git config user.name "Testus Maximus"', cwd);
  await runCmd('git add .', cwd);
  await runCmd('git commit -m "repo: init workspace"', cwd);

  // sync default branch name
  const nxJson = await readNxJson(cwd);
  nxJson.affected.defaultBase = await getBranchName(cwd);
  await updateNxJson(nxJson, cwd);
  // commit change
  await runCmd('git add .', cwd);
  await runCmd('git commit -m "repo: update defaultBase for nx"', cwd);

  return cwd;
}

/**
 * Generates a new library in the nx workspace.
 * @param name Name of the library.
 * @param cwd Working dir. Path to the workspace.
 */
export async function generateLibrary(name: string, cwd: string) {
  const createCmd = `npx nx g library ${name} --buildable`;
  await runCmd(createCmd, cwd);

  // commit change
  await runCmd('git add .', cwd);
  await runCmd(`git commit -m "repo: add new library ${name}"`, cwd);
}

async function getBranchName(workspacePath: string) {
  const cwd = process.cwd();
  try {
    process.chdir(workspacePath);
    const branchName = await getCurrentBranch();
    return branchName;
  } finally {
    process.chdir(cwd);
  }
}

async function readNxJson(workspacePath: string) {
  return new Promise<NxJsonConfiguration>((resolve, reject) => {
    readFile(join(workspacePath, 'nx.json'), (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(JSON.parse(data.toString()));
    });
  });
}

async function updateNxJson(nxJson: NxJsonConfiguration, workspacePath: string) {
  return new Promise<void>((resolve, reject) => {
    writeFile(join(workspacePath, 'nx.json'), JSON.stringify(nxJson), (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function runCmd(cmd: string, workspacePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const cwd = process.cwd();
    process.chdir(workspacePath);

    exec(cmd, (error, stdout) => {
      process.chdir(cwd);
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}
