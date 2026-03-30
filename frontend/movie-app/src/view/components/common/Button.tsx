import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

const styles: Record<string, string> = {
  primary: 'bg-red-600 hover:bg-red-700 text-white',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
  danger: 'bg-red-900 hover:bg-red-800 text-red-200 border border-red-700',
  ghost: 'bg-transparent hover:bg-gray-800 text-gray-300 border border-gray-600',
};

const sizes: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...rest
}) => (
  <button
    {...rest}
    disabled={disabled || loading}
    className={`
      ${styles[variant]} ${sizes[size]}
      ${fullWidth ? 'w-full' : ''}
      font-semibold rounded-lg transition-colors duration-150
      disabled:opacity-50 disabled:cursor-not-allowed
      flex items-center justify-center gap-2
      ${className}
    `}
  >
    {loading && (
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    )}
    {children}
  </button>
);