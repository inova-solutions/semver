import { Command } from 'commander';
import { release, getConfig, nextVersion, NextVersionOptions } from '../../lib';
import { addOptions as addNextVersionOptions } from './next-version.cmd';

/**
 * Adds a subcommand to the program for bumping the version and create a new release.
 * @param program CLI program
 */
export function addBumpCmd(program: Command) {
  addNextVersionOptions(program.command('bump').description('Bump version')).action(handleCommand);
}

async function handleCommand(options: NextVersionOptions) {
  const config = await getConfig();

  const versions = await nextVersion(config, options);
  await release(options, versions);
}
