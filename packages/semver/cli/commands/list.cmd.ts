import { Command } from 'commander';
import { getBranchRelatedTags, getAllTags } from '../../lib';

/**
 * Adds a subcommand to the program for listing the existing tags.
 * @param program CLI program
 */
export function addListCmd(program: Command) {
  program
    .command('list')
    .description('Show existing tags in your repo')
    .option('-a, --all', 'show all semver tags')
    .option('-b, --branch', 'show branch related semver tags')
    .action(handleCommand);
}

async function handleCommand(options: { all: boolean; branch: boolean }) {
  if (options.all && options.branch)
    throw new Error('You can either show all tags or those from the branch, but not both at the same time.');

  if (options.all) console.log(await getAllTags({}));
  else if (options.branch) console.log(await getBranchRelatedTags({ }));
  else (this as Command).outputHelp();
}
