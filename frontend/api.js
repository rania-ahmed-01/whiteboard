// ============================================================
//  WhiteBoard API Client — talks to /api/*
// ============================================================
(function () {
  const API_BASE = '/api';
  const TOKEN_KEY = 'wb_token';

  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
  const clearToken = () => localStorage.removeItem(TOKEN_KEY);

  async function request(path, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(API_BASE + path, { ...options, headers });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function uploadFile(file) {
    const token = getToken();
    if (!token) throw new Error('غير مسجل دخول');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(API_BASE + '/uploads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data; // { url, name, size, mime }
  }

  window.WB_API = {
    Auth: {
      isLoggedIn: () => !!getToken(),
      async register(email, password, name) {
        const d = await request('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, name })
        });
        setToken(d.token);
        return d.user;
      },
      async login(email, password) {
        const d = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        setToken(d.token);
        return d.user;
      },
      async me() {
        if (!getToken()) return null;
        try {
          const { user } = await request('/auth/me');
          return user;
        } catch {
          clearToken();
          return null;
        }
      },
      logout: clearToken
    },
    Projects: {
      list: () => request('/projects'),
      get: (id) => request('/projects/' + id),
      create: (name, data, thumbnail) =>
        request('/projects', { method: 'POST', body: JSON.stringify({ name, data, thumbnail }) }),
      update: (id, payload) =>
        request('/projects/' + id, { method: 'PUT', body: JSON.stringify(payload) }),
      remove: (id) => request('/projects/' + id, { method: 'DELETE' })
    },
    Uploads: {
      file: uploadFile
    }
  };
})();
