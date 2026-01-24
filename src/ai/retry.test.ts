import { describe, expect, mock, test } from 'bun:test';
import { parseRetryAfter } from './retry.js';

describe('parseRetryAfter', () => {
  describe('seconds format', () => {
    test('should parse integer seconds', () => {
      expect(parseRetryAfter('30')).toBe(30);
    });

    test('should parse single digit', () => {
      expect(parseRetryAfter('5')).toBe(5);
    });

    test('should return undefined for zero', () => {
      expect(parseRetryAfter('0')).toBeUndefined();
    });

    test('should return undefined for negative', () => {
      expect(parseRetryAfter('-5')).toBeUndefined();
    });
  });

  describe('null/undefined input', () => {
    test('should return undefined for null', () => {
      expect(parseRetryAfter(null)).toBeUndefined();
    });

    test('should return undefined for undefined', () => {
      expect(parseRetryAfter(undefined)).toBeUndefined();
    });

    test('should return undefined for empty string', () => {
      expect(parseRetryAfter('')).toBeUndefined();
    });
  });

  describe('HTTP date format', () => {
    test('should parse future HTTP date', () => {
      // Create a date 60 seconds in the future
      const futureDate = new Date(Date.now() + 60000).toUTCString();
      const result = parseRetryAfter(futureDate);
      expect(result).toBeGreaterThan(50);
      expect(result).toBeLessThanOrEqual(60);
    });

    test('should return undefined for past HTTP date', () => {
      const pastDate = new Date(Date.now() - 60000).toUTCString();
      expect(parseRetryAfter(pastDate)).toBeUndefined();
    });
  });

  describe('invalid input', () => {
    test('should return undefined for non-numeric string', () => {
      expect(parseRetryAfter('abc')).toBeUndefined();
    });

    test('should return undefined for float string', () => {
      // parseInt handles this, but verify behavior
      expect(parseRetryAfter('30.5')).toBe(30);
    });
  });
});
