import chalk from 'chalk';
import { Command } from 'commander';
import {
  release,
  getConfig,
  nextVersion,
  BumpOptions,
  getCurrentBranch,
  isDetachedHead,
  getChannel,
  BaseContext,
} from '../../lib';
import { debug } from '../../lib/logger';
import { addOptions as addNextVersionOptions } from './next-version.cmd';

/**
 * Adds a subcommand to the program for bumping the version and create a new release.
 * @param program CLI program
 */
export function addBumpCmd(program: Command) {
  const bumpCmd = program
    .command('bump')
    .description('Creates the pending release. Adds the next version tags to git')
    .option('--skipChoreCommit', 'Skip the chore commit with version update. Only the git tags will be created.');

  addNextVersionOptions(bumpCmd).action(handleCommand);
}

async function handleCommand(options: BumpOptions) {
  const isOutputJson = options.output === 'json';
  const config = await getConfig();
  const channel = await getChannel(config);
  const currentBranch = await getCurrentBranch();

  let ctx: BaseContext = {
    config,
    channel,
    currentBranch,
  };
  debug(options.debug, `current branch is ${currentBranch}`);
  debug(options.debug && (await isDetachedHead()), `HEAD is detached: true`);
  debug(options.debug, `release channel is ${chalk.blueBright.bold(channel)}`);

  ctx = await nextVersion(ctx, options);
  const bumpCtx = await release(ctx, options);

  if (bumpCtx && isOutputJson) {
    console.log(bumpCtx);
  }
}
