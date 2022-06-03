import { SemVer, valid as validSemver, gt as gtSemver, inc as incSemver, eq as eqSemver } from 'semver';
import { Channel, ReleaseType } from '../models';

/**
 * Calculate the next version based on the current tag and last release.
 * @param version Current version/tag.
 * @param lastRelease The last release tag (for beta channel it can be also a rc tag).
 * @param bump Type of increment, major, minor or patch.
 * @param channel Release channel, beta, rc or release.
 * @param isSwitchingToStable Indicates if its the first stable release in a release branch
 * @returns The new version.
 */
export function increment(
  version: string,
  lastRelease: string,
  bump: ReleaseType,
  channel: Channel,
  isSwitchingToStable = false
): string {
  if (!version && !lastRelease) {
    return channel === 'stable' ? '1.0.0' : `1.0.0-${channel}.1`;
  } else if (!version) {
    version = lastRelease;
  }
  lastRelease = !lastRelease ? '0.0.0' : lastRelease;

  if (validSemver(version) === null) {
    throw new Error(`version ${version} is not a valid semver`);
  }
  if (validSemver(lastRelease) === null) {
    throw new Error(`version ${lastRelease} is not a valid semver`);
  }

  const currentVersion = new SemVer(version, { includePrerelease: true });
  const lastReleaseVersion = new SemVer(lastRelease, { includePrerelease: true });

  if (isSwitchingToStable && channel === 'stable') {
    return `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`;
  }

  if (channel === 'beta' || channel === 'rc') {
    return incrementPrerelease(currentVersion, lastReleaseVersion, bump, channel);
  }

  return incrementRelease(currentVersion, lastReleaseVersion, bump);
}

function incrementPrerelease(currentVersion: SemVer, lastRelease: SemVer, bump: ReleaseType, channel: Channel): string {
  // get the higher version
  const lastTag = gtSemver(currentVersion, lastRelease, { includePrerelease: true }) ? currentVersion : lastRelease;
  const lastVersionIsPrerelease = lastTag.prerelease[0] === channel;
  const noStableRelease = eqSemver(lastRelease, '0.0.0');

  if (lastVersionIsPrerelease && noStableRelease) {
    return incSemver(lastTag, 'prerelease');
  }

  // bump from beta
  if (lastVersionIsPrerelease) {
    return currentVersion[bump] === lastRelease[bump] && lastRelease.major >= currentVersion.major && bump !== 'patch'
      ? `${incSemver(currentVersion, bump)}-${channel}.1`
      : incSemver(lastTag, 'prerelease');
  }

  // bump from release or rc
  const nextVersion = incSemver(cutPrerelease(lastRelease), bump);
  return `${nextVersion}-${channel}.1`;
}

function incrementRelease(currentVersion: SemVer, lastRelease: SemVer, bump: ReleaseType): string {
  if (lastRelease.version === '0.0.0') {
    return '1.0.0';
  }
  const currentVersionIsPrerelease = currentVersion.prerelease?.length > 0;
  if (currentVersionIsPrerelease) return cutPrerelease(currentVersion).version;

  if (bump === 'major' || bump === 'minor')
    throw new Error('only patches are allowed, if branch has switched from rc to stable');

  return incSemver(lastRelease, bump);
}

function cutPrerelease(version: SemVer): SemVer {
  return new SemVer(`${version.major}.${version.minor}.${version.patch}`);
}
