import { Command } from 'commander';
import chalk from 'chalk';
import {
  lastVersion,
  getConfig,
  getCurrentBranch,
  getChannel,
  isDetachedHead,
  BaseContext,
  LastVersionOptions,
} from '../../lib';
import { debug, info } from '../../lib/logger';

/**
 * Adds a subcommand to the program for emitting the last version.
 * @param program CLI program
 */
export function addLastVersionCmd(program: Command) {
  addOptions(program.command('last-version').description('Show the version of the last release')).action(handleCommand);
}

export function addOptions(cmd: Command): Command {
  return cmd
    .option(
      '-w, --workspace <repoType>',
      'Specify your repo type. Ignore this option if you have only one project in your repo. Or pass "nx" if you are using nx workspace'
    )
    .option(
      '-c, --channel <channel>',
      'Channel from which the version is to be determined. If not set, the current branch is used.'
    )
    .option('-f, --outputFile <filePath>', 'Path to the file into which the output should be written')
    .option(
      '-t, --projectType <projectType>',
      'Filtering project by type can be set to `app` oder `lib`. Works only with nx workspaces.'
    )
    .option('-o, --output <output>', 'Set to "json" for a json output instead of standard console logs.')
    .option('-d, --debug', 'Output debugging information');
}

async function handleCommand(options: LastVersionOptions) {
  const isOutputJson = options.output === 'json';
  const config = await getConfig();
  const channel = options.channel ?? (await getChannel(config));
  const currentBranch = await getCurrentBranch();

  let ctx: BaseContext = {
    config,
    channel,
    currentBranch,
  };

  debug(options.debug, `current branch is ${ctx.currentBranch}`);
  debug(options.debug && (await isDetachedHead()), `HEAD is detached: true`);
  debug(options.debug, `release channel is ${chalk.blueBright.bold(channel)}`);

  ctx = await lastVersion(ctx, options);
  if (isOutputJson) console.log(ctx);
  if (ctx.versions)
    info(!isOutputJson, `last version(s): ${chalk.greenBright.bold(ctx.versions.map((v) => v.tag).join(', '))}`);
}
