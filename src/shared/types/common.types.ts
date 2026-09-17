export interface ApiResponse<T = any> {
  status: string;
  code: number;
  data: T;
  message?: string;
}

export interface PaginationQuery {
  page: number;
  limit: number;
}
