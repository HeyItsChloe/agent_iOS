import { ReactNode, memo } from 'react';

interface VisuallyHiddenProps {
  children: ReactNode;
  as?: 'span' | 'div' | 'label';
}

/**
 * Visually hides content while keeping it accessible to screen readers.
 * Use for accessible labels, descriptions, or skip links.
 */
export const VisuallyHidden = memo(function VisuallyHidden({ 
  children, 
  as: Component = 'span' 
}: VisuallyHiddenProps) {
  return (
    <Component
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </Component>
  );
});

/**
 * Skip link for keyboard navigation.
 * Becomes visible on focus.
 */
export const SkipLink = memo(function SkipLink({ 
  href, 
  children 
}: { 
  href: string; 
  children: ReactNode 
}) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-ios-blue focus:text-white focus:rounded-lg focus:outline-none"
    >
      {children}
    </a>
  );
});

/**
 * Live region for announcing dynamic content to screen readers.
 */
export const LiveRegion = memo(function LiveRegion({
  children,
  politeness = 'polite',
  atomic = true,
}: {
  children: ReactNode;
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  );
});
