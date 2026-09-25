import type { ListQuery, ProblemDetails } from '../types/common';
import type { UserTokenInfo } from '../types/auth';

/**
 * Base URL of the backend (VITE_API_URL, constitution). An empty value means same origin:
 * in Docker the nginx that serves the SPA proxies /api to the API container.
 */
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5119').replace(/\/$/, '');

/** localStorage key of the session (token only in localStorage, never cookies). */
export const AUTH_STORAGE_KEY = 'roll6:auth';

/** localStorage key of the current campaign id. */
export const CAMPAIGN_STORAGE_KEY = 'roll6:campaign';

/** localStorage key of the chosen character per campaign ({ [campaignId]: 'gm' | characterId }). */
export const CHARACTER_STORAGE_KEY = 'roll6:character';

/** Reads the stored session, or null. */
export const readStoredSession = (): UserTokenInfo | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserTokenInfo;
  } catch {
    return null;
  }
};

/** Request headers; `authenticated` adds the Bearer token, `json` the JSON content type. */
export const getHeaders = (authenticated: boolean, json = true): HeadersInit => {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (json) headers['Content-Type'] = 'application/json';
  if (authenticated) {
    const session = readStoredSession();
    if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  }
  return headers;
};

/** Converts an error response (ProblemDetails or text) into a readable message. */
export const readError = async (response: Response): Promise<string> => {
  const text = await response.text();
  if (!text) return `${response.status} ${response.statusText}`;
  try {
    const problem = JSON.parse(text) as ProblemDetails;
    if (problem.detail) return problem.detail;
    const firstError = problem.errors ? Object.values(problem.errors).flat()[0] : undefined;
    return firstError ?? problem.title ?? text;
  } catch {
    return text;
  }
};

/** Builds a query string from the list parameters, skipping empty values. */
export const toQuery = (params: ListQuery): string => {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  if (params.search?.trim()) search.set('search', params.search.trim());
  if (params.mine) search.set('mine', 'true');
  const query = search.toString();
  return query ? `?${query}` : '';
};

/** Global handler for 401 responses, registered once by the AuthProvider. */
let unauthorizedHandler: (() => void) | undefined;

export const setUnauthorizedHandler = (handler: (() => void) | undefined): void => {
  unauthorizedHandler = handler;
};

/** Shared response handling used by every service's private handleResponse. */
export const handleApiResponse = async <T>(response: Response, onUnauthorized?: () => void): Promise<T> => {
  if (response.status === 401) {
    (onUnauthorized ?? unauthorizedHandler)?.();
    throw new Error(await readError(response));
  }
  if (!response.ok) throw new Error(await readError(response));
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
};
