/** Auth types — mirror the backend User DTOs. */

/** Logged user. */
export interface UserInfo {
  userId: number;
  name: string;
  email: string;
}

/** Login credentials. */
export interface UserLoginInfo {
  email: string;
  password: string;
}

/** New account data. */
export interface UserInsertInfo {
  name: string;
  email: string;
  password: string;
}

/** Session returned by the login (JWT + user). */
export interface UserTokenInfo {
  token: string;
  /** ISO date-time (UTC). */
  expiresAt: string;
  user: UserInfo;
}

/** New display name (mirror the backend User DTOs). */
export interface UserNameInfo {
  name: string;
}

/** Password change; the current password is checked by the server. */
export interface UserPasswordInfo {
  currentPassword: string;
  newPassword: string;
}
