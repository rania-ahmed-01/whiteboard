// Lightweight JSON file store — no native deps, works on any Node version.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data.json');

let data = { users: [], projects: [], _nextUserId: 1, _nextProjectId: 1 };
if (fs.existsSync(DB_PATH)) {
  try { data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch (e) { console.warn('Failed to parse data.json, starting fresh', e); }
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), (err) => {
      if (err) console.error('DB save failed', err);
    });
  }, 50);
}
const now = () => Math.floor(Date.now() / 1000);

export const Users = {
  findByEmail(email) { return data.users.find(u => u.email === email) || null; },
  findById(id) { return data.users.find(u => u.id === id) || null; },
  create({ email, password, name }) {
    const user = { id: data._nextUserId++, email, password, name: name || null, created_at: now() };
    data.users.push(user); save(); return user;
  }
};

export const Projects = {
  listByUser(userId) {
    return data.projects
      .filter(p => p.user_id === userId)
      .sort((a, b) => b.updated_at - a.updated_at)
      .map(({ data: _d, ...meta }) => meta);
  },
  get(id, userId) {
    return data.projects.find(p => p.id === id && p.user_id === userId) || null;
  },
  create({ user_id, name, data: pdata, thumbnail }) {
    const t = now();
    const p = { id: data._nextProjectId++, user_id, name, data: pdata, thumbnail: thumbnail || null, created_at: t, updated_at: t };
    data.projects.push(p); save(); return p;
  },
  update(id, userId, fields) {
    const p = data.projects.find(x => x.id === id && x.user_id === userId);
    if (!p) return false;
    if (fields.name != null) p.name = fields.name;
    if (fields.data != null) p.data = fields.data;
    if (fields.thumbnail != null) p.thumbnail = fields.thumbnail;
    p.updated_at = now();
    save(); return true;
  },
  remove(id, userId) {
    const idx = data.projects.findIndex(p => p.id === id && p.user_id === userId);
    if (idx === -1) return false;
    data.projects.splice(idx, 1); save(); return true;
  }
};

export default { Users, Projects };
