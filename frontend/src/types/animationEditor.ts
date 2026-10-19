import type { AnimationFile } from '../lib/animationFormat';
import type { AnimationInfo } from './animation';

/**
 * The animation editor (086): what the hub `/hubs/animation` exchanges with the page. Mirrors
 * `Roll6.DTO/Realtime/Animation` and the generic console DTOs of `Roll6.DTO/Realtime/Console`.
 */

/** Who wrote a line of the conversation (`ConversationRole`). */
export const CONVERSATION_ROLE = { user: 1, claude: 2, notice: 3 } as const;
export type ConversationRole = (typeof CONVERSATION_ROLE)[keyof typeof CONVERSATION_ROLE];

export const REQUEST_STATE = { queued: 'queued', running: 'running' } as const;
export type RequestState = (typeof REQUEST_STATE)[keyof typeof REQUEST_STATE];

export interface AgentStatus {
  connected: boolean;
  busy: boolean;
  machine: string | null;
}

/** A print attached to a request: PNG as base64 (no `data:` prefix) and its caption. */
export interface PromptImage {
  png: string;
  caption: string;
}

export interface RequestPayload {
  animationId: number;
  text: string;
  images: PromptImage[];
  modelName: string | null;
  /** The tab's edit version (091): the Claude works on what the stage shows, unsaved changes included. */
  content?: AnimationFile | null;
  /** The weapons the model on the stage carries (092), e.g. "Escudo (mão esquerda)"; at most 5. */
  modelWeapons?: string[];
}

export type ClaudeEventKind = 'started' | 'text' | 'tool' | 'notice';

export interface ClaudeEvent {
  kind: ClaudeEventKind;
  text?: string | null;
  tool?: string | null;
  target?: string | null;
}

export type RequestOutcomeKind = 'done' | 'stopped' | 'failed';

export interface RequestOutcome {
  kind: RequestOutcomeKind;
  message?: string | null;
  permissionDenials: string[];
}

export interface EditorMessageInfo {
  animationMessageId: number;
  role: ConversationRole;
  text: string;
  imageCount: number;
  createdAt: string;
}

export interface EditorConversationInfo {
  animationConversationId: number;
  messages: EditorMessageInfo[];
}

export interface RunningRequestInfo {
  requestId: number;
  text: string;
  machine: string | null;
  startedAt: string;
  queuePosition: number | null;
}

/** What `OpenEditor` returns. */
export interface EditorStateInfo {
  animation: AnimationInfo;
  content: AnimationFile;
  conversation: EditorConversationInfo;
  agent: AgentStatus;
  running: RunningRequestInfo | null;
}

export type VersionOrigin = 'agent' | 'user' | 'other';

export interface AnimationVersion {
  animationId: number;
  name: string;
  content: AnimationFile;
  origin: VersionOrigin;
  userId: number;
}

export interface RequestQueued {
  requestId: number;
  animationId: number;
  position: number;
}

export interface RequestStarted {
  requestId: number;
  animationId: number;
  machine: string | null;
}

export interface RequestProgress {
  requestId: number;
  animationId: number;
  event: ClaudeEvent;
}

export interface RequestFinished {
  requestId: number;
  animationId: number;
  outcome: RequestOutcome;
  message: EditorMessageInfo | null;
}

export interface ConversationCleared {
  animationId: number;
}

/** A valid working file of the Claude (091): an unsaved edit of the tab that sent the request, never stored. */
export interface DraftVersion {
  animationId: number;
  requestId: number;
  content: AnimationFile;
}

/** The camera sides of a print asked by the Claude (094). */
export const SHOT_VIEW = {
  front: 'front',
  back: 'back',
  right: 'right',
  left: 'left',
  top: 'top',
  threeQuarter: 'three-quarter',
} as const;
export type ShotView = (typeof SHOT_VIEW)[keyof typeof SHOT_VIEW];

/** One print the Claude asked for: an instant ("key" = the key pose), a side and the skeleton. */
export interface PrintShot {
  time: number | 'key';
  view: ShotView;
  skeleton: boolean;
}

/** `printRequested` (094): only the tab that sent the request gets it; `content` is the Claude's latest valid file. */
export interface PrintRequested {
  requestId: number;
  callId: string;
  content: AnimationFile;
  shots: PrintShot[];
}

/** One print taken for the Claude: a PNG (base64, no prefix) and its caption. */
export interface PrintedShot {
  png: string;
  caption: string;
}

/** The tab's answer (hub method `PrintResult`): the prints, or why there are none. */
export interface PrintResult {
  callId: string;
  error?: string | null;
  shots?: PrintedShot[];
}

/** The server → browser methods and their payloads. */
export interface EditorEvents {
  agentStatus: AgentStatus;
  requestQueued: RequestQueued;
  requestStarted: RequestStarted;
  requestProgress: RequestProgress;
  requestFinished: RequestFinished;
  animationVersion: AnimationVersion;
  draftVersion: DraftVersion;
  conversationCleared: ConversationCleared;
  printRequested: PrintRequested;
}

/** The `HubException` codes of the hub, mapped to `editor.error.*`. */
export const EDITOR_ERROR = {
  forbidden: 'forbidden',
  notFound: 'not-found',
  noAgent: 'no-agent',
  busy: 'busy',
  invalid: 'invalid',
} as const;
export type EditorErrorCode = (typeof EDITOR_ERROR)[keyof typeof EDITOR_ERROR];
