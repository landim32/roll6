/**
 * The versions an animation went through while the editor is open (086; the roll6anime `AnimationHistory` of 066):
 * every content that differs from the current one — a turn of a bone, an edit of the Claude, an undo — becomes a
 * version, and undo/redo hand back the exact text of the previous/next one to save. Saving it brings it back as a
 * version event, and since it equals the current one it is not recorded twice. Per tab, never stored.
 */

export const HISTORY_LIMIT = 100;

export interface HistoryCounts {
  undo: number;
  redo: number;
}

export interface AnimationHistory {
  /** The current version's text, or null before the first one. */
  readonly current: string | null;
  readonly counts: HistoryCounts;
  /** A content observed: a new version unless it is the current one; a new one drops what could be redone. */
  push: (text: string) => boolean;
  /** The text of the previous version (now the current one), or null when there is none. */
  undo: () => string | null;
  /** The text of the next version (now the current one), or null when there is none. */
  redo: () => string | null;
}

export const createHistory = (limit = HISTORY_LIMIT): AnimationHistory => {
  const versions: string[] = [];
  let index = -1;

  return {
    get current() {
      return index >= 0 ? versions[index] : null;
    },
    get counts() {
      return { undo: Math.max(0, index), redo: Math.max(0, versions.length - 1 - index) };
    },
    push: (text) => {
      if (index >= 0 && versions[index] === text) return false;
      // After an undo, a content equal to the next version (a redo saved elsewhere) just moves forward.
      if (index + 1 < versions.length && versions[index + 1] === text) {
        index++;
        return true;
      }
      if (index + 1 < versions.length) versions.splice(index + 1);
      versions.push(text);
      if (versions.length > limit) versions.shift();
      index = versions.length - 1;
      return true;
    },
    undo: () => {
      if (index <= 0) return null;
      index--;
      return versions[index];
    },
    redo: () => {
      if (index + 1 >= versions.length) return null;
      index++;
      return versions[index];
    },
  };
};

/** The text of a version as the history compares it: the compact JSON of the file. */
export const versionText = (content: unknown): string => JSON.stringify(content);
