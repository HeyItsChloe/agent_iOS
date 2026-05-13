/**
 * Utility function for conditionally joining class names.
 * Inspired by clsx/classnames but kept simple.
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
