import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../../viewmodel/hooks/useAuth';
import { useToast } from '../../components/common/Toast';
import { Button } from '../../components/common/Button';
import { LoginRequest } from '../../../model/types/auth.types';

const inputClass = `
  w-full rounded-lg px-4 py-3 text-sm text-white
  bg-transparent transition-colors duration-150
  focus:outline-none
`;

export const LoginPage: React.FC = () => {
  const { login, loading, error, isAuthenticated, user, clearError } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'CUSTOMER' ? '/movies' : '/admin', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      clearError();
    }
  }, [error, showToast, clearError]);

  const onSubmit = (data: LoginRequest) => login(data);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#080b10' }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(220,38,38,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <p
            className="font-black tracking-widest uppercase"
            style={{ color: '#dc2626', fontSize: '1.1rem', letterSpacing: '0.35em' }}
          >
            CinePlex
          </p>
          <p style={{ color: '#1f2937', fontSize: '0.65rem', marginTop: '4px', letterSpacing: '0.15em' }}>
            SEAT MANAGEMENT SYSTEM
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
        >
          <h1 className="text-xl font-bold text-white mb-1">Welcome back</h1>
          <p style={{ color: '#4b5563', fontSize: '0.8rem', marginBottom: '1.75rem' }}>
            Sign in to your CinePlex account
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: '#4b5563' }}
              >
                Email address
              </label>
              <div
                className="rounded-lg overflow-hidden transition-all duration-150"
                style={{ border: '1px solid #1f2937', backgroundColor: '#111827' }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = '#dc2626')}
                onBlurCapture={(e) => (e.currentTarget.style.borderColor = errors.email ? '#f87171' : '#1f2937')}
              >
                <input
                  {...register('email', { required: 'Email is required' })}
                  type="email"
                  className={inputClass}
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.email.message}</p>
              )}
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: '#4b5563' }}
              >
                Password
              </label>
              <div
                className="rounded-lg overflow-hidden transition-all duration-150 flex items-center"
                style={{ border: '1px solid #1f2937', backgroundColor: '#111827' }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = '#dc2626')}
                onBlurCapture={(e) => (e.currentTarget.style.borderColor = errors.password ? '#f87171' : '#1f2937')}
              >
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  className={inputClass}
                  placeholder="........"
                  autoComplete="current-password"
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
              {errors.password && (
                <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" loading={loading} fullWidth className="mt-2">
              Sign In
            </Button>
          </form>

          <div
            className="mt-6 pt-5"
            style={{ borderTop: '1px solid #111827' }}
          >
            <p className="text-center" style={{ color: '#374151', fontSize: '0.8rem' }}>
              No account?{' '}
              <Link
                to="/register"
                style={{ color: '#f87171', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fca5a5')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#f87171')}
              >
                Create one
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center mt-6" style={{ color: '#111827', fontSize: '0.65rem' }}>
          IT 3052 - Programming Frameworks
        </p>
      </div>
    </div>
  );
};
