import { RequestContext } from './RequestContext';

export interface PaginationInfo {
  cursor?: string;
  pageSize: number;
  sort?: { field: string; direction: 'ASC' | 'DESC' };
  filters?: Record<string, any>;
  search?: string;
}

export interface Query {
  readonly context: RequestContext;
  readonly pagination?: PaginationInfo;
}

export interface QueryResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly meta?: {
    nextCursor?: string;
    totalCount?: number;
  };
  readonly errors: string[];
}

export interface QueryHandler<TQuery extends Query, TResult> {
  handle(query: TQuery): Promise<QueryResult<TResult>>;
}
