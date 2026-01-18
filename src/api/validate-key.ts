/**
 * API key validation via Anthropic's token counting endpoint.
 *
 * Validates API key without consuming tokens by using the
 * /v1/messages/count_tokens endpoint.
 */

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an API key against Anthropic's API.
 *
 * Uses the token counting endpoint which doesn't consume tokens,
 * making it ideal for validation purposes.
 *
 * @param apiKey - The API key to validate
 * @returns ValidationResult with valid status and optional error message
 */
export async function validateApiKey(apiKey: string): Promise<ValidationResult> {
  try {
    const response = await fetch(`${ANTHROPIC_API_BASE}/messages/count_tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (response.status === 403) {
      return { valid: false, error: 'API key lacks required permissions' };
    }

    // Try to parse error message from response
    const data = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    return {
      valid: false,
      error: data.error?.message || `API error: ${response.status}`,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}
