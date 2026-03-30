import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { login, register, logout, clearError } from '../slices/authSlice';
import { LoginRequest, RegisterRequest } from '../../model/types/auth.types';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading, error } = useSelector((s: RootState) => s.auth);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    role: user?.role ?? null,
    login: (data: LoginRequest) => dispatch(login(data)),
    register: (data: RegisterRequest) => dispatch(register(data)),
    logout: () => dispatch(logout()),
    clearError: () => dispatch(clearError()),
  };
};