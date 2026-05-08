// src/api.js
const API_BASE = '/api';

// --- Admin token ---
export function getToken() {
  return localStorage.getItem('admin_token');
}
export function setToken(token) {
  if (token) localStorage.setItem('admin_token', token);
  else localStorage.removeItem('admin_token');
}

// --- Vendor token ---
export function getVendorToken() {
  return localStorage.getItem('vendor_token');
}
export function setVendorToken(token) {
  if (token) localStorage.setItem('vendor_token', token);
  else localStorage.removeItem('vendor_token');
}

async function request(path, { method = 'GET', body, tokenType = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (tokenType === 'admin') {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  } else if (tokenType === 'vendor') {
    const t = getVendorToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* */ }

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

  // Admin auth
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/auth/me', { tokenType: 'admin' }),

  // Admin vendors
  listVendors: () => request('/vendors', { tokenType: 'admin' }),
  createVendor: (payload) => request('/vendors', { method: 'POST', body: payload, tokenType: 'admin' }),
  updateVendor: (id, payload) => request(`/vendors/${id}`, { method: 'PATCH', body: payload, tokenType: 'admin' }),
  deleteVendor: (id) => request(`/vendors/${id}`, { method: 'DELETE', tokenType: 'admin' }),
  reorderVendors: (order) => request('/vendors/reorder', { method: 'POST', body: { order }, tokenType: 'admin' }),
  regeneratePassword: (id) => request(`/vendors/${id}/regenerate-password`, { method: 'POST', tokenType: 'admin' }),

  // Admin leads / calls
  listLeads: () => request('/leads', { tokenType: 'admin' }),
  updateLead: (id, payload) => request(`/leads/${id}`, { method: 'PATCH', body: payload, tokenType: 'admin' }),
  listCalls: () => request('/leads/calls', { tokenType: 'admin' }),
  updateCallNotes: (id, notes) => request(`/leads/calls/${id}`, { method: 'PATCH', body: { notes }, tokenType: 'admin' }),
};

export const vendorApi = {
  login: (email, password) => request('/vendor/login', { method: 'POST', body: { email, password } }),
  me: () => request('/vendor/me', { tokenType: 'vendor' }),
  updateProfile: (payload) => request('/vendor/me', { method: 'PATCH', body: payload, tokenType: 'vendor' }),
  togglePause: (is_active) => request('/vendor/me/pause', { method: 'POST', body: { is_active }, tokenType: 'vendor' }),
  changePassword: (current_password, new_password) =>
    request('/vendor/me/change-password', { method: 'POST', body: { current_password, new_password }, tokenType: 'vendor' }),
  stats: () => request('/vendor/stats', { tokenType: 'vendor' }),
  calls: () => request('/vendor/calls', { tokenType: 'vendor' }),
  updateCallNotes: (id, notes) => request(`/vendor/calls/${id}`, { method: 'PATCH', body: { notes }, tokenType: 'vendor' }),
  leads: () => request('/vendor/leads', { tokenType: 'vendor' }),
  updateLead: (id, payload) => request(`/vendor/leads/${id}`, { method: 'PATCH', body: payload, tokenType: 'vendor' }),
};
