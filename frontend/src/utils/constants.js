export const GRID_SIZE = 5;
export const MIN_USERNAME_LENGTH = 3;
export const REQUIRED_SECRET_CHARS = 8;

// Shoulder-surfing / screen-recording countermeasure: on top of the 8 real
// secret characters, the user adds a few decoy clicks anywhere on the grid.
// An observer sees TOTAL_CLICKS clicks total and can't tell which ones are real.
export const DECOY_CLICKS = 4;
export const TOTAL_CLICKS = REQUIRED_SECRET_CHARS + DECOY_CLICKS;

export const ROUTES = {
  HOME: '/',
  REGISTER: '/register',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
};

export const LEAKAGE_STATUS = {
  SAFE: 'safe',
  WARNING: 'warning',
  LEAKAGE: 'leakage',
};

export const AUTH_STORAGE_KEY = 'echolock_auth';