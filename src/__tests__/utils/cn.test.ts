import { describe, it, expect } from 'vitest';
import { cn } from '../../utils/cn';

describe('cn (classname utility)', () => {
  it('joins multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', false, 'bar')).toBe('foo bar');
    expect(cn('foo', null, 'bar')).toBe('foo bar');
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    
    expect(cn(
      'base',
      isActive && 'active',
      isDisabled && 'disabled'
    )).toBe('base active');
  });

  it('returns empty string for no valid classes', () => {
    expect(cn()).toBe('');
    expect(cn(false, null, undefined)).toBe('');
  });

  it('handles single class', () => {
    expect(cn('single')).toBe('single');
  });

  it('handles boolean expressions', () => {
    expect(cn(true && 'visible')).toBe('visible');
    expect(cn(false && 'hidden')).toBe('');
  });
});
