import { describe, expect, it } from 'vitest';
import { hasWeapons, weaponItems } from './editorWeapons';

const weapon = (socket: 1 | 2 | 3 | 4 | 5, name: string | null, modelFileUrl: string | null = 'https://x/w.glb') =>
  ({ socket, name, modelFileUrl });

describe('editor weapons (092)', () => {
  it('names each weapon with its socket, ordered by socket', () => {
    const token = { weapons: [weapon(2, 'Escudo'), weapon(1, 'Espada longa'), weapon(3, 'Arco')] };
    expect(weaponItems(token)).toEqual(['Espada longa (mão direita)', 'Escudo (mão esquerda)', 'Arco (costas)']);
    expect(hasWeapons(token)).toBe(true);
  });

  it('skips weapons without a file and tokens without weapons', () => {
    expect(weaponItems({ weapons: [weapon(1, 'Espada', null)] })).toEqual([]);
    expect(hasWeapons({ weapons: [] })).toBe(false);
    expect(hasWeapons(null)).toBe(false);
    expect(weaponItems({ weapons: [weapon(4, null)] })).toEqual(['arma (coldre direito)']);
  });
});
