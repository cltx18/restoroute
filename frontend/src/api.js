// src/api.js
// Tiny fetch wrapper. Uses Vite proxy in dev so we can call /api/* directly.

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('admin_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('admin_token', token);
  else localStorage.removeItem('admin_token');
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* no-op */ }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // Public
  submitLead: (payload) => request('/leads', { method: 'POST', body: payload }),

  // Auth
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/auth/me', { auth: true }),

  // Vendors
  listVendors: () => request('/vendors', { auth: true }),
  createVendor: (payload) => request('/vendors', { method: 'POST', body: payload, auth: true }),
  updateVendor: (id, payload) => request(`/vendors/${id}`, { method: 'PATCH', body: payload, auth: true }),
  deleteVendor: (id) => request(`/vendors/${id}`, { method: 'DELETE', auth: true }),
  reorderVendors: (order) => request('/vendors/reorder', { method: 'POST', body: { order }, auth: true }),
  regeneratePassword: (id) => request(`/vendors/${id}/regenerate-password`, { method: 'POST', auth: true }),

  // Leads / calls
  listLeads: () => request('/leads', { auth: true }),
  listCalls: () => request('/leads/calls', { auth: true }),
};
