import { describe, expect, it } from 'vitest';
import { MAX_SHEET_FILE_BYTES, sheetFileMimeType, sheetFileTypeOf, validateSheetFile } from './sheetFile';

const file = (name: string, type: string, size = 1000) => ({ name, type, size });

describe('validateSheetFile', () => {
  it('accepts images and PDF', () => {
    expect(validateSheetFile(file('ficha.pdf', 'application/pdf'))).toBeNull();
    expect(validateSheetFile(file('ficha.png', 'image/png'))).toBeNull();
    expect(validateSheetFile(file('ficha.jpg', 'image/jpeg'))).toBeNull();
    expect(validateSheetFile(file('ficha.webp', 'image/webp'))).toBeNull();
  });

  it('falls back to the extension when the MIME type is empty', () => {
    expect(validateSheetFile(file('ficha.PDF', ''))).toBeNull();
    expect(sheetFileMimeType(file('ficha.jpeg', ''))).toBe('image/jpeg');
    expect(validateSheetFile(file('ficha.txt', ''))).toBe('type');
  });

  it('rejects other types and files over 10 MB', () => {
    expect(validateSheetFile(file('ficha.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).toBe('type');
    expect(validateSheetFile(file('ficha.gif', 'image/gif'))).toBe('type');
    expect(validateSheetFile(file('ficha.pdf', 'application/pdf', MAX_SHEET_FILE_BYTES + 1))).toBe('tooLarge');
  });
});

describe('sheetFileTypeOf', () => {
  it('tells PDF from images', () => {
    expect(sheetFileTypeOf('0123456789abcdef0123456789abcdef.pdf')).toBe('pdf');
    expect(sheetFileTypeOf('0123456789abcdef0123456789abcdef.webp')).toBe('image');
    expect(sheetFileTypeOf(null)).toBeNull();
  });
});
