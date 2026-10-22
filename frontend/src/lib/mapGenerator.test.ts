import { describe, expect, it } from 'vitest';
import {
  INITIAL_STATE, MAX_ATTACHMENTS, attach, baseImage, finished, imageArrived, isBusy, isDirty, opened, progress, saved, select, selectedVersion,
  sent, started, edited,
} from './mapGeneratorState';
import type { GeneratorState } from './mapGeneratorState';
import { HEX_SIZE, gridPixelSize } from './hexGrid';
import { MAX, MIN, suggestGrid } from './generatedMapGrid';

const AGENT = { connected: true, busy: false, machine: 'PC' };
const open = (): GeneratorState => opened(INITIAL_STATE, { sessionId: 's1', agent: AGENT, mapModelId: null }, null);
const image = (version: number, requestId = 7) => ({ sessionId: 's1', requestId, version, mediaType: 'image/png', data: `AAA${version}` });

describe('mapGeneratorState (095)', () => {
  it('keeps the question before the answer when the hub starts the request before the send returns', () => {
    let state = started(open(), 8);
    state = progress(state, 8, { kind: 'text', text: 'Vou gerar o mapa…' });
    state = sent(state, 8, 'corredor de pedra', []);
    expect(state.messages.map((m) => m.role)).toEqual(['user', 'codex']);
    expect(state.request).toEqual({ id: 8, state: 'running', position: null });

    // Even an answer that already finished stays after the question, and the request stays done.
    let done = finished(started(open(), 9), 9, { kind: 'done', message: null, permissionDenials: [] } as never, 'Pronto.', null);
    done = sent(done, 9, 'taverna', []);
    expect(done.messages.map((m) => [m.role, m.text])).toEqual([['user', 'taverna'], ['codex', 'Pronto.']]);
    expect(isBusy(done)).toBe(false);
  });

  it('walks a request: sent, started, progress, image, finished', () => {
    let state = sent(open(), 7, 'taverna', []);
    expect(isBusy(state)).toBe(true);
    state = started(state, 7);
    state = progress(state, 7, { kind: 'tool', text: 'Executando Copy-Item' });
    state = imageArrived(state, image(1));
    state = progress(state, 7, { kind: 'text', text: 'Mapa gerado.' });
    state = finished(state, 7, { kind: 'done', permissionDenials: [] }, 'Mapa gerado.', null);

    expect(isBusy(state)).toBe(false);
    expect(state.selected).toBe(1);
    expect(selectedVersion(state)?.url).toBe('data:image/png;base64,AAA1');
    expect(state.messages.map((m) => m.role)).toEqual(['user', 'codex']);
    expect(state.messages[1]).toMatchObject({ text: 'Mapa gerado.', lines: ['Executando Copy-Item'], running: false });
  });

  it('a failed request leaves a notice; images of another session are ignored', () => {
    let state = started(sent(open(), 7, 'x', []), 7);
    state = imageArrived(state, { ...image(1), sessionId: 'outra' });
    state = finished(state, 7, { kind: 'failed', message: 'O Codex demorou demais.', permissionDenials: [] }, '', 'O Codex demorou demais.');
    expect(state.versions).toEqual([]);
    expect(state.messages[state.messages.length - 1]).toMatchObject({ role: 'notice', text: 'O Codex demorou demais.' });
  });

  it('is dirty while a generated version is newer than the last saved one', () => {
    let state = imageArrived(open(), image(1));
    expect(isDirty(state)).toBe(true);
    state = saved(state, 1);
    expect(isDirty(state)).toBe(false);
    state = imageArrived(state, image(2));
    expect(isDirty(state)).toBe(true);
    state = select(state, 1);
    expect(state.selected).toBe(1);
  });

  it('an edited map starts from its image as version 0, already saved', () => {
    const state = baseImage(opened(INITIAL_STATE, { sessionId: 's1', agent: AGENT, mapModelId: 4 }, { mapModelId: 4, name: 'Taverna' }), 'image/jpeg', 'BBB');
    expect(state.selected).toBe(0);
    expect(isDirty(state)).toBe(false);
    expect(state.base?.name).toBe('Taverna');
  });

  it('keeps at most five marked prints', () => {
    let state = open();
    for (let i = 0; i < MAX_ATTACHMENTS + 1; i++) state = attach(state, { id: i, version: 1, original: 'o', marked: 'm', marks: [], caption: 'c' });
    expect(state.attachments).toHaveLength(MAX_ATTACHMENTS);
  });
  it('adds an edited version after the others and renumbers a Codex image that would collide (100)', () => {
    let state = imageArrived(open(), image(1));
    state = edited(state, { url: 'data:image/png;base64,EEE', base64: 'EEE', mediaType: 'image/png', from: 1 });
    expect(state.versions.map((v) => [v.version, v.editedFrom ?? null])).toEqual([[1, null], [2, 1]]);
    expect(state.selected).toBe(2);
    expect(state.versions[0].base64).toBe('AAA1');

    // The server's next image is its own version 2: it becomes 3 here, and a repeated report is ignored.
    state = imageArrived(state, image(2, 8));
    state = imageArrived(state, image(2, 8));
    expect(state.versions.map((v) => v.version)).toEqual([1, 2, 3]);
    expect(state.versions[2].base64).toBe('AAA2');
    expect(state.selected).toBe(3);
  });
});

describe('generatedMapGrid (095)', () => {
  it('a square image gets 20 columns and the rows that keep its proportion', () => {
    const grid = suggestGrid(1254, 1254);
    expect(grid.gridWidth).toBe(20);
    const size = gridPixelSize(grid.gridWidth, grid.gridHeight, HEX_SIZE);
    expect(Math.abs(size.height / size.width - 1)).toBeLessThan(0.08);
    expect(grid.imageWidth).toBe(Math.round(size.width));
    expect(grid.imageHeight).toBe(grid.imageWidth);
  });

  it('a portrait image puts 20 hexes on its long side and stays inside the limits', () => {
    const tall = suggestGrid(500, 1500);
    expect(tall.gridHeight).toBe(20);
    expect(tall.gridWidth).toBeLessThan(20);
    const thin = suggestGrid(10, 4000);
    expect(thin.gridWidth).toBeGreaterThanOrEqual(MIN);
    expect(suggestGrid(4000, 10).gridHeight).toBeGreaterThanOrEqual(MIN);
    expect(suggestGrid(4000, 10).gridWidth).toBeLessThanOrEqual(MAX);
  });
});
