import { describe, expect, it } from 'vitest';
import { ThumbnailCancelled, createThumbnailQueue } from './thumbnailQueue';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
};

describe('thumbnail queue (090)', () => {
  it('runs one job at a time, in order', async () => {
    const queue = createThumbnailQueue();
    const started: number[] = [];
    const first = deferred<string>();
    const a = queue.enqueue(() => { started.push(1); return first.promise; });
    const b = queue.enqueue(async () => { started.push(2); return 'b'; });
    expect(started).toEqual([1]);
    expect(queue.size()).toBe(2);
    first.resolve('a');
    await expect(a.promise).resolves.toBe('a');
    await expect(b.promise).resolves.toBe('b');
    expect(started).toEqual([1, 2]);
    expect(queue.size()).toBe(0);
  });

  it('never runs a job cancelled before its turn', async () => {
    const queue = createThumbnailQueue();
    const first = deferred<string>();
    let ran = false;
    queue.enqueue(() => first.promise);
    const b = queue.enqueue(async () => { ran = true; return 'b'; });
    b.cancel();
    await expect(b.promise).rejects.toBeInstanceOf(ThumbnailCancelled);
    first.resolve('a');
    await first.promise;
    await Promise.resolve();
    expect(ran).toBe(false);
  });

  it('aborts the running job and drops its result', async () => {
    const queue = createThumbnailQueue();
    const first = deferred<string>();
    let signal: AbortSignal | null = null;
    const a = queue.enqueue((s) => { signal = s; return first.promise; });
    a.cancel();
    expect(signal!.aborted).toBe(true);
    first.resolve('late');
    await expect(a.promise).rejects.toBeInstanceOf(ThumbnailCancelled);
  });
});
