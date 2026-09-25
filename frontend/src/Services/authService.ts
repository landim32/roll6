import type {
  UserInfo, UserInsertInfo, UserLoginInfo, UserNameInfo, UserPasswordInfo, UserTokenInfo,
} from '../types/auth';
import { API_URL, getHeaders, handleApiResponse, readError } from './apiHelpers';

const API_BASE = `${API_URL}/api/user`;

interface AuthServiceConfig {
  onUnauthorized?: () => void;
}

/** Auth Service — login, account creation and profile. */
class AuthService {
  private config: AuthServiceConfig;

  constructor(config: AuthServiceConfig = {}) {
    this.config = config;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    return handleApiResponse<T>(response, this.config.onUnauthorized);
  }

  /** Logs in with e-mail and password. Invalid credentials throw with the server message. */
  async login(data: UserLoginInfo): Promise<UserTokenInfo> {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST', headers: getHeaders(false), body: JSON.stringify(data),
    });
    // 401 here means wrong credentials, not an expired session: don't trigger the session handler.
    if (response.status === 401) throw new Error(await readError(response));
    return this.handleResponse<UserTokenInfo>(response);
  }

  /** Creates an account. */
  async register(data: UserInsertInfo): Promise<UserInfo> {
    const response = await fetch(API_BASE, {
      method: 'POST', headers: getHeaders(false), body: JSON.stringify(data),
    });
    return this.handleResponse<UserInfo>(response);
  }

  /** Changes the logged user's display name. */
  async rename(data: UserNameInfo): Promise<UserInfo> {
    const response = await fetch(`${API_BASE}/name`, {
      method: 'PUT', headers: getHeaders(true), body: JSON.stringify(data),
    });
    return this.handleResponse<UserInfo>(response);
  }

  /** Changes the password; a wrong current password comes back as 400 with the server message. */
  async changePassword(data: UserPasswordInfo): Promise<void> {
    const response = await fetch(`${API_BASE}/password`, {
      method: 'PUT', headers: getHeaders(true), body: JSON.stringify(data),
    });
    return this.handleResponse<void>(response);
  }
}

export const authService = new AuthService();
export default AuthService;
