import { writeFile as _writeFile } from 'fs';

export async function writeFile(data: string, path: string) {
  return new Promise<void>((resolve, reject) => {
    _writeFile(path, data, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
