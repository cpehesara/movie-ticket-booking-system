import React from 'react';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Loading...', fullScreen = false }) => (
  <div className={`flex flex-col items-center justify-center gap-4 text-gray-400
    ${fullScreen ? 'fixed inset-0 bg-gray-950 z-50' : 'py-16'}`}>
    <svg className="animate-spin h-10 w-10 text-red-500" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
    <p className="text-sm">{message}</p>
  </div>
);