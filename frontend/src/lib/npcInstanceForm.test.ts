import { describe, expect, it } from 'vitest';
import { fromPiece, MAX_INSTANCE_NAME, MAX_INSTANCE_STATUS, toUpdateInfo, validateInstance } from './npcInstanceForm';
import type { InstanceForm } from './npcInstanceForm';
import type { MapTokenInfo } from '../types/mapToken';

const form = (changes: Partial<InstanceForm> = {}): InstanceForm => ({
  name: 'Guarda 2', currentLife: '7', currentEnergy: '2', currentMove: '6', status: '', posture: '1', ...changes,
});
const totals = { totalLife: 10, totalEnergy: 5 };

describe('051: validateInstance', () => {
  it.each([
    [{ name: '  ' }, 'nameRequired'],
    [{ name: 'a'.repeat(MAX_INSTANCE_NAME + 1) }, 'nameTooLong'],
    [{ currentLife: '1.5' }, 'notInteger'],
    [{ currentEnergy: '' }, 'notInteger'],
    [{ currentMove: 'x' }, 'notInteger'],
    [{ currentMove: '-1' }, 'negativeMove'],
    [{ currentLife: '11' }, 'lifeAboveTotal'],
    [{ currentEnergy: '6' }, 'energyAboveTotal'],
    [{ status: 'x'.repeat(MAX_INSTANCE_STATUS + 1) }, 'statusTooLong'],
  ])('rejects %j with %s', (changes, error) => {
    expect(validateInstance(form(changes), totals)).toBe(error);
  });

  it('accepts negative life and energy (fallen) and a zero move', () => {
    expect(validateInstance(form({ currentLife: '-3', currentEnergy: '0', currentMove: '0' }), totals)).toBeNull();
  });
});

describe('051: fromPiece and toUpdateInfo', () => {
  it('seeds the form from the piece and builds the PUT body', () => {
    const piece = { name: 'Capitão', life: 3, energy: 2, move: 2, status: 'ferido', posture: 2 } as MapTokenInfo;
    const seeded = fromPiece(piece);
    expect(seeded).toEqual({ name: 'Capitão', currentLife: '3', currentEnergy: '2', currentMove: '2', status: 'ferido', posture: '2' });
    expect(toUpdateInfo({ ...seeded, name: ' Capitão ', status: '  ' }))
      .toEqual({ name: 'Capitão', currentLife: 3, currentEnergy: 2, currentMove: 2, status: null, posture: 2 });
  });

  it('a piece without posture (object) seeds standing, an unknown posture value saves standing', () => {
    expect(fromPiece({ name: 'x', life: 1, energy: 1, move: 1, status: null, posture: null } as MapTokenInfo).posture).toBe('1');
    expect(toUpdateInfo(form({ posture: '9' })).posture).toBe(1);
  });
});
