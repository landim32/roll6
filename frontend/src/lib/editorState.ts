import type { AnimationFile } from './animationFormat';
import type { AnimationInfo } from '../types/animation';
import { versionText } from './animationHistory';
import type {
  AgentStatus, AnimationVersion, ClaudeEvent, ConversationCleared, ConversationRole, DraftVersion, EditorMessageInfo, EditorStateInfo,
  RequestFinished, RequestProgress, RequestQueued, RequestStarted, RequestState,
} from '../types/animationEditor';
import { CONVERSATION_ROLE, REQUEST_STATE } from '../types/animationEditor';

/**
 * The pure state of the animation editor page (086) and the reducers of every hub event. Everything the page shows
 * about the conversation and the request comes from here; the context only wires the service and the stage.
 *
 * Since 091 the editor keeps two contents: `savedContent` is the library's (what tokens play) and `content` is the edit
 * version the stage shows. Turned bones, undo/redo and the Claude's files change only `content`; "Salvar" writes it.
 */

export const MAX_ATTACHMENTS = 5;

/** A print waiting to go with the next request: the original, its marks and the marked picture (per tab only). */
export interface PrintAttachment {
  id: number;
  /** PNG data URL as captured. */
  original: string;
  /** PNG data URL with the marks (the original when there are none). */
  marked: string;
  marks: unknown[];
  caption: string;
}

export interface EditorMessage {
  key: string;
  animationMessageId: number | null;
  role: ConversationRole;
  text: string;
  imageCount: number;
  /** The thumbnails of the prints sent from this tab (data URLs); stored messages have none. */
  thumbnails: string[];
  /** Notices of the request running (tools, files), shown under the growing Claude text. */
  lines: string[];
  /** 094: the prints this tab took for the Claude during the request (never stored). */
  prints: AgentPrint[];
  createdAt: string | null;
  /** The Claude answer still arriving. */
  running: boolean;
}

/** A batch of prints taken for the Claude (094): the pictures with their captions, or why there are none. */
export interface AgentPrint {
  callId: string;
  shots: { png: string; caption: string }[];
  error: string | null;
}

export interface EditorRequestState {
  id: number;
  state: RequestState;
  position: number | null;
  machine: string | null;
}

export interface EditorState {
  animation: AnimationInfo | null;
  /** The edit version the stage shows (091). */
  content: AnimationFile | null;
  /** The library's content (091): what tokens play; changes only by saving (here or elsewhere). */
  savedContent: AnimationFile | null;
  /** A version was saved elsewhere while this tab had unsaved changes (091). */
  savedChanged: boolean;
  /** Grows with every new version (also an own save), so the stage knows when to re-read the content. */
  contentVersion: number;
  conversationId: number | null;
  messages: EditorMessage[];
  agent: AgentStatus;
  request: EditorRequestState | null;
  attachments: PrintAttachment[];
}

export const INITIAL_STATE: EditorState = {
  animation: null,
  content: null,
  savedContent: null,
  savedChanged: false,
  contentVersion: 0,
  conversationId: null,
  messages: [],
  agent: { connected: false, busy: false, machine: null },
  request: null,
  attachments: [],
};

const RUNNING_KEY = (requestId: number) => `run-${requestId}`;

const fromInfo = (info: EditorMessageInfo): EditorMessage => ({
  key: `m-${info.animationMessageId}`,
  animationMessageId: info.animationMessageId,
  role: info.role,
  text: info.text,
  imageCount: info.imageCount,
  thumbnails: [],
  lines: [],
  prints: [],
  createdAt: info.createdAt,
  running: false,
});

const runningMessage = (requestId: number, text: string): EditorMessage => ({
  key: RUNNING_KEY(requestId),
  animationMessageId: null,
  role: CONVERSATION_ROLE.claude,
  text,
  imageCount: 0,
  thumbnails: [],
  lines: [],
  prints: [],
  createdAt: null,
  running: true,
});

