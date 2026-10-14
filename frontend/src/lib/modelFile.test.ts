import { describe, expect, it } from 'vitest';
import { checkModelFile, isGlbHeader, MAX_MODEL_BYTES, storedModelName } from './modelFile';

/** A minimal glTF binary: header + a JSON chunk "{}  ". */
const glb = ({ version = 2, declared, chunkType = 0x4e4f534a }: { version?: number; declared?: number; chunkType?: number } = {}) => {
  const bytes = new Uint8Array(24);
  bytes.set([0x67, 0x6c, 0x54, 0x46], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(4, version, true);
  view.setUint32(8, declared ?? bytes.length, true);
  view.setUint32(12, 4, true);
  view.setUint32(16, chunkType, true);
  bytes.set([0x7b, 0x7d, 0x20, 0x20], 20);
  return bytes;
};

const file = (bytes: Uint8Array, name = 'orc.glb') => new File([bytes], name, { type: 'model/gltf-binary' });

describe('isGlbHeader', () => {
  it('accepts a glTF 2.0 binary whose declared length is the size', () => {
    expect(isGlbHeader(glb(), 24)).toBe(true);
  });

  it('refuses another magic, version, length or first chunk', () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47]);
    expect(isGlbHeader(png, 24)).toBe(false);
    expect(isGlbHeader(glb({ version: 1 }), 24)).toBe(false);
    expect(isGlbHeader(glb({ declared: 999 }), 24)).toBe(false);
    expect(isGlbHeader(glb({ chunkType: 0x004e4942 }), 24)).toBe(false);
    expect(isGlbHeader(glb().slice(0, 12), 24)).toBe(false);
  });
});

describe('checkModelFile', () => {
  it('accepts a valid .glb', async () => {
    expect(await checkModelFile(file(glb()))).toBe('ok');
  });

  it('refuses another extension, a bad header or a tiny file', async () => {
    expect(await checkModelFile(file(glb(), 'orc.fbx'))).toBe('notGlb');
    expect(await checkModelFile(file(glb({ version: 1 })))).toBe('notGlb');
    expect(await checkModelFile(file(new Uint8Array(4)))).toBe('notGlb');
  });

  it('refuses a file over 20 MB before reading it', async () => {
    const big = { name: 'big.glb', size: MAX_MODEL_BYTES + 1, slice: () => { throw new Error('read'); } };
    expect(await checkModelFile(big as unknown as File)).toBe('tooLarge');
  });
});

describe('storedModelName', () => {
  it('takes the stored name from a presigned URL', () => {
    expect(storedModelName('https://nyc3.digitaloceanspaces.com/b/roll6/0123456789abcdef0123456789abcdef.glb?X-Amz-Signature=1'))
      .toBe('0123456789abcdef0123456789abcdef.glb');
  });

  it('is null for other names and blob URLs', () => {
    expect(storedModelName('https://x/roll6/orc.glb')).toBeNull();
    expect(storedModelName('https://x/roll6/0123456789abcdef0123456789abcdef.png')).toBeNull();
    expect(storedModelName('blob:http://localhost/8f1c')).toBeNull();
  });
});
