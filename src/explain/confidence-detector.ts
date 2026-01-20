import chalk from 'chalk';

/**
 * Linguistic uncertainty markers that indicate low confidence in LLM responses.
 * Based on hedging language research.
 */
export const UNCERTAINTY_MARKERS = [
  'probably',
  'likely',
  'might',
  'possibly',
  'perhaps',
  'i think',
  'i believe',
  'seems like',
  'appears to',
  'not entirely sure',
  'could be',
  'may be',
  'unclear',
  'ambiguous',
  'difficult to determine',
  'hard to say',
  'cannot be certain',
  'unsure',
  'uncertain',
  'not certain',
] as const;

/**
 * High-certainty phrases that indicate the response is definitive
 * despite containing uncertainty markers.
 */
const HIGH_CERTAINTY_PHRASES = [
  'definitely',
  'certainly',
  'without a doubt',
  'clearly',
  'obviously',
  'absolutely',
] as const;

/**
 * Detect low confidence in LLM response based on hedging language.
 * Returns true if response shows uncertainty (2+ markers or specific phrases).
 */
export function detectLowConfidence(response: string): boolean {
  const lowerResponse = response.toLowerCase();

  // Check for high certainty first - if present, likely not low confidence
  const hasCertainty = HIGH_CERTAINTY_PHRASES.some(phrase =>
    lowerResponse.includes(phrase)
  );

  // Count uncertainty markers
  const hedgeCount = UNCERTAINTY_MARKERS.filter(marker =>
    lowerResponse.includes(marker)
  ).length;

  // Specific high-uncertainty phrases automatically indicate low confidence
  const hasStrongUncertainty =
    lowerResponse.includes('not entirely sure') ||
    lowerResponse.includes('difficult to determine') ||
    lowerResponse.includes('hard to say') ||
    lowerResponse.includes('cannot be certain');

  // If strong uncertainty phrases present, return true regardless of certainty
  if (hasStrongUncertainty) {
    return true;
  }

  // If high certainty present, require more hedges to flag as uncertain
  if (hasCertainty) {
    return hedgeCount >= 4; // Higher threshold with certainty language
  }

  // Standard threshold: 2+ uncertainty markers
  return hedgeCount >= 2;
}

/**
 * Suggest using --complex flag if Sonnet response shows uncertainty.
 * Only suggests if --complex wasn't already used.
 */
export function suggestComplexIfNeeded(
  response: string,
  usedComplex: boolean
): void {
  if (usedComplex) {
    return; // Already using Opus, no need to suggest
  }

  if (detectLowConfidence(response)) {
    console.log(
      chalk.yellow(
        '\nTip: This analysis shows uncertainty. Try --complex for deeper analysis with Claude Opus.'
      )
    );
  }
}
