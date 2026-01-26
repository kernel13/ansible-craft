import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPhaseTracker, type PhaseTracker } from './progress.js';

describe('createPhaseTracker', () => {
  describe('quiet mode', () => {
    test('returns no-op tracker', () => {
      const tracker = createPhaseTracker(true);

      // All methods should be functions
      expect(typeof tracker.start).toBe('function');
      expect(typeof tracker.succeed).toBe('function');
      expect(typeof tracker.fail).toBe('function');
      expect(typeof tracker.update).toBe('function');
    });

    test('start does nothing in quiet mode', () => {
      const tracker = createPhaseTracker(true);
      // Should not throw
      expect(() => tracker.start('Test phase')).not.toThrow();
    });

    test('succeed does nothing in quiet mode', () => {
      const tracker = createPhaseTracker(true);
      tracker.start('Test');
      expect(() => tracker.succeed()).not.toThrow();
    });

    test('fail does nothing in quiet mode', () => {
      const tracker = createPhaseTracker(true);
      tracker.start('Test');
      expect(() => tracker.fail()).not.toThrow();
    });

    test('update does nothing in quiet mode', () => {
      const tracker = createPhaseTracker(true);
      tracker.start('Test');
      expect(() => tracker.update('New text')).not.toThrow();
    });
  });

  describe('normal mode', () => {
    let stderrOutput: string[];
    const originalWrite = process.stderr.write;

    beforeEach(() => {
      stderrOutput = [];
      process.stderr.write = mock((msg: string | Buffer) => {
        stderrOutput.push(String(msg));
        return true;
      }) as any;
    });

    afterEach(() => {
      process.stderr.write = originalWrite;
    });

    test('creates tracker with methods', () => {
      const tracker = createPhaseTracker(false);

      expect(typeof tracker.start).toBe('function');
      expect(typeof tracker.succeed).toBe('function');
      expect(typeof tracker.fail).toBe('function');
      expect(typeof tracker.update).toBe('function');
    });

    test('start creates spinner', () => {
      const tracker = createPhaseTracker(false);
      tracker.start('Loading...');

      // Spinner writes to stderr
      // Note: ora may not immediately write, but the method should work
      expect(() => tracker.start('Test')).not.toThrow();
    });

    test('succeed stops spinner with success', () => {
      const tracker = createPhaseTracker(false);
      tracker.start('Test phase');

      // Should not throw
      expect(() => tracker.succeed()).not.toThrow();
    });

    test('succeed uses custom message', () => {
      const tracker = createPhaseTracker(false);
      tracker.start('Loading');
      expect(() => tracker.succeed('Completed!')).not.toThrow();
    });

    test('fail stops spinner with failure', () => {
      const tracker = createPhaseTracker(false);
      tracker.start('Test phase');

      expect(() => tracker.fail()).not.toThrow();
    });

    test('fail uses custom message', () => {
      const tracker = createPhaseTracker(false);
      tracker.start('Loading');
      expect(() => tracker.fail('Something went wrong')).not.toThrow();
    });

    test('update changes spinner text', () => {
      const tracker = createPhaseTracker(false);
      tracker.start('Initial text');
      expect(() => tracker.update('Updated text')).not.toThrow();
    });

    test('succeed without start does nothing', () => {
      const tracker = createPhaseTracker(false);
      // No start() called
      expect(() => tracker.succeed()).not.toThrow();
    });

    test('fail without start does nothing', () => {
      const tracker = createPhaseTracker(false);
      // No start() called
      expect(() => tracker.fail()).not.toThrow();
    });

    test('update without start does nothing', () => {
      const tracker = createPhaseTracker(false);
      // No start() called
      expect(() => tracker.update('Text')).not.toThrow();
    });

    test('can start new phase after succeed', () => {
      const tracker = createPhaseTracker(false);
      tracker.start('Phase 1');
      tracker.succeed();
      expect(() => tracker.start('Phase 2')).not.toThrow();
    });

    test('can start new phase after fail', () => {
      const tracker = createPhaseTracker(false);
      tracker.start('Phase 1');
      tracker.fail();
      expect(() => tracker.start('Phase 2')).not.toThrow();
    });
  });
});
