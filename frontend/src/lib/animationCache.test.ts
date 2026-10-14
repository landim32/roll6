import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAnimationCache, loadAnimation, loadAnimations } from './animationCache';

const FILE = JSON.stringify({
  format: 'roll6-animation', version: 1, duration: 1, loop: true,
  tracks: [{ bone: 'Head', times: [0, 1], degrees: [[0, 0, 0], [0, 10, 0]] }],
});

describe('animation cache (059)', () => {
  beforeEach(() => clearAnimationCache());

  it('reads a file once per id and turns it into a clip played in full', async () => {
    const fetchText = vi.fn().mockResolvedValue(FILE);

    const [a, b] = await Promise.all([loadAnimation(4, fetchText), loadAnimation(4, fetchText)]);

    expect(fetchText).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(a).toMatchObject({ name: 'animation:4', duration: 1, loop: true, protect: false });
  });

  it('resolves null on a failed read or an invalid file, never rejects', async () => {
    expect(await loadAnimation(1, () => Promise.reject(new Error('404')))).toBeNull();
    expect(await loadAnimation(2, () => Promise.resolve('{ "format": "x" }'))).toBeNull();
    expect(await loadAnimation(3, () => Promise.resolve('not json'))).toBeNull();
  });

  it('loads several ids into a map', async () => {
    const clips = await loadAnimations([5, 6, 5], (id) => (id === 5 ? Promise.resolve(FILE) : Promise.reject(new Error('x'))));

    expect([...clips.keys()]).toEqual([5, 6]);
    expect(clips.get(5)?.name).toBe('animation:5');
    expect(clips.get(6)).toBeNull();
  });

  it('forgets everything on clear', async () => {
    const fetchText = vi.fn().mockResolvedValue(FILE);
    await loadAnimation(7, fetchText);
    clearAnimationCache();
    await loadAnimation(7, fetchText);

    expect(fetchText).toHaveBeenCalledTimes(2);
  });
});
