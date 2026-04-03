import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../../viewmodel/hooks/useAuth';
import { useToast } from '../../components/common/Toast';
import { Button } from '../../components/common/Button';
import { RegisterRequest } from '../../../model/types/auth.types';

export const RegisterPage: React.FC = () => {
  const { register: registerUser, loading, error, isAuthenticated, clearError } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterRequest>();

  useEffect(() => {
    if (isAuthenticated) navigate('/movies', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      clearError();
    }
  }, [error, showToast, clearError]);

  const onSubmit = (data: RegisterRequest) => {
    const payload = { ...data };
    if (!payload.phone || payload.phone.trim() === '') {
      delete payload.phone;
    }
    registerUser(payload);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
        <p className="text-gray-500 text-sm mb-6">Join CinePlex today</p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Full Name</label>
            <input
              {...register('fullName', { required: 'Full name is required' })}
              type="text"
              placeholder="Your name"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
            />
            {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>}
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Email</label>
            <input
              {...register('email', { required: 'Email is required' })}
              type="email"
              placeholder="you@email.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Password</label>
            <div className="w-full bg-gray-800 border border-gray-700 rounded-lg flex items-center focus-within:border-red-500">
              <input
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Min 8 characters' },
                })}
                type={showPassword ? 'text' : 'password'}
                placeholder="8+ characters"
                className="w-full bg-transparent px-4 py-2.5 text-white text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="px-4 text-xs font-semibold transition-colors"
                style={{ color: '#9ca3af' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Phone (optional)</label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="+94771234567"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
            />
            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <Button type="submit" loading={loading} fullWidth className="mt-2">Create Account</Button>
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-red-400 hover:text-red-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
};
