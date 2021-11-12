import { Callback } from 'conventional-recommended-bump';

/**
 * Type of version bump, `major`, `minor` or `patch`.
 */
export type ReleaseType = Callback.Recommendation.ReleaseType;
/**
 * Release channel `beta`, `rc` or `stable`.
 */
export type Channel = 'stable' | 'rc' | 'beta';

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

export interface BumpOptions extends NextVersionOptions {
  skipChoreCommit?: boolean;
}
