import type { AgentStatus, ClaudeEvent, RequestOutcome } from '../types/animationEditor';
import type { GeneratorImage, GeneratorOpened } from '../types/mapGenerator';

/**
 * The pure state of the map generator page (095): the session, the versions (the edited map's image is version 0),
 * the one on the stage, the conversation with the Codex, the marked prints waiting to go and the request. Nothing here
 * outlives the tab (Q3 = B); the context only wires the hub.
 */

export const MAX_ATTACHMENTS = 5;

export interface GeneratorVersion {
  version: number;
  /** data URL of the image. */
  url: string;
  /** base64 without the prefix (sent back as the next request's base image). */
  base64: string;
  mediaType: string;
  requestId: number | null;
  /** The number the server gave a Codex image (100): kept to drop a repeated report after a local renumbering. */
  serverVersion?: number | null;
  /** The version this one was edited from in the image editor (100); null/absent for Codex and base versions. */
  editedFrom?: number | null;
}

export interface GeneratorAttachment {
  id: number;
  version: number;
  original: string;
  marked: string;
  marks: unknown[];
  caption: string;
}

export type GeneratorRole = 'user' | 'codex' | 'notice';

export interface GeneratorMessage {
  key: string;
  role: GeneratorRole;
  text: string;
  thumbnails: string[];
  lines: string[];
  running: boolean;
}

export interface GeneratorRequestState {
  id: number;
  state: 'queued' | 'running';
  position: number | null;
}

export interface GeneratorBase {
  mapModelId: number;
  name: string;
}

export interface GeneratorState {
  sessionId: string | null;
  agent: AgentStatus;
  base: GeneratorBase | null;
  versions: GeneratorVersion[];
  /** The version on the stage. */
  selected: number | null;
  messages: GeneratorMessage[];
  attachments: GeneratorAttachment[];
  request: GeneratorRequestState | null;
  /** The last version saved as a map (a newer one makes the page dirty). */
  savedVersion: number | null;
}

export const INITIAL_STATE: GeneratorState = {
  sessionId: null,
  agent: { connected: false, busy: false, machine: null },
  base: null,
  versions: [],
  selected: null,
  messages: [],
  attachments: [],
  request: null,
  savedVersion: null,
};

const RUNNING_KEY = (requestId: number) => `run-${requestId}`;

const runningMessage = (requestId: number): GeneratorMessage => ({
  key: RUNNING_KEY(requestId), role: 'codex', text: '', thumbnails: [], lines: [], running: true,
});

export const dataUrl = (mediaType: string, base64: string): string => `data:${mediaType};base64,${base64}`;

export const base64Of = (url: string): string => url.replace(/^data:[^;]+;base64,/, '');

export const opened = (state: GeneratorState, info: GeneratorOpened, base: GeneratorBase | null): GeneratorState => ({
  ...INITIAL_STATE, sessionId: info.sessionId, agent: info.agent, base, attachments: [], versions: state.versions.filter((v) => v.version === 0),
  selected: state.versions.some((v) => v.version === 0) ? 0 : null,
});

/** The edited map's own image (version 0), counted as saved. */
export const baseImage = (state: GeneratorState, mediaType: string, base64: string): GeneratorState => ({
  ...state,
  versions: [{ version: 0, url: dataUrl(mediaType, base64), base64, mediaType, requestId: null }, ...state.versions.filter((v) => v.version !== 0)],
  selected: state.selected ?? 0,
  savedVersion: state.savedVersion ?? 0,
});

export const agentStatus = (state: GeneratorState, agent: AgentStatus): GeneratorState => ({ ...state, agent });

const nextNumber = (state: GeneratorState): number => state.versions.reduce((max, v) => Math.max(max, v.version), 0) + 1;

/**
 * A new image: it joins the versions and goes on the stage. The server numbers the Codex's images by its own counter;
 * a number already used here (by an edited version, 100) becomes the next free one instead of losing the image.
 */
export const imageArrived = (state: GeneratorState, image: GeneratorImage): GeneratorState => {
  if (image.sessionId !== state.sessionId) return state;
  if (state.versions.some((v) => (v.serverVersion ?? v.version) === image.version && v.requestId === image.requestId && v.editedFrom == null))
    return state;
  const number = state.versions.some((v) => v.version === image.version) ? nextNumber(state) : image.version;
  const version: GeneratorVersion = {
    version: number, url: dataUrl(image.mediaType, image.data), base64: image.data, mediaType: image.mediaType, requestId: image.requestId,
    serverVersion: image.version,
  };
  return { ...state, versions: [...state.versions, version].sort((a, b) => a.version - b.version), selected: number };
};

/** An image made in the editor (100): the next version, from <c>from</c>, selected; the version it came from is untouched. */
export const edited = (state: GeneratorState, image: { url: string; base64: string; mediaType: string; from: number }): GeneratorState => {
  const number = nextNumber(state);
  const version: GeneratorVersion = {
    version: number, url: image.url, base64: image.base64, mediaType: image.mediaType, requestId: null, editedFrom: image.from,
  };
  return { ...state, versions: [...state.versions, version], selected: number };
};

