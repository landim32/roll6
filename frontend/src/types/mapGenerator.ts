import type { AgentStatus, ClaudeEvent, RequestOutcome } from './animationEditor';

/** The map generator of this tab (095, hub `OpenGenerator`). */
export interface GeneratorOpened {
  sessionId: string;
  agent: AgentStatus;
  mapModelId: number | null;
}

/** A request of the generator (hub `SendGeneratorRequest`). */
export interface GeneratorRequestPayload {
  sessionId: string;
  text: string;
  /** Marked prints of a version: PNG base64 (no prefix) + caption, at most five. */
  images: { png: string; caption: string }[];
  /** The version the request starts from (base64, no prefix), or null on a new map. */
  baseImage: string | null;
}

export interface GeneratorQueued {
  sessionId: string;
  requestId: number;
  position: number | null;
}

export interface GeneratorStarted {
  sessionId: string;
  requestId: number;
  machine: string | null;
}

export interface GeneratorProgress {
  sessionId: string;
  requestId: number;
  event: ClaudeEvent;
}

/** A generated image, validated by the server, for this tab only. */
export interface GeneratorImage {
  sessionId: string;
  requestId: number;
  version: number;
  mediaType: string;
  data: string;
}

export interface GeneratorFinished {
  sessionId: string;
  requestId: number;
  outcome: RequestOutcome;
  text: string;
}

/** The server → browser methods of the generator and their payloads. */
export interface GeneratorEvents {
  agentStatus: AgentStatus;
  generatorQueued: GeneratorQueued;
  generatorStarted: GeneratorStarted;
  generatorProgress: GeneratorProgress;
  generatorImage: GeneratorImage;
  generatorFinished: GeneratorFinished;
}
