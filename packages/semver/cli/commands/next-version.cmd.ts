import { Command } from 'commander';
import chalk from 'chalk';
import {
  conventionalRecommendedBump,
  getAllTags,
  getConfig,
  isBetaBranch,
  lastSemverTag,
  increment,
  Channel,
} from '../../lib';

/**
 * Adds a subcommand to the program for emitting the next version.
 * @param program CLI program
 */
export function addNextVersionCmd(program: Command) {
  program
    .command('next-version')
    .description('show the version for the pending release')
    .option('-p, --prefix <prefix>', 'specify a prefix for the git tag to be ignored from the semver checks')
    .action(handleCommand);
}

async function handleCommand(options: { prefix: string }) {
  const config = await getConfig();
  const channel: Channel = (await isBetaBranch()) ? 'beta' : config.releaseCandidate ? 'rc' : 'stable';

  console.log(`release channel: ${chalk.greenBright.bold(channel)}`);

  const recommendedBump = await conventionalRecommendedBump({
    tagPrefix: options.prefix,
    preset: config.commitMessageFormat,
  });

  if(recommendedBump === undefined) return;

  let lastTag: string;
  let lastReleaseTag: string;

  if (channel === 'beta') {
    lastTag = await lastSemverTag({ channel });
    lastReleaseTag = (await getAllTags({})).filter((v) => !v.includes(channel))[0];
  } else if (channel === 'rc') {
    lastTag = await lastSemverTag({ channel });
    lastReleaseTag = (await getAllTags({ skipUnstable: true }))[0];
  } else if (channel === 'stable') {
    lastTag = await lastSemverTag({});
    lastReleaseTag = (await getAllTags({ skipUnstable: true }))[0];
  }

  console.log(`current version: ${chalk.blueBright.bold(lastTag)}`);
  console.log(`last release: ${chalk.blueBright.bold(lastReleaseTag)}`);

  const nextTag = increment(lastTag, lastReleaseTag, recommendedBump, channel);
  console.log(`next version: ${chalk.greenBright.bold(nextTag)}`);

  console.log(recommendedBump);
}
