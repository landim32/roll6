import { describe, expect, it } from 'vitest';
import { MAX_NAME_LENGTH, validateName, validatePasswordChange } from './userForms';

describe('validateName', () => {
  it.each([
    ['', 'required'],
    ['   ', 'required'],
    ['a'.repeat(MAX_NAME_LENGTH + 1), 'tooLong'],
  ])('rejects %j', (name, error) => {
    expect(validateName(name)).toBe(error);
  });

  it('accepts names up to the limit, ignoring surrounding spaces', () => {
    expect(validateName('a'.repeat(MAX_NAME_LENGTH))).toBeNull();
    expect(validateName(`  ${'a'.repeat(MAX_NAME_LENGTH)}  `)).toBeNull();
    expect(validateName(' Novo Nome ')).toBeNull();
  });
});

describe('validatePasswordChange', () => {
  const valid = { currentPassword: 'senha-antiga', newPassword: 'senha-nova', confirmPassword: 'senha-nova' };

  it.each(['currentPassword', 'newPassword', 'confirmPassword'] as const)('requires %s', (field) => {
    expect(validatePasswordChange({ ...valid, [field]: '' })).toBe('required');
  });

  it('requires at least 8 characters', () => {
    expect(validatePasswordChange({ ...valid, newPassword: '1234567', confirmPassword: '1234567' })).toBe('tooShort');
    expect(validatePasswordChange({ ...valid, newPassword: '12345678', confirmPassword: '12345678' })).toBeNull();
  });

  it('requires the confirmation to match', () => {
    expect(validatePasswordChange({ ...valid, confirmPassword: 'outra-senha' })).toBe('mismatch');
  });

  it('accepts a valid form, even when the new password equals the current one', () => {
    expect(validatePasswordChange(valid)).toBeNull();
    expect(validatePasswordChange({ currentPassword: 'mesma-senha', newPassword: 'mesma-senha', confirmPassword: 'mesma-senha' })).toBeNull();
  });
});
