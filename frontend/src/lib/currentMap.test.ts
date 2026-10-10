import { describe, expect, it } from 'vitest';
import { canMakeCurrent } from './currentMap';
import { MAP_STATUS_ACTIVE, MAP_STATUS_ARCHIVED, MAP_STATUS_DELETED } from '../types/map';

describe('canMakeCurrent', () => {
  const master = { isMaster: true, currentMapId: 1 };

  it('offers the action to the master on another active map', () => {
    expect(canMakeCurrent({ mapId: 2, status: MAP_STATUS_ACTIVE }, master)).toBe(true);
    expect(canMakeCurrent({ mapId: 2, status: MAP_STATUS_ACTIVE }, { isMaster: true, currentMapId: null })).toBe(true);
  });

  it('never on the current map, an archived or deleted map, or for a player', () => {
    expect(canMakeCurrent({ mapId: 1, status: MAP_STATUS_ACTIVE }, master)).toBe(false);
    expect(canMakeCurrent({ mapId: 2, status: MAP_STATUS_ARCHIVED }, master)).toBe(false);
    expect(canMakeCurrent({ mapId: 2, status: MAP_STATUS_DELETED }, master)).toBe(false);
    expect(canMakeCurrent({ mapId: 2, status: MAP_STATUS_ACTIVE }, { isMaster: false, currentMapId: 1 })).toBe(false);
  });
});
