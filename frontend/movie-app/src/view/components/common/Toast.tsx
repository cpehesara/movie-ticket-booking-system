import React, { createContext, useContext, useState, useCallback } from 'react';
import { NotificationType } from '../../../model/types/notification.types';

interface Toast { id: string; type: NotificationType; message: string; }

interface ToastContextValue {
  showToast: (message: string, type?: NotificationType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

const icons: Record<NotificationType, string> = {
  success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️',
};
const colors: Record<NotificationType, string> = {
  success: 'border-green-600 bg-green-950 text-green-200',
  error:   'border-red-600 bg-red-950 text-red-200',
  info:    'border-blue-600 bg-blue-950 text-blue-200',
  warning: 'border-yellow-600 bg-yellow-950 text-yellow-200',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {toasts.map(t => (
          <div key={t.id}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-xl
              animate-fade-in ${colors[t.type]}`}>
            <span>{icons[t.type]}</span>
            <p className="text-sm leading-snug">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);