/** `OpenEditor` answered: the whole state, with a running request shown as a growing Claude line. */
export const opened = (state: EditorState, info: EditorStateInfo): EditorState => {
  const messages = info.conversation.messages.map(fromInfo);
  let request: EditorRequestState | null = null;
  if (info.running) {
    request = {
      id: info.running.requestId,
      state: info.running.queuePosition === null ? REQUEST_STATE.running : REQUEST_STATE.queued,
      position: info.running.queuePosition,
      machine: info.running.machine,
    };
    if (request.state === REQUEST_STATE.running) messages.push(runningMessage(info.running.requestId, info.running.text));
  }
  return {
    ...state,
    animation: info.animation,
    content: info.content,
    savedContent: info.content,
    savedChanged: false,
    contentVersion: state.contentVersion + 1,
    conversationId: info.conversation.animationConversationId,
    messages,
    agent: info.agent,
    request,
  };
};

export const agentStatus = (state: EditorState, agent: AgentStatus): EditorState => ({ ...state, agent });

/** The user sent a request (the hub accepted it): the user line with this tab's thumbnails, the attachments cleared. */
export const sent = (state: EditorState, requestId: number, text: string, thumbnails: string[], now: string): EditorState => ({
  ...state,
  messages: [...state.messages, {
    key: `sent-${requestId}`,
    animationMessageId: null,
    role: CONVERSATION_ROLE.user,
    text,
    imageCount: thumbnails.length,
    thumbnails,
    lines: [],
    prints: [],
    createdAt: now,
    running: false,
  }],
  request: { id: requestId, state: REQUEST_STATE.queued, position: null, machine: null },
  attachments: [],
});

export const requestQueued = (state: EditorState, info: RequestQueued): EditorState =>
  state.animation && info.animationId !== state.animation.animationId
    ? state
    : { ...state, request: { id: info.requestId, state: REQUEST_STATE.queued, position: info.position, machine: null } };

export const requestStarted = (state: EditorState, info: RequestStarted): EditorState => {
  if (state.animation && info.animationId !== state.animation.animationId) return state;
  const messages = state.messages.some((m) => m.key === RUNNING_KEY(info.requestId))
    ? state.messages
    : [...state.messages, runningMessage(info.requestId, '')];
  return { ...state, messages, request: { id: info.requestId, state: REQUEST_STATE.running, position: null, machine: info.machine } };
};

/** A text delta grows the running line; a tool or notice adds a muted line under it. */
export const requestProgress = (state: EditorState, info: RequestProgress): EditorState => {
  if (state.animation && info.animationId !== state.animation.animationId) return state;
  const key = RUNNING_KEY(info.requestId);
  let found = false;
  const messages = state.messages.map((message) => {
    if (message.key !== key) return message;
    found = true;
    return applyEvent(message, info.event);
  });
  if (!found) messages.push(applyEvent(runningMessage(info.requestId, ''), info.event));
  return { ...state, messages };
};

const applyEvent = (message: EditorMessage, event: ClaudeEvent): EditorMessage => {
  switch (event.kind) {
    case 'text':
      return event.text ? { ...message, text: message.text + event.text } : message;
    case 'tool':
    case 'notice':
      return event.text ? { ...message, lines: [...message.lines, event.text] } : message;
    default:
      return message;
  }
};

/** The request ended: the running line becomes the stored one (or leaves when nothing was said), plus a notice when it did not end well. */
export const requestFinished = (state: EditorState, info: RequestFinished, noticeText: string | null): EditorState => {
  if (state.animation && info.animationId !== state.animation.animationId) return state;
  const key = RUNNING_KEY(info.requestId);
  const messages: EditorMessage[] = [];
  for (const message of state.messages) {
    if (message.key !== key) {
      messages.push(message);
      continue;
    }
    if (info.message) messages.push({ ...fromInfo(info.message), lines: message.lines, prints: message.prints });
    else if (message.lines.length > 0 || message.prints.length > 0) messages.push({ ...message, running: false, key: `done-${info.requestId}` });
  }
  if (!state.messages.some((m) => m.key === key) && info.message) messages.push(fromInfo(info.message));
  if (noticeText) {
    messages.push({
      key: `notice-${info.requestId}`,
      animationMessageId: null,
      role: CONVERSATION_ROLE.notice,
      text: noticeText,
      imageCount: 0,
      thumbnails: [],
      lines: [],
      prints: [],
      createdAt: null,
      running: false,
    });
  }
  return { ...state, messages, request: state.request?.id === info.requestId ? null : state.request };
};

