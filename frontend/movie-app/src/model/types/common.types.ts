export interface ErrorResponse {
  code: string;
  message: string;
  timestamp: string;
  errors?: Record<string, string>;
}

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}