import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Group } from 'three';
import { DEFAULT_GRIP } from '../../lib/weaponGrip';
import { DEFAULT_GRIP_POINT, DEFAULT_POSE } from '../../lib/weaponPose';
import { SOCKET } from '../../types/weapon';
import type { SocketWeapon } from '../../types/weapon';

const { attachWeapons, placeWeapon, pending } = vi.hoisted(() => ({
  attachWeapons: vi.fn<(...args: unknown[]) => undefined>(),
  placeWeapon: vi.fn<(...args: unknown[]) => boolean>(() => true),
  pending: new Map<string, { resolve: (asset: unknown) => void }>(),
}));

vi.mock('./attachWeapons', () => ({ attachWeapons, placeWeapon }));
vi.mock('./loadWeapon', () => ({
  loadWeapon: (url: string) => new Promise((resolve) => { pending.set(url, { resolve }); }),
  cloneWeapon: () => new Group(),
}));

import { createWeaponSockets, sameSocketWeapons, weaponKey } from './weaponSockets';

const asset = { scene: new Group(), size: { x: 0.1, y: 1, z: 0.1 }, min: [0, 0, 0] };
const want = (url: string, extra: Partial<SocketWeapon> = {}): SocketWeapon => ({
  url, gripPoint: DEFAULT_GRIP_POINT, pose: DEFAULT_POSE, grip: DEFAULT_GRIP, ...extra,
});
const flush = () => new Promise((resolve) => { setTimeout(resolve, 0); });

describe('weaponSockets', () => {
  beforeEach(() => {
    attachWeapons.mockClear();
    placeWeapon.mockClear();
    pending.clear();
  });

  it('identifies a file by its stored name and compares every part of a socket', () => {
    expect(weaponKey('https://x/roll6/0123456789abcdef0123456789abcdef.glb?X-Amz=1')).toBe('0123456789abcdef0123456789abcdef.glb');
    const a = { [SOCKET.rightHand]: want('https://x/roll6/0123456789abcdef0123456789abcdef.glb?a=1') };
    const b = { [SOCKET.rightHand]: want('https://x/roll6/0123456789abcdef0123456789abcdef.glb?a=2') };
    expect(sameSocketWeapons(a, b)).toBe(true);
    expect(sameSocketWeapons(a, { [SOCKET.rightHand]: want(a[SOCKET.rightHand].url, { pose: { rx: 90, ry: 0, rz: 0 } }) })).toBe(false);
    expect(sameSocketWeapons(a, { [SOCKET.rightHand]: want(a[SOCKET.rightHand].url, { gripPoint: { x: 0, y: 0, z: 0 } }) })).toBe(false);
    expect(sameSocketWeapons(a, {})).toBe(false);
    expect(sameSocketWeapons(undefined, {})).toBe(true);
  });

  it('attaches the latest request of a socket only, and a pose change re-places without reloading', async () => {
    const onChange = vi.fn();
    const sockets = createWeaponSockets(onChange);
    const model = new Group();

    sockets.sync(model, 1.8, { [SOCKET.rightHand]: want('a.glb') });
    sockets.sync(model, 1.8, { [SOCKET.rightHand]: want('b.glb') });
    pending.get('a.glb')!.resolve(asset);
    await flush();
    expect(attachWeapons).not.toHaveBeenCalled();

    pending.get('b.glb')!.resolve(asset);
    await flush();
    expect(attachWeapons).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);

    sockets.sync(model, 1.8, { [SOCKET.rightHand]: want('b.glb', { pose: { rx: 0, ry: 90, rz: 0 } }) });
    expect(placeWeapon).toHaveBeenCalledTimes(1);
    expect(attachWeapons).toHaveBeenCalledTimes(1);
    expect(pending.size).toBe(2);

    sockets.sync(model, 1.8, {});
    expect(attachWeapons).toHaveBeenCalledTimes(2);
    expect(attachWeapons.mock.calls[1][1]).toEqual({});
  });

  it('hangs the held weapons again on refresh, and nothing when none is held', async () => {
    const sockets = createWeaponSockets(() => undefined);
    const model = new Group();

    sockets.refresh(model, 1.8);
    expect(attachWeapons).not.toHaveBeenCalled();

    sockets.sync(model, 1.8, { [SOCKET.rightHand]: want('d.glb') });
    pending.get('d.glb')!.resolve(asset);
    await flush();
    sockets.refresh(model, 1.8);

    expect(attachWeapons).toHaveBeenCalledTimes(2);
    expect(Object.keys(attachWeapons.mock.calls[1][1] as object)).toEqual([String(SOCKET.rightHand)]);
  });

  it('drops a weapon that arrives after a reset', async () => {
    const sockets = createWeaponSockets(() => undefined);
    const model = new Group();

    sockets.sync(model, 1.8, { [SOCKET.back]: want('c.glb') });
    sockets.reset();
    pending.get('c.glb')!.resolve(asset);
    await flush();

    expect(attachWeapons).not.toHaveBeenCalled();
  });
});
