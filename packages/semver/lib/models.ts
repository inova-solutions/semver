import { Callback } from 'conventional-recommended-bump';

/**
 * Type of version bump, `major`, `minor` or `patch`.
 */
export type ReleaseType = Callback.Recommendation.ReleaseType;
/**
 * Release channel `beta`, `rc` or `stable`.
 */
export type Channel = 'stable' | 'rc' | 'beta';

export interface LastVersionOptions {
  debug?: boolean;
  workspace?: 'nx';
  outputFile?: string;
}

export interface NextVersionOptions extends LastVersionOptions {
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
