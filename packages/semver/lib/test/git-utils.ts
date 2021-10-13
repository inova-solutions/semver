// copy of: https://github.com/semantic-release/semantic-release/blob/master/test/helpers/git-utils.js
import * as execa from 'execa';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { tempDir, fileUrl } from './path-utils';

/**
 * Initialize a new git repository.
 * @param withRemote Creates a bare repository and initialize it.
 * @param branch Initial branch name.
 * @returns
 */
export async function initGit(withRemote: boolean, branch: string) {
  const cwd = tempDir();
  const args = withRemote ? ['--bare', `--initial-branch=${branch}`] : [`--initial-branch=${branch}`];

  await execa('git', ['init', ...args], { cwd }).catch(() => {
    const args = withRemote ? ['--bare'] : [];
    return execa('git', ['init', ...args], { cwd });
  });

  await execa('git', ['config', 'user.email', 'tester@example.com'], { cwd });
  await execa('git', ['config', 'user.name', 'Testus Maximus'], { cwd });

  const repositoryUrl = fileUrl(cwd);
  return { cwd, repositoryUrl };
}

/**
 * Create a temporary git repository.
 * If `withRemote` is `true`, creates a shallow clone. Change the current working directory to the clone root.
 * If `withRemote` is `false`, just change the current working directory to the repository root.
 *
 * @param withRemote `true` to create a shallow clone of a bare repository.
 * @param branch The branch to initialize.
 * @returns
 */
export async function gitRepo(withRemote: boolean, branch = 'main') {
  const repo = await initGit(withRemote, branch);
  const repositoryUrl = repo.repositoryUrl;
  let cwd = repo.cwd;

  if (withRemote) {
    await initBareRepo(repositoryUrl, branch);
    cwd = await gitShallowClone(repositoryUrl, branch);
  } else {
    await gitCheckout(branch, 'create', { cwd });
  }

  await execa('git', ['config', 'commit.gpgsign', 'false'], { cwd });

  return { cwd, repositoryUrl };
}

/**
 *  Create a tag on a commit in the current git repository.
 * @param tagName The tag name to create.
 * @param sha he commit on which to create the tag. If undefined the tag is created on the last commit.
 * @param execaOptions Options to pass to `execa`.
 */
export async function gitTagVersion(tagName: string, sha: string, execaOptions: execa.Options<string>) {
  await execa('git', sha ? ['tag', '-f', tagName, sha] : ['tag', tagName], execaOptions);
}

/**
 * Create commits on the current git repository.
 * @param messages Commit messages
 * @param execaOptions Options to pass to `execa`.
 */
export async function gitCommits(messages: string[], execaOptions: execa.Options<string>) {
  await Promise.all(
    messages.map(
      async (message) =>
        (
          await execa('git', ['commit', '-m', message, '--allow-empty', '--no-gpg-sign'], execaOptions)
        ).stdout
    )
  );
}

/**
 * Create a commit with a real file.
 * @param fileName Filename to create for a commit e.g. `apps/demo-app/README:md`
 * @param message Commit message.
 * @param execaOptions Options to pass to `execa`.
 * @param fileContent Content for the file.
 */
export async function gitCommitFile(
  fileName: string,
  message: string,
  execaOptions: execa.Options<string>,
  fileContent?: string
) {
  const dir = join(execaOptions.cwd, dirname(fileName));
  const fullName = join(execaOptions.cwd, fileName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(fullName, fileContent ?? message, { encoding: 'utf-8' });

  await execa('git', ['add', '.'], execaOptions);
  await execa('git', ['commit', '-m', message], execaOptions);
}

/**
 *Checkout a branch on the current git repository.
 * @param branch Branch name.
 * @param action Create new branch or checkout an existing one.
 * @param execaOptions Options to pass to `execa`.
 */
export async function gitCheckout(branch: string, action: 'create' | 'checkout', execaOptions: execa.Options<string>) {
  switch (action) {
    case 'create':
      await execa('git', ['checkout', '-b', branch], execaOptions);
      break;
    case 'checkout':
      await execa('git', ['checkout', branch], execaOptions);
      break;
  }
}

/**
 * Initialize an existing bare repository:
 * - Clone the repository
 * - Change the current working directory to the clone root
 * - Create a default branch
 * - Create an initial commits
 * - Push to origin
 * @param repositoryUrl he URL of the bare repository.
 * @param branch the branch to initialize.
 */
async function initBareRepo(repositoryUrl: string, branch = 'main') {
  const cwd = tempDir();
  await execa('git', ['clone', '--no-hardlinks', repositoryUrl, cwd], { cwd });
  await gitCheckout(branch, 'create', { cwd });
  await gitCommits(['Initial commit'], { cwd });
  await execa('git', ['push', repositoryUrl, branch], { cwd });
}

/**
 * Create a shallow clone of a git repository and change the current working directory to the cloned repository root.
 * The shallow will contain a limited number of commit and no tags.
 * @param repositoryUrl The path of the repository to clone.
 * @param branch The branch to clone.
 * @param depth The number of commit to clone.
 * @returns The path of the cloned repository.
 */
async function gitShallowClone(repositoryUrl: string, branch = 'main', depth = 1) {
  const cwd = tempDir();

  await execa(
    'git',
    ['clone', '--no-hardlinks', '--no-tags', '-b', branch, '--depth', depth.toString(), repositoryUrl, cwd],
    {
      cwd,
    }
  );
  return cwd;
}
