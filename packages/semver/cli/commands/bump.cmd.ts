import chalk from 'chalk';
import { Command } from 'commander';
import { release, getConfig, nextVersion, NextVersionOptions, getCurrentBranch, isDetachedHead, getChannel } from '../../lib';
import { debug } from '../../lib/logger';
import { addOptions as addNextVersionOptions } from './next-version.cmd';

/**
 * Adds a subcommand to the program for bumping the version and create a new release.
 * @param program CLI program
 */
export function addBumpCmd(program: Command) {
  addNextVersionOptions(program.command('bump').description('Creates the pending release. Adds the next version tags to git')).action(handleCommand);
}

async function handleCommand(options: NextVersionOptions) {
  const config = await getConfig();
  const channel = await getChannel(config);

  debug(options.debug, `current branch: ${await getCurrentBranch()}`);
  debug(options.debug && (await isDetachedHead()), `HEAD is detached: true`);
  debug(options.debug, `release channel is ${chalk.blueBright.bold(channel)}`);

  const versions = await nextVersion(config, options);
  await release(options, versions);
}
