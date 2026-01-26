import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  detectLowConfidence,
  suggestComplexIfNeeded,
  UNCERTAINTY_MARKERS,
} from './confidence-detector.js';

describe('UNCERTAINTY_MARKERS', () => {
  test('contains expected hedging words', () => {
    expect(UNCERTAINTY_MARKERS).toContain('probably');
    expect(UNCERTAINTY_MARKERS).toContain('likely');
    expect(UNCERTAINTY_MARKERS).toContain('might');
    expect(UNCERTAINTY_MARKERS).toContain('possibly');
    expect(UNCERTAINTY_MARKERS).toContain('perhaps');
  });

  test('contains uncertainty phrases', () => {
    expect(UNCERTAINTY_MARKERS).toContain('i think');
    expect(UNCERTAINTY_MARKERS).toContain('i believe');
    expect(UNCERTAINTY_MARKERS).toContain('seems like');
    expect(UNCERTAINTY_MARKERS).toContain('appears to');
  });

  test('contains strong uncertainty indicators', () => {
    expect(UNCERTAINTY_MARKERS).toContain('not entirely sure');
    expect(UNCERTAINTY_MARKERS).toContain('difficult to determine');
    expect(UNCERTAINTY_MARKERS).toContain('hard to say');
    expect(UNCERTAINTY_MARKERS).toContain('cannot be certain');
  });
});

describe('detectLowConfidence', () => {
  describe('standard threshold', () => {
    test('returns false for confident response', () => {
      const response = 'The nginx configuration is correct. The server block listens on port 80.';
      expect(detectLowConfidence(response)).toBe(false);
    });

    test('returns false for single uncertainty marker', () => {
      const response = 'The configuration probably works correctly.';
      expect(detectLowConfidence(response)).toBe(false);
    });

    test('returns true for 2+ uncertainty markers', () => {
      const response = 'This probably works, but it might cause issues with the firewall.';
      expect(detectLowConfidence(response)).toBe(true);
    });

    test('returns true for 3 uncertainty markers', () => {
      const response = 'I think this is likely correct, but it could be wrong in some edge cases.';
      expect(detectLowConfidence(response)).toBe(true);
    });
  });

  describe('strong uncertainty phrases', () => {
    test('returns true for "not entirely sure"', () => {
      const response = "I'm not entirely sure what this playbook does.";
      expect(detectLowConfidence(response)).toBe(true);
    });

    test('returns true for "difficult to determine"', () => {
      const response = 'It is difficult to determine the exact cause of the error.';
      expect(detectLowConfidence(response)).toBe(true);
    });

    test('returns true for "hard to say"', () => {
      const response = "It's hard to say why this task is failing.";
      expect(detectLowConfidence(response)).toBe(true);
    });

    test('returns true for "cannot be certain"', () => {
      const response = 'I cannot be certain about the behavior in production.';
      expect(detectLowConfidence(response)).toBe(true);
    });

    test('strong uncertainty overrides high certainty phrases', () => {
      const response = "This clearly works, but I'm not entirely sure about the edge cases.";
      expect(detectLowConfidence(response)).toBe(true);
    });
  });

  describe('high certainty override', () => {
    test('requires 4+ hedges when certainty words present', () => {
      // Has "definitely" but only 2 hedges - should NOT flag as low confidence
      const response = 'This definitely works, though it probably could be improved.';
      expect(detectLowConfidence(response)).toBe(false);
    });

    test('flags with 4+ hedges even with certainty words', () => {
      // Has "certainly" but 4+ hedges - should flag as low confidence
      // Hedges: "i think", "might", "possibly", "could be" = 4 hedges
      const response =
        'This certainly works, but I think it might possibly have issues and could be wrong in some cases.';
      expect(detectLowConfidence(response)).toBe(true);
    });

    test('handles "definitely" certainty word', () => {
      const response = 'This definitely works correctly with the current configuration.';
      expect(detectLowConfidence(response)).toBe(false);
    });

    test('handles "certainly" certainty word', () => {
      const response = 'The syntax is certainly valid for Ansible 2.10.';
      expect(detectLowConfidence(response)).toBe(false);
    });

    test('handles "without a doubt" certainty phrase', () => {
      const response = 'This is without a doubt the correct approach.';
      expect(detectLowConfidence(response)).toBe(false);
    });

    test('handles "clearly" certainty word', () => {
      const response = 'The error is clearly caused by a missing variable.';
      expect(detectLowConfidence(response)).toBe(false);
    });

    test('handles "obviously" certainty word', () => {
      const response = 'This obviously needs a become: true directive.';
      expect(detectLowConfidence(response)).toBe(false);
    });

    test('handles "absolutely" certainty word', () => {
      const response = 'The configuration is absolutely correct.';
      expect(detectLowConfidence(response)).toBe(false);
    });
  });

  describe('case insensitivity', () => {
    test('detects uppercase uncertainty markers', () => {
      const response = 'This PROBABLY works, but it MIGHT fail in production.';
      expect(detectLowConfidence(response)).toBe(true);
    });

    test('detects mixed case uncertainty markers', () => {
      const response = 'I Think this Seems Like a valid configuration.';
      expect(detectLowConfidence(response)).toBe(true);
    });

    test('detects uppercase certainty words', () => {
      const response = 'This DEFINITELY works correctly.';
      expect(detectLowConfidence(response)).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('handles empty string', () => {
      expect(detectLowConfidence('')).toBe(false);
    });

    test('handles very long response', () => {
      const longResponse =
        'The configuration is correct. '.repeat(100) + 'This probably might cause issues.';
      expect(detectLowConfidence(longResponse)).toBe(true);
    });

    test('handles response with only punctuation', () => {
      expect(detectLowConfidence('... --- ???')).toBe(false);
    });

    test('handles response with numbers', () => {
      const response = 'Port 80 is probably correct, but port 443 might be needed too.';
      expect(detectLowConfidence(response)).toBe(true);
    });
  });
});

describe('suggestComplexIfNeeded', () => {
  let consoleOutput: string[];
  const originalLog = console.log;

  beforeEach(() => {
    consoleOutput = [];
    console.log = mock((msg: string) => consoleOutput.push(msg));
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test('does not suggest when --complex already used', () => {
    const uncertainResponse = 'I think this probably might work, but I am not sure.';
    suggestComplexIfNeeded(uncertainResponse, true);

    expect(consoleOutput.length).toBe(0);
  });

  test('suggests --complex for uncertain response', () => {
    const uncertainResponse = 'I think this probably might work.';
    suggestComplexIfNeeded(uncertainResponse, false);

    expect(consoleOutput.length).toBeGreaterThan(0);
    expect(consoleOutput[0]).toContain('--complex');
  });

  test('does not suggest for confident response', () => {
    const confidentResponse = 'The configuration is correct and will work as expected.';
    suggestComplexIfNeeded(confidentResponse, false);

    expect(consoleOutput.length).toBe(0);
  });

  test('mentions Claude Opus in suggestion', () => {
    const uncertainResponse = 'This might possibly work, I believe.';
    suggestComplexIfNeeded(uncertainResponse, false);

    expect(consoleOutput.length).toBeGreaterThan(0);
    expect(consoleOutput[0]).toContain('Opus');
  });
});
