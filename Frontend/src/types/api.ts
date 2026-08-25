export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  per_page: number;
  current_page: number;
  total_page: number;
}

export interface ApiError {
  success: boolean;
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp?: string;
  path?: string;
}