export const select = (state: GeneratorState, version: number): GeneratorState =>
  state.versions.some((v) => v.version === version) ? { ...state, selected: version } : state;

/** Keys of the messages a request produces (its running line, its answer and its notice). */
const ofRequest = (key: string, requestId: number): boolean =>
  key === RUNNING_KEY(requestId) || key === `done-${requestId}` || key === `notice-${requestId}`;

/**
 * The request was accepted. The hub may already have sent its start, progress or even its end before the call that
 * sends it returns (they travel on the same connection), so the user's message goes **before** anything of that
 * request — never after the Codex's answer — and a request already running or finished keeps its state.
 */
export const sent = (state: GeneratorState, requestId: number, text: string, thumbnails: string[]): GeneratorState => {
  const message: GeneratorMessage = { key: `sent-${requestId}`, role: 'user', text, thumbnails, lines: [], running: false };
  const at = state.messages.findIndex((m) => ofRequest(m.key, requestId));
  const messages = at < 0 ? [...state.messages, message] : [...state.messages.slice(0, at), message, ...state.messages.slice(at)];
  const answered = state.messages.some((m) => m.key === `done-${requestId}` || m.key === `notice-${requestId}`);
  const request = state.request?.id === requestId ? state.request
    : answered ? state.request
      : { id: requestId, state: 'queued' as const, position: null };
  return { ...state, messages, request, attachments: [] };
};

export const queued = (state: GeneratorState, requestId: number, position: number | null): GeneratorState => ({
  ...state, request: { id: requestId, state: 'queued', position },
});

export const started = (state: GeneratorState, requestId: number): GeneratorState => ({
  ...state,
  request: { id: requestId, state: 'running', position: null },
  messages: state.messages.some((m) => m.key === RUNNING_KEY(requestId)) ? state.messages : [...state.messages, runningMessage(requestId)],
});

export const progress = (state: GeneratorState, requestId: number, event: ClaudeEvent): GeneratorState => {
  const key = RUNNING_KEY(requestId);
  const apply = (message: GeneratorMessage): GeneratorMessage => {
    if (event.kind === 'text' && event.text) return { ...message, text: message.text + event.text };
    if ((event.kind === 'tool' || event.kind === 'notice') && event.text) return { ...message, lines: [...message.lines, event.text] };
    return message;
  };
  let found = false;
  const messages = state.messages.map((message) => {
    if (message.key !== key) return message;
    found = true;
    return apply(message);
  });
  if (!found) messages.push(apply(runningMessage(requestId)));
  return { ...state, messages };
};

/** The request ended: the running line keeps its text (the Codex's answer), plus a notice when it did not end well. */
export const finished = (state: GeneratorState, requestId: number, outcome: RequestOutcome, text: string, notice: string | null): GeneratorState => {
  const key = RUNNING_KEY(requestId);
  const messages: GeneratorMessage[] = [];
  for (const message of state.messages) {
    if (message.key !== key) {
      messages.push(message);
      continue;
    }
    const answer = text.trim() || message.text.trim();
    if (answer || message.lines.length > 0) messages.push({ ...message, key: `done-${requestId}`, text: answer, running: false });
  }
  if (!state.messages.some((m) => m.key === key) && text.trim()) {
    messages.push({ key: `done-${requestId}`, role: 'codex', text: text.trim(), thumbnails: [], lines: [], running: false });
  }
  if (notice && outcome.kind !== 'done') {
    messages.push({ key: `notice-${requestId}`, role: 'notice', text: notice, thumbnails: [], lines: [], running: false });
  }
  return { ...state, messages, request: state.request?.id === requestId ? null : state.request };
};

export const attach = (state: GeneratorState, attachment: GeneratorAttachment): GeneratorState =>
  state.attachments.length >= MAX_ATTACHMENTS ? state : { ...state, attachments: [...state.attachments, attachment] };

export const replaceAttachment = (state: GeneratorState, attachment: GeneratorAttachment): GeneratorState => ({
  ...state, attachments: state.attachments.map((a) => (a.id === attachment.id ? attachment : a)),
});

export const removeAttachment = (state: GeneratorState, id: number): GeneratorState => ({
  ...state, attachments: state.attachments.filter((a) => a.id !== id),
});

export const saved = (state: GeneratorState, version: number): GeneratorState => ({
  ...state, savedVersion: Math.max(version, state.savedVersion ?? 0),
});

export const conversationCleared = (state: GeneratorState): GeneratorState => ({ ...state, messages: [] });

export const isBusy = (state: GeneratorState): boolean => state.request !== null;

/** A generated version newer than the last one saved exists (the page asks before leaving). */
export const isDirty = (state: GeneratorState): boolean => {
  const newest = state.versions.reduce((max, v) => Math.max(max, v.version), 0);
  return newest > (state.savedVersion ?? 0);
};

export const selectedVersion = (state: GeneratorState): GeneratorVersion | null =>
  state.versions.find((v) => v.version === state.selected) ?? null;
