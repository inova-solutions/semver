import * as fs from 'fs';

export function mockExistsSync(returnValue: boolean): void {
  jest.replaceProperty(fs, 'existsSync', jest.fn().mockReturnValue(returnValue));
}

export function mockReadFile(err: NodeJS.ErrnoException, data: unknown): void {
  jest.spyOn(fs, 'readFile').mockImplementation((_, callback) => {
    (callback as any)(null, Buffer.from(JSON.stringify(data)));
  });
}
