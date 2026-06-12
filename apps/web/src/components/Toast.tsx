import React, { useEffect } from 'react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

/**
 * Reusable slide-in Toast notification.
 * Positioned bottom-right, auto-dismisses after 3 seconds.
 */
export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-green-600 border-green-500 text-white',
    error: 'bg-red-600 border-red-500 text-white',
    info: 'bg-blue-600 border-blue-500 text-white',
  };

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center justify-between p-4 rounded-lg shadow-lg border animate-slide-in-right ${bgColors[type]}`}>
      <div className="flex items-center text-sm font-medium">
        <span className="mr-2 text-base">{icons[type]}</span>
        <span>{message}</span>
      </div>
      <button
        onClick={onClose}
        className="ml-4 text-white/80 hover:text-white focus:outline-none text-xs font-bold transition-opacity hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

export default Toast;
