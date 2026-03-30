import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../../viewmodel/hooks/useAuth';
import { useToast } from '../../components/common/Toast';
import { Button } from '../../components/common/Button';
import { LoginRequest } from '../../../model/types/auth.types';

export const LoginPage: React.FC = () => {
  const { login, loading, error, isAuthenticated, user, clearError } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginRequest>();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'CUSTOMER' ? '/movies' : '/admin', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (error) { showToast(error, 'error'); clearError(); }
  }, [error, showToast, clearError]);

  const onSubmit = (data: LoginRequest) => login(data);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
        <p className="text-gray-500 text-sm mb-6">Sign in to your CinePlex account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Email</label>
            <input
              {...register('email', { required: 'Email is required' })}
              type="email"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5
                text-white text-sm focus:outline-none focus:border-red-500"
              placeholder="you@email.com"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Password</label>
            <input
              {...register('password', { required: 'Password is required' })}
              type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5
                text-white text-sm focus:outline-none focus:border-red-500"
              placeholder="••••••••"
            />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <Button type="submit" loading={loading} fullWidth className="mt-2">Sign In</Button>
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          No account?{' '}
          <Link to="/register" className="text-red-400 hover:text-red-300">Register</Link>
        </p>
      </div>
    </div>
  );
};