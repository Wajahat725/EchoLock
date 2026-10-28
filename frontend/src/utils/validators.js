import { MIN_USERNAME_LENGTH, SECRET_CHAR_COUNT } from './constants';

/**
 * @param {string} username
 * @returns {string|null}
 */
export const validateUsername = (username) => {
  const trimmed = username?.trim() ?? '';
  if (!trimmed) return 'Username is required';
  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters`;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return 'Username may only contain letters, numbers, and underscores';
  }
  return null;
};

/**
 * Parses comma-separated secret characters into an array.
 * @param {string} input
 * @returns {{ chars: string[]|null, error: string|null }}
 */
export const parseSecretChars = (input) => {
  const raw = input?.trim() ?? '';
  if (!raw) return { chars: null, error: 'Secret characters are required' };

  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length !== SECRET_CHAR_COUNT) {
    return {
      chars: null,
      error: `Enter exactly ${SECRET_CHAR_COUNT} characters, comma-separated (e.g. A, B, C)`,
    };
  }

  for (const part of parts) {
    if (part.length !== 1) {
      return { chars: null, error: 'Each secret must be a single character' };
    }
  }

  return { chars: parts, error: null };
};
