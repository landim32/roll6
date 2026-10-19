import { describe, expect, it } from 'vitest';
import {
  INITIAL_STATE, MAX_ATTACHMENTS, agentStatus, animationVersion, attachPrint, base64Of, conversationCleared, discarded, draftVersion,
  edited, isBusy, isDirty, opened, ownVersion, removePrint, requestFinished, requestProgress, requestQueued, requestStarted, saved, sent,
} from './editorState';
import type { EditorState, PrintAttachment } from './editorState';
import type { AnimationFile } from './animationFormat';
import type { EditorStateInfo } from '../types/animationEditor';
import type { AnimationInfo } from '../types/animation';

const ANIMATION: AnimationInfo = {
  animationId: 7, userId: 1, ownerName: 'Rodrigo', name: 'Aceno', type: 1, duration: 1, loop: true,
  fileUrl: '/api/animation/7/file', createdAt: '2026-10-18T12:00:00', updatedAt: '2026-10-18T12:00:00',
};
const FILE: AnimationFile = { format: 'roll6-animation', version: 1, duration: 1, loop: true, tracks: [] };
const OPEN: EditorStateInfo = {
  animation: ANIMATION,
  content: FILE,
  conversation: {
    animationConversationId: 100,
    messages: [{ animationMessageId: 1, role: 1, text: 'oi', imageCount: 2, createdAt: '2026-10-18T12:00:00' }],
  },
  agent: { connected: true, busy: false, machine: 'PC-A' },
  running: null,
};

const last = <T,>(items: T[], back = 1): T => items[items.length - back];

const print = (id: number): PrintAttachment => ({ id, original: 'data:image/png;base64,AAAA', marked: 'data:image/png;base64,BBBB', marks: [], caption: 'c' });

describe('editor state (086)', () => {
  it('opens with the stored conversation and the agent', () => {
    const state = opened(INITIAL_STATE, OPEN);

    expect(state.animation?.name).toBe('Aceno');
    expect(state.content).toBe(FILE);
    expect(state.contentVersion).toBe(1);
    expect(state.conversationId).toBe(100);
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({ role: 1, text: 'oi', imageCount: 2, thumbnails: [], running: false });
    expect(state.agent.machine).toBe('PC-A');
    expect(state.request).toBeNull();
    expect(isBusy(state)).toBe(false);
  });

  it('a request running when the editor opens shows as a growing Claude line', () => {
    const state = opened(INITIAL_STATE, { ...OPEN, running: { requestId: 12, text: 'Pron', machine: 'PC-A', startedAt: '2026-10-18T12:00:00', queuePosition: null } });

    expect(state.request).toEqual({ id: 12, state: 'running', position: null, machine: 'PC-A' });
    expect(last(state.messages)).toMatchObject({ role: 2, text: 'Pron', running: true });

    const queued = opened(INITIAL_STATE, { ...OPEN, running: { requestId: 12, text: '', machine: null, startedAt: '', queuePosition: 2 } });
    expect(queued.request).toEqual({ id: 12, state: 'queued', position: 2, machine: null });
    expect(queued.messages).toHaveLength(1);
  });

  it('a sent request adds the user line with the thumbnails of this tab and clears the attachments', () => {
    let state = attachPrint(opened(INITIAL_STATE, OPEN), print(1));

    state = sent(state, 12, 'levante o braço', ['data:1'], '2026-10-18T12:01:00');

    expect(last(state.messages)).toMatchObject({ role: 1, text: 'levante o braço', imageCount: 1, thumbnails: ['data:1'] });
    expect(state.attachments).toEqual([]);
    expect(state.request).toEqual({ id: 12, state: 'queued', position: null, machine: null });
    expect(isBusy(state)).toBe(true);
  });

  it('queued, started, progress and finished walk the request', () => {
    let state = sent(opened(INITIAL_STATE, OPEN), 12, 'oi', [], 'now');
    state = requestQueued(state, { requestId: 12, animationId: 7, position: 2 });
    expect(state.request?.position).toBe(2);

    state = requestStarted(state, { requestId: 12, animationId: 7, machine: 'PC-A' });
    expect(state.request).toEqual({ id: 12, state: 'running', position: null, machine: 'PC-A' });
    expect(last(state.messages)).toMatchObject({ running: true, text: '' });

    state = requestProgress(state, { requestId: 12, animationId: 7, event: { kind: 'text', text: 'Pron' } });
    state = requestProgress(state, { requestId: 12, animationId: 7, event: { kind: 'tool', text: 'Editando animacoes/7-aceno.json' } });
    state = requestProgress(state, { requestId: 12, animationId: 7, event: { kind: 'text', text: 'to.' } });
    expect(last(state.messages)).toMatchObject({ text: 'Pronto.', lines: ['Editando animacoes/7-aceno.json'] });

    state = requestFinished(state, {
      requestId: 12, animationId: 7, outcome: { kind: 'done', permissionDenials: [] },
      message: { animationMessageId: 9, role: 2, text: 'Pronto.', imageCount: 0, createdAt: 'later' },
    }, null);
    expect(state.request).toBeNull();
    expect(last(state.messages)).toMatchObject({ key: 'm-9', text: 'Pronto.', running: false, lines: ['Editando animacoes/7-aceno.json'] });
  });

  it('a failed request leaves a notice and a silent one leaves only its lines', () => {
    let state = requestStarted(sent(opened(INITIAL_STATE, OPEN), 12, 'oi', [], 'now'), { requestId: 12, animationId: 7, machine: null });
    state = requestProgress(state, { requestId: 12, animationId: 7, event: { kind: 'notice', text: 'Arquivo inválido: x' } });

    state = requestFinished(state, { requestId: 12, animationId: 7, outcome: { kind: 'failed', message: 'O agente caiu.', permissionDenials: [] }, message: null }, 'O agente caiu.');

    expect(state.messages.slice(-2).map((m) => m.role)).toEqual([2, 3]);
    expect(last(state.messages, 2)).toMatchObject({ running: false, lines: ['Arquivo inválido: x'] });
    expect(last(state.messages)).toMatchObject({ role: 3, text: 'O agente caiu.' });
  });

  it('events of another animation are ignored', () => {
    const state = opened(INITIAL_STATE, OPEN);
    expect(requestStarted(state, { requestId: 1, animationId: 8, machine: null })).toBe(state);
    expect(animationVersion(state, { animationId: 8, name: 'x', content: FILE, origin: 'agent', userId: 1 })).toBe(state);
    expect(conversationCleared(state, { animationId: 8 })).toBe(state);
  });

  it('a version replaces the content and bumps the counter; a cleared conversation empties the lines', () => {
    const state = opened(INITIAL_STATE, OPEN);
    const next: AnimationFile = { ...FILE, duration: 2 };

    const versioned = animationVersion(state, { animationId: 7, name: 'Aceno 2', content: next, origin: 'agent', userId: 1 });
    expect(versioned.content).toBe(next);
    expect(versioned.contentVersion).toBe(2);
    expect(versioned.animation?.name).toBe('Aceno 2');

    const cleared = conversationCleared(versioned, { animationId: 7 });
    expect(cleared.messages).toEqual([]);
    expect(cleared.conversationId).toBeNull();
  });

  it('keeps at most five prints and removes by id', () => {
    let state: EditorState = INITIAL_STATE;
    for (let i = 1; i <= MAX_ATTACHMENTS + 2; i++) state = attachPrint(state, print(i));
    expect(state.attachments).toHaveLength(MAX_ATTACHMENTS);

    state = removePrint(state, 3);
    expect(state.attachments.map((p) => p.id)).toEqual([1, 2, 4, 5]);
  });

  it('agent status and base64 helpers', () => {
    expect(agentStatus(INITIAL_STATE, { connected: true, busy: true, machine: 'X' }).agent.busy).toBe(true);
    expect(base64Of('data:image/png;base64,QUJD')).toBe('QUJD');
    expect(base64Of('QUJD')).toBe('QUJD');
  });
});

