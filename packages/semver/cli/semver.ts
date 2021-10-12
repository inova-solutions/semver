#!/usr/bin/env node
import { Command } from 'commander';
import { textSync as figletText } from 'figlet';
import chalk from 'chalk';
import { lt as ltSemver } from 'semver';
import { addListCmd } from './commands/list.cmd';
import { addNextVersionCmd } from './commands/next-version.cmd';
import { CLI_NAME, getGitVersion, MIN_GIT_VERSION } from '../lib';
import { version } from '../package.json';
import { addBumpCmd } from './commands/bump.cmd';

main();

async function main() {
  try {
    // check conditions
    const gitVersion = await checkGitVersion();

    // init program
    const program = createProgram(gitVersion);

    // add commands
    addListCmd(program);
    addNextVersionCmd(program);
    addBumpCmd(program);

    // run
    await program.parseAsync();

    // show help if no command and no options passed
    if (!process.argv.slice(2).length) {
      console.clear();
      program.outputHelp();
    }
  } catch (error) {
    console.log(chalk.red(error));
    process.exit(1);
  }
}

function createProgram(gitVersion: string) {
  const program = new Command();
  program.enablePositionalOptions();
  program.passThroughOptions();
  program.addHelpText('beforeAll', chalk.magenta(figletText(CLI_NAME, { horizontalLayout: 'fitted' })));
  program.addHelpText('before', chalk.magenta.bold('                                           inova:solutions'));
  program.addHelpText('before', chalk.whiteBright.bold('----------------------------------------------------------'));
  program.addHelpText('before', chalk.whiteBright.bold(`git:         v${gitVersion}`));
  program.addHelpText('before', chalk.whiteBright.bold(`node:        ${process.version}`));
  program.addHelpText('before', chalk.whiteBright.bold(`${CLI_NAME}:  v${version}`));
  program.addHelpText('before', chalk.whiteBright.bold('----------------------------------------------------------'));

  return program;
}

async function checkGitVersion(): Promise<string> {
  const gitVersion = await getGitVersion();
  if (ltSemver(gitVersion, MIN_GIT_VERSION)) {
    console.log(chalk.red(`[${CLI_NAME}]: Git version ${MIN_GIT_VERSION} is required. Found ${gitVersion}.`));
    process.exit(1);
  }
  return gitVersion;
}
