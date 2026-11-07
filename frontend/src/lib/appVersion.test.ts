import { describe, expect, it } from 'vitest';
import { buildVersion, versionJson } from './appVersion';

describe('appVersion', () => {
  const date = new Date(Date.UTC(2026, 10, 7, 8, 5, 3));

  it('is the UTC build time plus a short suffix', () => {
    expect(buildVersion(date, () => 0)).toBe('20261107080503-0000');
    expect(buildVersion(date, () => 0.5)).toMatch(/^20261107080503-[0-9a-z]{4}$/);
  });

  it('differs between two builds of the same second', () => {
    expect(buildVersion(date, () => 0.1)).not.toBe(buildVersion(date, () => 0.2));
  });

  it('writes the version file', () => {
    expect(JSON.parse(versionJson('x-1'))).toEqual({ version: 'x-1' });
  });
});
