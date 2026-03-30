export interface UserResponse {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  phone: string | null;
  loyaltyPoints: number | null;
  cinemaId: number | null;
  cinemaName: string | null;
  createdAt: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
}