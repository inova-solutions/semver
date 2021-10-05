import * as fs from 'fs';

export function mockExistsSync(returnValue: boolean): void {
  jest.spyOn(fs, 'existsSync').mockReturnValue(returnValue);
}

export function mockReadFile(err: NodeJS.ErrnoException, data: unknown): void {
  jest.spyOn(fs, 'readFile').mockImplementation((_, callback) => {
    callback(null, JSON.stringify(data) as unknown as Buffer);
  });
}
