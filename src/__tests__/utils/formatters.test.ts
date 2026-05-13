import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatRelativeTime,
  formatTime,
  formatDate,
  formatFileSize,
  truncate,
} from '../../utils/formatters';

describe('formatters', () => {
  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "Just now" for times less than a minute ago', () => {
      const date = new Date('2024-01-15T11:59:30Z');
      expect(formatRelativeTime(date)).toBe('Just now');
    });

    it('returns minutes for times less than an hour ago', () => {
      const date = new Date('2024-01-15T11:45:00Z');
      expect(formatRelativeTime(date)).toBe('15m');
    });

    it('returns hours for times less than a day ago', () => {
      const date = new Date('2024-01-15T09:00:00Z');
      expect(formatRelativeTime(date)).toBe('3h');
    });

    it('returns "Yesterday" for yesterday', () => {
      const date = new Date('2024-01-14T12:00:00Z');
      expect(formatRelativeTime(date)).toBe('Yesterday');
    });

    it('returns days for times less than a week ago', () => {
      const date = new Date('2024-01-12T12:00:00Z');
      expect(formatRelativeTime(date)).toBe('3d');
    });

    it('returns formatted date for times more than a week ago', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      expect(formatRelativeTime(date)).toBe('Jan 1');
    });
  });

  describe('formatTime', () => {
    it('formats time in 12-hour format', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatTime(date);
      // The exact format depends on locale, but should include time
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('handles midnight', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const result = formatTime(date);
      expect(result).toMatch(/12:00|0:00/);
    });

    it('handles noon', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatTime(date);
      expect(result).toMatch(/12:00/);
    });
  });

  describe('formatDate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "Today" for today', () => {
      const date = new Date('2024-01-15T08:00:00Z');
      expect(formatDate(date)).toBe('Today');
    });

    it('returns "Yesterday" for yesterday', () => {
      const date = new Date('2024-01-14T12:00:00Z');
      expect(formatDate(date)).toBe('Yesterday');
    });

    it('returns weekday name for dates within the last week', () => {
      const date = new Date('2024-01-12T12:00:00Z'); // Friday
      const result = formatDate(date);
      expect(result).toBe('Friday');
    });

    it('returns formatted date for older dates', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const result = formatDate(date);
      expect(result).toContain('January');
      expect(result).toContain('1');
    });

    it('includes year for dates from previous years', () => {
      const date = new Date('2023-01-15T12:00:00Z');
      const result = formatDate(date);
      expect(result).toContain('2023');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });

    it('formats gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
    });
  });

  describe('truncate', () => {
    it('returns original string if shorter than max length', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('returns original string if equal to max length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('truncates and adds ellipsis if longer than max length', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('handles empty string', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('handles max length of 3 (minimum for ellipsis)', () => {
      expect(truncate('Hello', 3)).toBe('...');
    });
  });
});
