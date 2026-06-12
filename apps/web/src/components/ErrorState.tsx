import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Reusable error state component.
 * Displays a red warning icon, detailed message, and optional retry button.
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#111111] border border-[#1f1f1f] rounded-xl text-center space-y-4 max-w-md mx-auto my-12">
      <div className="p-3 bg-red-950/50 rounded-full border border-red-500/30 text-red-500 animate-bounce">
        <ExclamationTriangleIcon className="h-8 w-8" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">Something went wrong</h3>
        <p className="text-sm text-gray-400 mt-1">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export default ErrorState;
