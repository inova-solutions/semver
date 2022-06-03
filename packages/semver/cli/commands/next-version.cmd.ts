import { Command } from 'commander';
import chalk from 'chalk';
import {
  nextVersion,
  getConfig,
  NextVersionOptions,
  getCurrentBranch,
  getChannel,
  isDetachedHead,
  BaseContext,
} from '../../lib';
import { debug, info } from '../../lib/logger';

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
      'Override the recommended bump by conventional commit analyzer by passing "major", "minor" or "patch"'
    )
    .option('--path <path>', 'Specify the path to calculate recommended bump only with git commits related to the path')
    .option('-f, --outputFile <filePath>', 'Path to the file into which the output should be written')
    .option('-o, --output <output>', 'Set to "json" for a json output instead of standard console logs.')
    .option('-d, --debug', 'Output debugging information');
}

async function handleCommand(options: NextVersionOptions) {
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
  if (isOutputJson) console.log(ctx);

  if (ctx.versions)
    info(!isOutputJson, `next version(s): ${chalk.greenBright.bold(ctx.versions.map((v) => v.tag).join(', '))}`);
}
