import { SOCKET, SOCKETS } from '../types/weapon';
import type { Socket, TokenWeapon } from '../types/weapon';

/**
 * The weapons of the token shown in the animation editor (092): their pt-BR names for the print caption and the
 * Claude's context, and the stage's "Armas" toggle remembered per device.
 */

/** Where each socket is, as the caption and the Claude read it. */
export const SOCKET_LABEL: Record<Socket, string> = {
  [SOCKET.rightHand]: 'mão direita',
  [SOCKET.leftHand]: 'mão esquerda',
  [SOCKET.back]: 'costas',
  [SOCKET.rightHolster]: 'coldre direito',
  [SOCKET.leftHolster]: 'coldre esquerdo',
};

interface TokenWithWeapons {
  weapons?: readonly Pick<TokenWeapon, 'socket' | 'name' | 'modelFileUrl'>[] | null;
}

/** The weapons the stage can draw: with a file, in a known socket, ordered by socket. */
const drawable = (token: TokenWithWeapons | null | undefined) =>
  (token?.weapons ?? [])
    .filter((weapon) => !!weapon.modelFileUrl && SOCKETS.includes(weapon.socket))
    .sort((a, b) => a.socket - b.socket);

/** "Espada longa (mão direita)" per weapon, ordered by socket. */
export const weaponItems = (token: TokenWithWeapons | null | undefined): string[] =>
  drawable(token).map((weapon) => `${weapon.name?.trim() || 'arma'} (${SOCKET_LABEL[weapon.socket]})`);

export const hasWeapons = (token: TokenWithWeapons | null | undefined): boolean => drawable(token).length > 0;

/** The stage's "Armas" toggle, per device: on unless turned off. */
export const EDITOR_WEAPONS_KEY = 'roll6:editor-weapons';

export const readWeaponsToggle = (): boolean => {
  try {
    return localStorage.getItem(EDITOR_WEAPONS_KEY) !== 'off';
  } catch {
    return true;
  }
};

export const writeWeaponsToggle = (on: boolean): void => {
  try {
    localStorage.setItem(EDITOR_WEAPONS_KEY, on ? 'on' : 'off');
  } catch {
    // The choice is only forgotten.
  }
};