/** The tab has changes the library does not (091). */
export const isDirty = (state: Pick<EditorState, 'content' | 'savedContent'>): boolean =>
  state.content !== null && versionText(state.content) !== versionText(state.savedContent);

/**
 * A version saved in the library by someone else (another tab, the MCP): a clean tab shows it; a tab with unsaved
 * changes keeps them and only learns the new saved version (091).
 */
export const animationVersion = (state: EditorState, version: AnimationVersion): EditorState => {
  if (state.animation && version.animationId !== state.animation.animationId) return state;
  const animation = state.animation ? { ...state.animation, name: version.name || state.animation.name } : state.animation;
  if (isDirty(state)) return { ...state, animation, savedContent: version.content, savedChanged: true };
  return {
    ...state,
    animation,
    content: version.content,
    savedContent: version.content,
    savedChanged: false,
    contentVersion: state.contentVersion + 1,
  };
};

/** The echo of this tab's own save: the library now holds it (091). */
/** Name and type changed in "Alterar" of the editor's bar: the library's answer replaces the shown animation. */
export const detailsChanged = (state: EditorState, animation: AnimationInfo): EditorState =>
  state.animation && state.animation.animationId === animation.animationId ? { ...state, animation } : state;

export const ownVersion = (state: EditorState, content: AnimationFile): EditorState => ({ ...state, savedContent: content });

/**
 * A change of the edit version (091): a bone turned on the stage (`replay` false — the stage already shows it) or an
 * undo/redo (`replay` true — the stage reads it again).
 */
export const edited = (state: EditorState, content: AnimationFile, replay: boolean): EditorState => ({
  ...state,
  content,
  contentVersion: replay ? state.contentVersion + 1 : state.contentVersion,
});

/** A valid file the Claude wrote for this tab's request (091): an unsaved edit the stage plays. */
export const draftVersion = (state: EditorState, info: DraftVersion, own: boolean): EditorState => {
  if (!own || (state.animation && info.animationId !== state.animation.animationId)) return state;
  return edited(state, info.content, true);
};

/** "Salvar" succeeded (091): the library holds the edit version. */
export const saved = (state: EditorState, content: AnimationFile): EditorState => ({ ...state, savedContent: content, savedChanged: false });

/** "Descartar" (091): back to the library's version. */
export const discarded = (state: EditorState): EditorState => ({
  ...state,
  content: state.savedContent,
  savedChanged: false,
  contentVersion: state.contentVersion + 1,
});

export const conversationCleared = (state: EditorState, info: ConversationCleared): EditorState =>
  state.animation && info.animationId !== state.animation.animationId
    ? state
    : { ...state, messages: [], conversationId: null };

export const attachPrint = (state: EditorState, print: PrintAttachment): EditorState =>
  state.attachments.length >= MAX_ATTACHMENTS ? state : { ...state, attachments: [...state.attachments, print] };

export const replacePrint = (state: EditorState, print: PrintAttachment): EditorState => ({
  ...state,
  attachments: state.attachments.map((item) => (item.id === print.id ? print : item)),
});

export const removePrint = (state: EditorState, id: number): EditorState => ({
  ...state,
  attachments: state.attachments.filter((item) => item.id !== id),
});

/** A request is queued or running for this animation (the composer and the pose editor wait). */
export const isBusy = (state: EditorState): boolean => state.request !== null;

/** The base64 body of a PNG data URL, as the hub takes it. */
export const base64Of = (dataUrl: string): string => dataUrl.replace(/^data:[^;]+;base64,/, '');

/**
 * The tab took prints for the Claude (094): they go under the running Claude line of that request, like its tool lines,
 * and stay with it when it is stored. Never sent anywhere else.
 */
export const agentPrint = (state: EditorState, requestId: number, print: AgentPrint): EditorState => {
  const key = RUNNING_KEY(requestId);
  let found = false;
  const messages = state.messages.map((message) => {
    if (message.key !== key) return message;
    found = true;
    return { ...message, prints: [...message.prints, print] };
  });
  if (!found) messages.push({ ...runningMessage(requestId, ''), prints: [print] });
  return { ...state, messages };
};
