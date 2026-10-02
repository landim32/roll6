import { describe, expect, it } from 'vitest';
import { mergeTurnPages, newTurnsCount, turnLogMarkdown } from './turnHistory';

const item = (turnNo: number, actions = `GM (Ana):\n\nTexto ${turnNo}\n`, turnId = turnNo) =>
  ({ turnId, turnNo, actions, finishedAt: null });

describe('mergeTurnPages', () => {
  it('keeps the newest first without duplicates', () => {
    const merged = mergeTurnPages([item(9), item(8)], [item(10), item(9, 'nova')]);
    expect(merged.map((i) => i.turnNo)).toEqual([10, 9, 8]);
    expect(merged[1].actions).toBe('nova');
  });

  it('appends older pages at the end', () => {
    expect(mergeTurnPages([item(5), item(4)], [item(3), item(2)]).map((i) => i.turnNo)).toEqual([5, 4, 3, 2]);
  });

  it('keeps every narration of the same turn', () => {
    // One turn narrated twice, and the turn in progress on top: deduplicating by turnNo would silently drop one of
    // them, which is exactly the defect the list is keyed by entry to avoid.
    const merged = mergeTurnPages([item(11, 'b', 202), item(11, 'a', 201)], [item(12, 'c', 210)]);
    expect(merged.map((i) => i.turnId)).toEqual([210, 202, 201]);
    expect(merged.map((i) => i.turnNo)).toEqual([12, 11, 11]);
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
  it('counts the turns newer than the newest listed, plus that one to re-read', () => {
    // Newest listed is 9 and the table moved to 12: read 12, 11, 10 and 9 again — 9 was shown as the turn in
    // progress and may have received its closing narration since.
    expect(newTurnsCount(9, 12)).toBe(4);
    expect(newTurnsCount(11, 12)).toBe(2);
    // Nothing listed yet (every turn so far was hidden): a page from the turn in progress down to turn 1.
    expect(newTurnsCount(null, 3)).toBe(4);
  });
});
