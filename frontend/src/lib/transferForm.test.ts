import { describe, expect, it } from 'vitest';
import { normalizeTransferEmail, validateTransferEmail } from './transferForm';

describe('validateTransferEmail', () => {
  it('requires an e-mail', () => {
    expect(validateTransferEmail('')).toBe('required');
    expect(validateTransferEmail('   ')).toBe('required');
  });

  it('rejects malformed e-mails', () => {
    expect(validateTransferEmail('ana')).toBe('invalid');
    expect(validateTransferEmail('ana@x')).toBe('invalid');
    expect(validateTransferEmail('a na@x.com')).toBe('invalid');
    expect(validateTransferEmail(`${'a'.repeat(255)}@x.com`)).toBe('invalid');
  });

  it('accepts a valid e-mail with surrounding spaces', () => {
    expect(validateTransferEmail('  Ana@Exemplo.com ')).toBeNull();
    expect(normalizeTransferEmail('  Ana@Exemplo.com ')).toBe('Ana@Exemplo.com');
  });
});
