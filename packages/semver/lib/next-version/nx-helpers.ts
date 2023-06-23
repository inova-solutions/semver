import { exec } from 'child_process';
import { ProjectType } from '../models';

export async function nxAffectedProjects(base?: string, type: ProjectType = 'all'): Promise<string[]> {
  let baseCmd = 'npx nx show projects';
  if (type !== 'all') baseCmd = `${baseCmd} --pattern=*-${type}`;
  const cmd = base ? `${baseCmd} --affected --base=${base} --head=HEAD` : `${baseCmd}`;

  return new Promise<string[]>((resolve, reject) => {
    exec(cmd, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      const projects: string[] = stdout.split('\n');
      if (!projects) {
        reject('The command "nx print-affected" does not return the expected output');
        return;
      }
      resolve(projects.filter(p => !!p));
    });
  });
}
