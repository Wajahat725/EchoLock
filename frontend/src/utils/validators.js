// frontend/src/utils/validations.js
import { MIN_USERNAME_LENGTH, REQUIRED_SECRET_CHARS } from './constants';

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

export const parseSecretChars = (input) => {
  const raw = input?.trim() ?? '';
  if (!raw) return { chars: null, error: 'Secret characters are required' };

  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);

  if (parts.length !== REQUIRED_SECRET_CHARS) {
    return {
      chars: null,
      error: `Enter exactly ${REQUIRED_SECRET_CHARS} characters, comma-separated`,
    };
  }

  for (const part of parts) {
    if (part.length !== 1) {
      return { chars: null, error: 'Each secret must be a single character' };
    }
  }

  const unique = new Set(parts.map((p) => p.toUpperCase()));
  if (unique.size !== parts.length) {
    return { chars: null, error: 'Secret characters must be unique (no repeats)' };
  }

  return { chars: parts, error: null };
};