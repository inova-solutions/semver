import { Command } from 'commander';
import chalk from 'chalk';
import { lastVersion, getConfig, NextVersionOptions, getCurrentBranch, getChannel, isDetachedHead } from '../../lib';
import { debug, info } from '../../lib/logger';

/**
 * Adds a subcommand to the program for emitting the last version.
 * @param program CLI program
 */
export function addLastVersionCmd(program: Command) {
  addOptions(program.command('last-version').description('Show the version of the last release')).action(
    handleCommand
  );
}

export function addOptions(cmd: Command): Command {
  return cmd
    .option(
      '-w, --workspace <repoType>',
      'Specify your repo type. Ignore this option if you have only one project in your repo. Or pass "nx" if you are using nx workspace'
    )
    .option('-f, --outputFile <filePath>', 'Path to the file into which the output should be written')
    .option('-d, --debug', 'Output debugging information');
}

async function handleCommand(options: NextVersionOptions) {
  const config = await getConfig();
  const channel = await getChannel(config);

  debug(options.debug, `current branch is ${await getCurrentBranch()}`);
  debug(options.debug && (await isDetachedHead()), `HEAD is detached: true`);
  debug(options.debug, `release channel is ${chalk.blueBright.bold(channel)}`);

  const version = await lastVersion(config, options);
  if (version) info(`last version(s): ${chalk.greenBright.bold(version.map((v) => v.tag).join(', '))}`);
}
