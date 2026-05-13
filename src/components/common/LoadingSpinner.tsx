import { memo } from 'react';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * iOS-style loading spinner component.
 */
export const LoadingSpinner = memo(function LoadingSpinner({ 
  size = 'md', 
  className 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  return (
    <div
      className={cn(
        'rounded-full border-ios-blue border-t-transparent animate-spin',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
});

interface LoadingOverlayProps {
  message?: string;
}

/**
 * Full-screen loading overlay.
 */
export const LoadingOverlay = memo(function LoadingOverlay({ 
  message = 'Loading...' 
}: LoadingOverlayProps) {
  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label={message}
    >
      <div className="bg-ios-card rounded-2xl p-6 flex flex-col items-center gap-4 shadow-xl">
        <LoadingSpinner size="lg" />
        <p className="text-ios-text font-medium">{message}</p>
      </div>
    </div>
  );
});

/**
 * Skeleton loader for content placeholders.
 */
export const Skeleton = memo(function Skeleton({ 
  className 
}: { 
  className?: string 
}) {
  return (
    <div
      className={cn(
        'bg-ios-secondary animate-pulse rounded',
        className
      )}
      aria-hidden="true"
    />
  );
});

/**
 * Message skeleton for chat loading state.
 */
export const MessageSkeleton = memo(function MessageSkeleton({ 
  isUser = false 
}: { 
  isUser?: boolean 
}) {
  return (
    <div className={cn(
      'flex gap-2 mb-3 px-4',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {!isUser && <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />}
      <div className={cn(
        'flex flex-col gap-1',
        isUser ? 'items-end' : 'items-start'
      )}>
        {!isUser && <Skeleton className="w-20 h-3 rounded" />}
        <Skeleton className={cn(
          'h-10 rounded-2xl',
          isUser ? 'w-48 rounded-br-md' : 'w-64 rounded-bl-md'
        )} />
        <Skeleton className="w-12 h-3 rounded" />
      </div>
    </div>
  );
});

/**
 * Conversation list skeleton.
 */
export const ConversationSkeleton = memo(function ConversationSkeleton() {
  return (
    <div className="p-3 flex gap-3 border-b border-ios-separator">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex justify-between">
          <Skeleton className="w-32 h-4 rounded" />
          <Skeleton className="w-12 h-3 rounded" />
        </div>
        <Skeleton className="w-48 h-3 rounded" />
      </div>
    </div>
  );
});
