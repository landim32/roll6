/** Common API types. */

/** Paged list returned by the list endpoints. */
export interface PagedList<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/** Paging/search parameters accepted by the list endpoints. */
export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  /** Only items owned by the logged user. */
  mine?: boolean;
}

/** RFC 7807 error body returned by the API (ASP.NET Core ProblemDetails). */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  /** Validation errors by field (ValidationProblemDetails). */
  errors?: Record<string, string[]>;
}
