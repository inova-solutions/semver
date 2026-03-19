import { Command } from 'commander';
import * as lib from '../../lib';
import * as logger from '../../lib/logger';
import { addBumpCmd } from './bump.cmd';

jest.mock('../../lib', () => ({
  release: jest.fn(),
  getConfig: jest.fn(),
  nextVersion: jest.fn(),
  getCurrentBranch: jest.fn(),
  isDetachedHead: jest.fn(),
  getChannel: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('bump command', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('warns when dry-run mode is enabled', async () => {
    jest.spyOn(lib, 'getConfig').mockResolvedValue({} as never);
    jest.spyOn(lib, 'getChannel').mockResolvedValue('beta');
    jest.spyOn(lib, 'getCurrentBranch').mockResolvedValue('main');
    jest.spyOn(lib, 'isDetachedHead').mockResolvedValue(false);
    jest.spyOn(lib, 'nextVersion').mockImplementation(async (ctx: lib.BaseContext) => ({
      ...ctx,
      versions: [{ tag: '1.0.0-beta.2', version: '1.0.0-beta.2' }],
    }));
    jest.spyOn(lib, 'release').mockImplementation(async (ctx: lib.BaseContext) => ctx);

    const program = new Command();
    addBumpCmd(program);

    await program.parseAsync(['node', 'test', 'bump', '--dry-run']);

    expect(logger.warn).toHaveBeenCalledWith('dry-run mode enabled');
    expect(lib.release).toHaveBeenCalledWith(
      expect.objectContaining({
        versions: [{ tag: '1.0.0-beta.2', version: '1.0.0-beta.2' }],
      }),
      expect.objectContaining({ dryRun: true })
    );
  });
});
