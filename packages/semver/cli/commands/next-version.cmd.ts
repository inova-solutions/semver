import { Command } from 'commander';
import chalk from 'chalk';
import { nextVersion, getConfig, NextVersionOptions } from '../../lib';
import { info } from '../../lib/logger';

/**
 * Adds a subcommand to the program for emitting the next version.
 * @param program CLI program
 */
export function addNextVersionCmd(program: Command) {
  addOptions(program.command('next-version').description('Show the version for the pending release')).action(
    handleCommand
  );
}

export function addOptions(cmd: Command): Command {
  return cmd
    .option(
      '-w, --workspace <repoType>',
      'Specify your repo type. Ignore this option if you have only one project in your repo. Or pass "nx" if you are using nx workspace'
    )
    .option('-p, --tagPrefix <prefix>', 'Specify a prefix for the git tag to be ignored from the semver checks')
    .option(
      '-b, --bump <bumpType>',
      'You can pass "major", "minor" or "patch" if you want override the recommended bump by conventional commit analyzer'
    )
    .option('--path <path>', 'Specify the path to only calculate with git commits related to the path')
    .option('-d, --debug', 'Output debugging information');
}

async function handleCommand(options: NextVersionOptions) {
  const config = await getConfig();

  const version = await nextVersion(config, options);
  if (version) info(`next version(s): ${chalk.greenBright.bold(version.join(', '))}`);
}
