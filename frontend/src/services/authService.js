import API from './api';

export const registerUser = (data) =>
  API.post('/register', {
    username: data.username.trim(),
    secret_chars: data.secretChars,
  });

export const startLogin = (username) =>
  API.get('/login/start', { params: { username: username.trim() } });

export const verifyLogin = (data) => API.post('/login/verify', data);
