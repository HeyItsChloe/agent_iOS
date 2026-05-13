/**
 * Format a date as a relative time string (e.g., "2 min ago", "Yesterday").
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'Just now';
  }
  if (diffMin < 60) {
    return `${diffMin}m`;
  }
  if (diffHour < 24) {
    return `${diffHour}h`;
  }
  if (diffDay === 1) {
    return 'Yesterday';
  }
  if (diffDay < 7) {
    return `${diffDay}d`;
  }
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Format a time as HH:MM (12-hour format).
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date as a display string for message grouping.
 */
export function formatDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateDay.getTime() === today.getTime()) {
    return 'Today';
  }
  if (dateDay.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  
  const diffDays = Math.floor((today.getTime() - dateDay.getTime()) / 86400000);
  
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: dateDay.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format a file size in bytes to human readable format.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
