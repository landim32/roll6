/** Character transfer form (021): the new owner is identified by the exact e-mail of the account. */

/** Same rule as the backend Guard.Email (and its 260-character limit). */
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const MAX_EMAIL_LENGTH = 260;

export type TransferEmailError = 'required' | 'invalid';

/** E-mail as sent to the API: surrounding spaces removed (the backend also ignores case). */
export const normalizeTransferEmail = (value: string): string => value.trim();

/** Validates the recipient e-mail. Returns the error code or null. */
export const validateTransferEmail = (value: string): TransferEmailError | null => {
  const email = normalizeTransferEmail(value);
  if (!email) return 'required';
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) return 'invalid';
  return null;
};
