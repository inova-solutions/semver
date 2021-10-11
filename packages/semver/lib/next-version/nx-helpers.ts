import { Task } from '@nrwl/devkit';
import { exec } from 'child_process';

export async function nxAffectedProjects(base: string): Promise<string[]> {
  const baseCmd = 'npx nx print-affected --target=build';
  const cmd = base ? `${baseCmd} --base=${base} --head=HEAD` : `${baseCmd} --all`;

  return new Promise<string[]>((resolve, reject) => {
    exec(cmd, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      const tasks: Task[] = JSON.parse(stdout)?.tasks;
      if (!tasks) {
        reject('The command "nx print-affected" does not return the expected output');
        return;
      }
      resolve(tasks.map((k) => k.target.project));
    });
  });
}
