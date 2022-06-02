import chalk from 'chalk';
import { lastSemverTag } from './git-helpers';
import { debug, info } from './logger';
import { BaseContext, Channel, LastVersionOptions, OutputFormat, VersionResult } from './models';
import { nxAffectedProjects } from './next-version/nx-helpers';
import { writeFile } from './utils';

/**
 * Determine the last version in your repo or your packages in your repo, depending on your workspace type.
 * The workspace type can be defined via the `workspace` option.
 * @param context Context data.
 * @param options The options.
 * @returns Array of tags. Depends on the `workspace` option. If the option is not defined the array will contain only one tag for your repo.
 */
export async function lastVersion(context: BaseContext, options: LastVersionOptions): Promise<BaseContext> {
  const lastTag = await lastSemverTag({ channel: context.channel });

  debug(options.debug, `current version is ${chalk.blueBright.bold(lastTag)}`);

  const packageTags: VersionResult[] = [{ tag: lastTag, version: lastTag }];
  if (options.workspace === 'nx') {
    packageTags.push(...(await lastVersionNx(context.channel, options.output)));
  }
  context.versions = packageTags;

  if (options.outputFile) {
    await writeFile(JSON.stringify(packageTags, undefined, 2), options.outputFile);
  }

  return context;
}

async function lastVersionNx(channel: Channel, outputFormat: OutputFormat): Promise<VersionResult[]> {
  const isOutputJson = outputFormat === 'json';
  const projects = await nxAffectedProjects();
  const nextVersionResult: VersionResult[] = [];

  const getLastVersion = async (project: string) => {
    info(!isOutputJson, `run for ${chalk.bold(project)}`);
    const result = await lastSemverTag({ tagPrefix: `${project}/`, channel });
    if (result?.length) {
      nextVersionResult.push({ project, tag: `${project}/${result}`, version: result });
    }
    const nextProjectIndex = projects.indexOf(project) + 1;
    if (nextProjectIndex < projects.length) {
      await getLastVersion(projects[nextProjectIndex]);
    }
  };

  await getLastVersion(projects[0]);

  return nextVersionResult.filter((r) => !!r);
}
