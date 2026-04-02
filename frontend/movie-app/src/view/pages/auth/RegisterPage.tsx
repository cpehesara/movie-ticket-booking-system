import React, { useEffect } from 'react';
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
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterRequest>();

  useEffect(() => { if (isAuthenticated) navigate('/movies', { replace: true }); }, [isAuthenticated, navigate]);
  useEffect(() => { if (error) { showToast(error, 'error'); clearError(); } }, [error, showToast, clearError]);

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
          {[
            { name: 'fullName' as const, label: 'Full Name', type: 'text', placeholder: 'Your name',
              rules: { required: 'Full name is required' } },
            { name: 'email' as const, label: 'Email', type: 'email', placeholder: 'you@email.com',
              rules: { required: 'Email is required' } },
            { name: 'password' as const, label: 'Password', type: 'password', placeholder: '8+ characters',
              rules: { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } } },
            { name: 'phone' as const, label: 'Phone (optional)', type: 'tel', placeholder: '+94771234567',
              rules: {} },
          ].map(({ name, label, type, placeholder, rules }) => (
            <div key={name}>
              <label className="text-gray-400 text-xs mb-1 block">{label}</label>
              <input
                {...register(name, rules)}
                type={type}
                placeholder={placeholder}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5
                  text-white text-sm focus:outline-none focus:border-red-500"
              />
              {errors[name] && <p className="text-red-400 text-xs mt-1">{errors[name]?.message}</p>}
            </div>
          ))}

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