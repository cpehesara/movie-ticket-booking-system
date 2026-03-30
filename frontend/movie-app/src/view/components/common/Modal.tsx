import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, maxWidth = 'md' }) => {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl
        w-full ${widths[maxWidth]} z-10`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};