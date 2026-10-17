import { describe, expect, it } from 'vitest';
import { MAX_WEAPON_NAME, checkWeaponFile, weaponNameFrom } from './weaponFile';

/** The 20-byte header of a glTF 2.0 binary of `size` bytes whose first chunk is JSON. */
const glb = (size: number): File => {
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  bytes.set([0x67, 0x6c, 0x54, 0x46]);
  view.setUint32(4, 2, true);
  view.setUint32(8, size, true);
  view.setUint32(16, 0x4e4f534a, true);
  return new File([bytes], 'espada.glb');
};

describe('weaponFile', () => {
  it('accepts a glTF binary and refuses anything else', async () => {
    expect(await checkWeaponFile(glb(64))).toBeNull();
    expect(await checkWeaponFile(new File([new Uint8Array(64)], 'espada.glb'))).toBe('weapons.fileNotGlb');
    expect(await checkWeaponFile(new File([new Uint8Array(64)], 'espada.png'))).toBe('weapons.fileNotGlb');
  });

  it('suggests the name from the file name', () => {
    expect(weaponNameFrom('Espada longa.GLB')).toBe('Espada longa');
    expect(weaponNameFrom(`${'a'.repeat(150)}.glb`)).toHaveLength(MAX_WEAPON_NAME);
  });
});
