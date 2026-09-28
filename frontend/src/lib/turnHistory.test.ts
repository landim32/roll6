import { describe, expect, it } from 'vitest';
import { mergeTurnPages, newTurnsCount, turnLogMarkdown } from './turnHistory';

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

describe('turnLogMarkdown', () => {
  it('keeps each log line when the text is rendered as markdown', () => {
    expect(turnLogMarkdown('## Ações\nCedric (José): "Ataca"\nGM (Ana): Narração: fim\n')).toBe(
      '## Ações  \nCedric (José): "Ataca"  \nGM (Ana): Narração: fim  \n',
    );
  });

  it('keeps a blank line as a paragraph break', () => {
    expect(turnLogMarkdown('## Ações\nUma\n\nDuas\n')).toBe('## Ações  \nUma\n\nDuas  \n');
  });

  it('normalizes Windows line endings', () => {
    expect(turnLogMarkdown('## Ações\r\nCedric\r\n')).toBe('## Ações  \nCedric  \n');
  });
});

describe('newTurnsCount', () => {
  it('counts finished turns newer than the loaded ones', () => {
    expect(newTurnsCount(9, 12)).toBe(2);
    expect(newTurnsCount(11, 12)).toBe(0);
    expect(newTurnsCount(null, 3)).toBe(2);
  });
});
