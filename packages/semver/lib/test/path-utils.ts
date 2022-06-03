import { tmpdir } from 'os';
import { realpathSync, mkdtempSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

export function tempDir() {
  const prefix = join(tmpdir(), 'semver');
  if (!existsSync(prefix)) {
    mkdirSync(prefix, { recursive: true });
  }
  return realpathSync(mkdtempSync(prefix));
}

export function fileUrl(filePath: string) {
  if (typeof filePath !== 'string') {
    throw new TypeError(`Expected a string, got ${typeof filePath}`);
  }

  let pathName = resolve(filePath);
  pathName = pathName.replace(/\\/g, '/');

  // Windows drive letter must be prefixed with a slash.
  if (pathName[0] !== '/') {
    pathName = `/${pathName}`;
  }

  // Escape required characters for path components.
  // See: https://tools.ietf.org/html/rfc3986#section-3.3
  return encodeURI(`file://${pathName}`).replace(/[?#]/g, encodeURIComponent);
}
