/**
 * The library cards' live thumbnails (090) are drawn one at a time: a page of 12 weapons must not parse 12 models at
 * once on a phone. Jobs run in the order asked; a job cancelled before its turn never runs, one cancelled while running
 * gets its signal aborted and its result dropped.
 */
export interface ThumbnailTicket<T> {
  promise: Promise<T>;
  cancel: () => void;
}

export interface ThumbnailQueue {
  enqueue: <T>(run: (signal: AbortSignal) => Promise<T>) => ThumbnailTicket<T>;
  /** Jobs waiting plus the one running (for tests). */
  size: () => number;
}

interface Job {
  run: (signal: AbortSignal) => Promise<unknown>;
  controller: AbortController;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

export class ThumbnailCancelled extends Error {
  constructor() {
    super('thumbnail cancelled');
    this.name = 'ThumbnailCancelled';
  }
}

export const createThumbnailQueue = (): ThumbnailQueue => {
  const waiting: Job[] = [];
  let running: Job | null = null;

  const next = () => {
    if (running) return;
    const job = waiting.shift();
    if (!job) return;
    running = job;
    job.run(job.controller.signal)
      .then((value) => (job.controller.signal.aborted ? job.reject(new ThumbnailCancelled()) : job.resolve(value)))
      .catch((err: unknown) => job.reject(job.controller.signal.aborted ? new ThumbnailCancelled() : err))
      .finally(() => {
        running = null;
        next();
      });
  };

  const enqueue = <T,>(run: (signal: AbortSignal) => Promise<T>): ThumbnailTicket<T> => {
    const controller = new AbortController();
    let job!: Job;
    const promise = new Promise<T>((resolve, reject) => {
      job = { run, controller, resolve: resolve as (value: unknown) => void, reject };
    });
    waiting.push(job);
    next();
    return {
      promise,
      cancel: () => {
        if (controller.signal.aborted) return;
        controller.abort();
        const index = waiting.indexOf(job);
        if (index >= 0) {
          waiting.splice(index, 1);
          job.reject(new ThumbnailCancelled());
        }
      },
    };
  };

  return { enqueue, size: () => waiting.length + (running ? 1 : 0) };
};

/** The page-wide queue of the library cards. */
export const thumbnailQueue = createThumbnailQueue();
