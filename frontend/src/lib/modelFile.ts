/**
 * The token's 3D model file (055): a glTF binary (.glb, version 2), at most 20 MB — the same checks the server makes
 * (`ImageService.UploadModelAsync`), done in the browser first so a wrong file never leaves the device. Pure.
 */

export const MAX_MODEL_BYTES = 20 * 1024 * 1024;

/** Why a chosen file is refused, or 'ok'. */
export type ModelFileCheck = 'ok' | 'notGlb' | 'tooLarge';

/** Bytes 0–3 "glTF", version 2, declared length = size, first chunk "JSON". */
export const isGlbHeader = (head: Uint8Array, size: number): boolean => {
  if (head.length < 20) return false;
  if (head[0] !== 0x67 || head[1] !== 0x6c || head[2] !== 0x54 || head[3] !== 0x46) return false;
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const version = view.getUint32(4, true);
  const declared = view.getUint32(8, true);
  const chunkType = view.getUint32(16, true);
  return version === 2 && declared === size && chunkType === 0x4e4f534a;
};

/** Checks a chosen file: the extension, the size and the header. */
export const checkModelFile = async (file: Blob & { name?: string }): Promise<ModelFileCheck> => {
  if (file.name !== undefined && !/\.glb$/i.test(file.name)) return 'notGlb';
  if (file.size > MAX_MODEL_BYTES) return 'tooLarge';
  if (file.size < 20) return 'notGlb';
  const head = new Uint8Array(await file.slice(0, 20).arrayBuffer());
  return isGlbHeader(head, file.size) ? 'ok' : 'notGlb';
};

const STORED_MODEL_NAME = /^[0-9a-f]{32}\.glb$/;

/** The stored name (`{32-hex}.glb`) at the end of a presigned URL, or null for any other URL. */
export const storedModelName = (url: string): string | null => {
  try {
    const name = new URL(url, 'http://local').pathname.split('/').pop() ?? '';
    return STORED_MODEL_NAME.test(name) ? name : null;
  } catch {
    return null;
  }
};
