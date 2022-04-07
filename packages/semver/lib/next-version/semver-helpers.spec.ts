import { increment } from './semver-helpers';
describe('semver-helpers, increment beta channel', () => {
  it('first beta build, no existing stable build', () => {
    expect(increment(null, null, 'patch', 'beta')).toEqual('1.0.0-beta.1');
  });
  it('second beta build, no existing stable build', () => {
    expect(increment('1.0.0-beta.1', null, 'patch', 'beta')).toEqual('1.0.0-beta.2');
  });
  it('first patch for beta after final release', () => {
    expect(increment('1.0.0-beta.1', '1.0.0', 'patch', 'beta')).toEqual('1.0.1-beta.1');
  });
  it('second patch for beta', () => {
    expect(increment('1.0.1-beta.1', '1.0.0', 'patch', 'beta')).toEqual('1.0.1-beta.2');
  });
  it('first feature, after some patches', () => {
    expect(increment('1.0.1-beta.2', '1.0.0', 'minor', 'beta')).toEqual('1.1.0-beta.1');
  });
  it('second feature, without a new release in the meantime', () => {
    expect(increment('1.1.0-beta.1', '1.0.0', 'minor', 'beta')).toEqual('1.1.0-beta.2');
  });
  it('first patch, after a rc release', () => {
    expect(increment('1.1.0-beta.2', '1.1.0-rc.1', 'patch', 'beta')).toEqual('1.1.1-beta.1');
  });
  it('second patch, after a rc release', () => {
    expect(increment('1.1.1-beta.1', '1.1.0-rc.1', 'patch', 'beta')).toEqual('1.1.1-beta.2');
  });
  it('breaking change after a rc release', () => {
    expect(increment('1.1.1-beta.1', '1.1.0-rc.1', 'major', 'beta')).toEqual('2.0.0-beta.1');
  });
  it('second breaking change', () => {
    expect(increment('2.0.0-beta.1', '1.1.0-rc.1', 'major', 'beta')).toEqual('2.0.0-beta.2');
  });
  it('patch after breaking change when rc is 1.0.0-rc.1 ', () => {
    expect(increment('2.0.0-beta.1', '1.0.0-rc.1', 'patch', 'beta')).toEqual('2.0.0-beta.2');
  });
});

describe('semver-helpers, increment rc builds in release channel', () => {
  it('first rc release', () => {
    expect(increment(null, null, 'patch', 'rc')).toEqual('1.0.0-rc.1');
  });
  it('second rc release', () => {
    expect(increment('1.0.0-rc.1', null, 'patch', 'rc')).toEqual('1.0.0-rc.2');
  });
  it('first feature in rc, no stable release', () => {
    expect(increment('1.0.0-rc.2', null, 'minor', 'rc')).toEqual('1.0.0-rc.3');
  });
  it('first breaking change in rc, no stable release', () => {
    expect(increment('1.0.0-rc.3', null, 'minor', 'rc')).toEqual('1.0.0-rc.4');
  });
  it('first patch after first release', () => {
    expect(increment('1.0.0-rc.4', '1.0.0', 'patch', 'rc')).toEqual('1.0.1-rc.1');
  });
  it('second patch after first release', () => {
    expect(increment('1.0.1-rc.1', '1.0.0', 'patch', 'rc')).toEqual('1.0.1-rc.2');
  });
  it('first feature after first release', () => {
    expect(increment('1.0.1-rc.2', '1.0.0', 'minor', 'rc')).toEqual('1.1.0-rc.1');
  });
  it('second feature after first release', () => {
    expect(increment('1.1.0-rc.1', '1.0.0', 'minor', 'rc')).toEqual('1.1.0-rc.2');
  });
  it('first breaking change after the first stable release', () => {
    expect(increment('1.1.0-rc.1', '1.0.0', 'major', 'rc')).toEqual('2.0.0-rc.1');
  });
});

describe('semver-helpers, increment release builds in release channel', () => {
  it('first release', () => {
    expect(increment(null, null, 'patch', 'stable')).toEqual('1.0.0');
  });
  it('patch switch from rc', () => {
    expect(increment('1.0.1-rc.1', '1.0.0', 'patch', 'stable', true)).toEqual('1.0.1');
  });
  it('hotfix', () => {
    expect(increment('1.0.0', '1.0.0', 'patch', 'stable')).toEqual('1.0.1');
  });

  it('new feat same release should fail', () => {
    expect(() => increment('1.0.0', '1.0.0', 'minor', 'stable')).toThrowError(
      'only patches are allowed, if branch has switched from rc to stable'
    );
  });
  it('new breaking change in an existing release should fail', () => {
    expect(() => increment('1.0.0', '1.0.0', 'major', 'stable')).toThrowError(
      'only patches are allowed, if branch has switched from rc to stable'
    );
  });
});
