import React from 'react';

interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-300 p-8">
          <p className="text-4xl mb-4">⚠️</p>
          <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-6">{this.state.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}