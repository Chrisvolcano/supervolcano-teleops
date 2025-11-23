/**
 * Loading Spinner Component
 * Professional loading state with optional message
 */

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'md',
  fullScreen = true 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 border-2',
    md: 'h-16 w-16 border-4',
    lg: 'h-24 w-24 border-4'
  };

  const innerSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const content = (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div 
          className={`animate-spin border-blue-500 border-t-transparent rounded-full ${sizeClasses[size]}`}
          aria-label="Loading"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className={`bg-blue-500 rounded-full opacity-20 animate-pulse ${innerSizeClasses[size]}`}
          />
        </div>
      </div>
      {message && (
        <p className="text-gray-600 font-medium" aria-live="polite">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-busy="true">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8" role="status" aria-busy="true">
      {content}
    </div>
  );
}

