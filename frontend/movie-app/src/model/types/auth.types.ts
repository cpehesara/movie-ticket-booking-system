export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  role: 'CUSTOMER' | 'ADMIN' | 'MANAGER' | 'OPERATOR';
  fullName: string;
  email: string;
  userId: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'KIOSK';