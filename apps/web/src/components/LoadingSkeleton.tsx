import React from 'react';

export interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

/**
 * Reusable loading skeleton component.
 * Renders animated pulse gray bars.
 */
export function LoadingSkeleton({ rows = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gray-700 rounded-md w-full"
          style={{ width: index === rows - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

export default LoadingSkeleton;
