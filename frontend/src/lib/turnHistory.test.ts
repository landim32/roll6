import { describe, expect, it } from 'vitest';
import { actionLines, mergeTurnPages, newTurnsCount } from './turnHistory';

const item = (turnNo: number, actions = `## Ações\nTurno ${turnNo}\n`) => ({ turnNo, actions, finishedAt: null });

describe('mergeTurnPages', () => {
  it('keeps the newest first without duplicates', () => {
    const merged = mergeTurnPages([item(9), item(8)], [item(10), item(9, 'nova')]);
    expect(merged.map((i) => i.turnNo)).toEqual([10, 9, 8]);
    expect(merged[1].actions).toBe('nova');
  });

  it('appends older pages at the end', () => {
    expect(mergeTurnPages([item(5), item(4)], [item(3), item(2)]).map((i) => i.turnNo)).toEqual([5, 4, 3, 2]);
  });
});

describe('actionLines', () => {
  it('drops the heading and blank lines', () => {
    expect(actionLines('## Ações\nCedric (José): "Ataca"\n\nGM (Ana): Narração: fim\n')).toEqual([
      'Cedric (José): "Ataca"', 'GM (Ana): Narração: fim',
    ]);
  });
});

describe('newTurnsCount', () => {
  it('counts finished turns newer than the loaded ones', () => {
    expect(newTurnsCount(9, 12)).toBe(2);
    expect(newTurnsCount(11, 12)).toBe(0);
    expect(newTurnsCount(null, 3)).toBe(2);
  });
});
