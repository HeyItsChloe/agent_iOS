import { 
  useRef, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((item: T, index: number) => number);
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
  onScrollToBottom?: () => void;
  scrollToBottomThreshold?: number;
}

/**
 * Virtual scrolling list for efficient rendering of large lists.
 * Only renders items that are visible in the viewport plus overscan.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 3,
  className,
  onScrollToBottom,
  scrollToBottomThreshold = 100,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Calculate item heights
  const getItemHeight = useCallback((item: T, index: number) => {
    return typeof itemHeight === 'function' ? itemHeight(item, index) : itemHeight;
  }, [itemHeight]);

  // Calculate total height and item positions
  const { totalHeight, itemPositions } = useMemo(() => {
    const positions: number[] = [];
    let total = 0;
    
    for (let i = 0; i < items.length; i++) {
      positions.push(total);
      total += getItemHeight(items[i], i);
    }
    
    return { totalHeight: total, itemPositions: positions };
  }, [items, getItemHeight]);

  // Find visible range
  const { startIndex, endIndex } = useMemo(() => {
    if (items.length === 0) {
      return { startIndex: 0, endIndex: 0 };
    }

    // Binary search for start index
    let start = 0;
    let end = items.length - 1;
    
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if (itemPositions[mid] + getItemHeight(items[mid], mid) < scrollTop) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    
    const startIdx = Math.max(0, start - overscan);
    
    // Find end index
    let endIdx = start;
    let currentHeight = itemPositions[start];
    
    while (endIdx < items.length && currentHeight < scrollTop + containerHeight) {
      currentHeight += getItemHeight(items[endIdx], endIdx);
      endIdx++;
    }
    
    endIdx = Math.min(items.length, endIdx + overscan);
    
    return { startIndex: startIdx, endIndex: endIdx };
  }, [items, itemPositions, scrollTop, containerHeight, overscan, getItemHeight]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop: newScrollTop, scrollHeight, clientHeight } = containerRef.current;
    setScrollTop(newScrollTop);
    
    // Check if scrolled to bottom
    if (onScrollToBottom && scrollHeight - newScrollTop - clientHeight < scrollToBottomThreshold) {
      onScrollToBottom();
    }
  }, [onScrollToBottom, scrollToBottomThreshold]);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    setContainerHeight(containerRef.current.clientHeight);
    
    return () => resizeObserver.disconnect();
  }, []);

  // Visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) => {
      const actualIndex = startIndex + index;
      const top = itemPositions[actualIndex];
      
      return (
        <div
          key={actualIndex}
          style={{
            position: 'absolute',
            top,
            left: 0,
            right: 0,
            height: getItemHeight(item, actualIndex),
          }}
        >
          {renderItem(item, actualIndex)}
        </div>
      );
    });
  }, [items, startIndex, endIndex, itemPositions, renderItem, getItemHeight]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn('overflow-auto relative', className)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}

/**
 * Hook for scroll-to-bottom functionality.
 */
export function useScrollToBottom(ref: React.RefObject<HTMLElement>) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior,
      });
    }
  }, [ref]);
  
  const checkIfAtBottom = useCallback(() => {
    if (!ref.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = ref.current;
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
  }, [ref]);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    element.addEventListener('scroll', checkIfAtBottom);
    return () => element.removeEventListener('scroll', checkIfAtBottom);
  }, [ref, checkIfAtBottom]);
  
  return { isAtBottom, scrollToBottom };
}