describe('edit version and explicit save (091)', () => {
  const turned: AnimationFile = { ...FILE, duration: 2 };

  it('opens clean, with the same saved and edit content', () => {
    const state = opened(INITIAL_STATE, OPEN);
    expect(state.savedContent).toBe(FILE);
    expect(isDirty(state)).toBe(false);
  });

  it('a turned bone changes only the edit version and does not replay the stage; undo/redo replays', () => {
    const state = opened(INITIAL_STATE, OPEN);
    const bone = edited(state, turned, false);
    expect(isDirty(bone)).toBe(true);
    expect(bone.savedContent).toBe(FILE);
    expect(bone.contentVersion).toBe(state.contentVersion);
    expect(edited(bone, FILE, true).contentVersion).toBe(state.contentVersion + 1);
    expect(isDirty(edited(bone, FILE, true))).toBe(false);
  });

  it('saving makes it clean; discarding goes back to the saved version', () => {
    const dirty = edited(opened(INITIAL_STATE, OPEN), turned, false);
    expect(isDirty(saved(dirty, turned))).toBe(false);
    const reverted = discarded(dirty);
    expect(reverted.content).toBe(FILE);
    expect(isDirty(reverted)).toBe(false);
    expect(reverted.contentVersion).toBe(dirty.contentVersion + 1);
    expect(ownVersion(dirty, turned).savedContent).toBe(turned);
  });

  it("applies the Claude's draft only for the tab's own request", () => {
    const state = opened(INITIAL_STATE, OPEN);
    expect(draftVersion(state, { animationId: 7, requestId: 3, content: turned }, false)).toBe(state);
    expect(draftVersion(state, { animationId: 8, requestId: 3, content: turned }, true)).toBe(state);
    const drafted = draftVersion(state, { animationId: 7, requestId: 3, content: turned }, true);
    expect(drafted.content).toBe(turned);
    expect(isDirty(drafted)).toBe(true);
    expect(drafted.savedContent).toBe(FILE);
  });

  it('a version saved elsewhere replaces a clean tab but keeps the changes of a dirty one', () => {
    const elsewhere: AnimationFile = { ...FILE, duration: 3 };
    const version = { animationId: 7, name: 'Aceno', content: elsewhere, origin: 'other' as const, userId: 1 };
    const clean = animationVersion(opened(INITIAL_STATE, OPEN), version);
    expect(clean.content).toBe(elsewhere);
    expect(clean.savedChanged).toBe(false);
    const dirty = animationVersion(edited(opened(INITIAL_STATE, OPEN), turned, false), version);
    expect(dirty.content).toBe(turned);
    expect(dirty.savedContent).toBe(elsewhere);
    expect(dirty.savedChanged).toBe(true);
    expect(discarded(dirty).content).toBe(elsewhere);
  });
});
