import { Command } from 'commander';
import chalk from 'chalk';
import { nextVersion, getConfig } from '../../lib';

/**
 * Adds a subcommand to the program for emitting the next version.
 * @param program CLI program
 */
export function addNextVersionCmd(program: Command) {
  program
    .command('next-version')
    .description('show the version for the pending release')
    .option('-p, --prefix <prefix>', 'specify a prefix for the git tag to be ignored from the semver checks')
    .option('-d, --debug', 'Output debugging information')
    .action(handleCommand);
}

async function handleCommand(options: { prefix: string }) {
  const config = await getConfig();

  const version = await nextVersion(config, { tagPrefix: options.prefix });
  console.log(`next version: ${chalk.greenBright.bold(version)}`);
}
