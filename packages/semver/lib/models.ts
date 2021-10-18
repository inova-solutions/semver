import { ReleaseType } from './conventional-changelog/conventional-commits';

export interface NextVersionOptions {
  tagPrefix?: string;
  path?: string;
  debug?: boolean;
  workspace?: 'nx';
  bump?: ReleaseType;
  outputFile?: string;
}

export interface NextVersionResult {
  project?: string;
  version: string;
  tag: string;
}
