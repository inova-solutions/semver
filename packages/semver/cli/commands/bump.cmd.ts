import { Command } from 'commander';
import { bump, getConfig, nextVersion, NextVersionOptions } from '../../lib';
import { addOptions as addNextVersionOptions } from './next-version.cmd';

/**
 * Adds a subcommand to the program for listing the existing tags.
 * @param program CLI program
 */
export function addBumpCmd(program: Command) {
  addNextVersionOptions(program.command('bump').description('Bump version')).action(handleCommand);
}

async function handleCommand(options: NextVersionOptions) {
  const config = await getConfig();

  const versions = await nextVersion(config, options);
  await bump(options, versions);
}
