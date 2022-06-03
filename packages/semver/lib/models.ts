import { Callback } from 'conventional-recommended-bump';
import { Config } from './config';

/**
 * Type of version bump, `major`, `minor` or `patch`.
 */
export type ReleaseType = Callback.Recommendation.ReleaseType;
/**
 * Release channel `beta`, `rc` or `stable`.
 */
export type Channel = 'stable' | 'rc' | 'beta';
/**
 * Console output format.
 */
export type OutputFormat = 'default' | 'json';

export interface LastVersionOptions {
  debug?: boolean;
  workspace?: 'nx';
  outputFile?: string;
  output?: OutputFormat;
  channel?: Channel;
}

export interface NextVersionOptions extends Omit<LastVersionOptions, 'channel'> {
  tagPrefix?: string;
  path?: string;
  bump?: ReleaseType;
}

export interface VersionResult {
  project?: string;
  version: string;
  tag: string;
}

export interface BumpOptions extends NextVersionOptions {
  skipChoreCommit?: boolean;
}

export interface BaseContext {
  config: Config;
  channel: Channel;
  currentBranch: string;

  versions?: VersionResult[];
  warning?: string;
  error?: string;
}
