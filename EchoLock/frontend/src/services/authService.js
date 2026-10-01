import API from './api';

/**
 * @param {{ username: string, secretChars: string }} data
 */
export const registerUser = (data) =>
  API.post('/register', {
    username: data.username.trim(),
    secret_chars: data.secretChars,
  });

export const startLogin = (username) =>
  API.get('/login/start', { params: { username: username.trim() } });

/**
 * @param {{ session_id: string, positions: { row: number, col: number }[] }} data
 */
export const verifyLogin = (data) => API.post('/login/verify', data);
