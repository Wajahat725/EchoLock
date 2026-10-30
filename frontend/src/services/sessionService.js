import API from './api';

export const getLoginHistory = (username) =>
  API.get('/dashboard/history', { params: { username } });

export const getLeakageReport = (username) =>
  API.get('/dashboard/leakage', { params: { username } });