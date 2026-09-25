/** Same limits as the backend: Guard.RequiredText(name, …, 260) and UserService.MIN_PASSWORD_LENGTH. */
export const MAX_NAME_LENGTH = 260;
export const MIN_PASSWORD_LENGTH = 8;

export type NameError = 'required' | 'tooLong';
export type PasswordError = 'required' | 'tooShort' | 'mismatch';

/** Password form fields; confirmPassword is only checked here, never sent. */
export interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** Validates the display name (trimmed). Returns the error code or null. */
export const validateName = (name: string): NameError | null => {
  const trimmed = name.trim();
  if (!trimmed) return 'required';
  if (trimmed.length > MAX_NAME_LENGTH) return 'tooLong';
  return null;
};

/** Validates the password form before sending: empty field → short password → mismatch. */
export const validatePasswordChange = (form: PasswordChangeForm): PasswordError | null => {
  if (!form.currentPassword || !form.newPassword || !form.confirmPassword) return 'required';
  if (form.newPassword.length < MIN_PASSWORD_LENGTH) return 'tooShort';
  if (form.newPassword !== form.confirmPassword) return 'mismatch';
  return null;
};
