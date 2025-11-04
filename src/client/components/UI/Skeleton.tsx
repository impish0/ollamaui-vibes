interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton = ({ className = '', variant = 'rectangular' }: SkeletonProps) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-800';

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};

// Chat list skeleton
export const ChatListSkeleton = () => {
  return (
    <div className="space-y-2 p-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
          <Skeleton className="h-5 w-3/4 mb-2" variant="text" />
          <Skeleton className="h-3 w-1/2" variant="text" />
        </div>
      ))}
    </div>
  );
};

// Message skeleton
export const MessageSkeleton = () => {
  return (
    <div className="space-y-4 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="w-8 h-8" variant="circular" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" variant="text" />
            <Skeleton className="h-4 w-full" variant="text" />
            <Skeleton className="h-4 w-5/6" variant="text" />
          </div>
        </div>
      ))}
    </div>
  );
};

// System prompt skeleton
export const SystemPromptSkeleton = () => {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
          <Skeleton className="h-4 w-2/3 mb-2" variant="text" />
          <Skeleton className="h-3 w-full" variant="text" />
          <Skeleton className="h-3 w-4/5" variant="text" />
        </div>
      ))}
    </div>
  );
};
