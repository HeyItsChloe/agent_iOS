import { lazy, Suspense, ComponentType } from 'react';
import { LoadingSpinner } from '../common/LoadingSpinner';

/**
 * Loading fallback for lazy-loaded modals.
 */
function ModalLoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-ios-card rounded-2xl p-8 flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-ios-text-secondary">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Lazy-loaded modal components.
 * These are split into separate chunks and only loaded when needed.
 */
export const LazyNewChatModal = lazy(() => 
  import('./NewChatModal').then(m => ({ default: m.NewChatModal }))
);

export const LazyAgentSelectorModal = lazy(() => 
  import('./AgentSelectorModal').then(m => ({ default: m.AgentSelectorModal }))
);

export const LazySkillSelectorModal = lazy(() => 
  import('./SkillSelectorModal').then(m => ({ default: m.SkillSelectorModal }))
);

export const LazySettingsModal = lazy(() => 
  import('./SettingsModal').then(m => ({ default: m.SettingsModal }))
);

/**
 * Higher-order component to wrap lazy modals with Suspense.
 */
export function withSuspense<P extends object>(
  LazyComponent: ComponentType<P>,
  fallback: React.ReactNode = <ModalLoadingFallback />
) {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Pre-wrapped lazy modals with Suspense
export const NewChatModalLazy = withSuspense(LazyNewChatModal);
export const AgentSelectorModalLazy = withSuspense(LazyAgentSelectorModal);
export const SkillSelectorModalLazy = withSuspense(LazySkillSelectorModal);
export const SettingsModalLazy = withSuspense(LazySettingsModal);
