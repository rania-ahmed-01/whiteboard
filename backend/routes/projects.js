import { Router } from 'express';
import { Projects } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', (req, res) => {
  res.json(Projects.listByUser(req.user.id));
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const p = Projects.get(id, req.user.id);
  if (!p) return res.status(404).json({ error: 'غير موجود' });
  res.json(p);
});

router.post('/', (req, res) => {
  const { name, data, thumbnail } = req.body || {};
  if (!name || !data) return res.status(400).json({ error: 'الاسم والبيانات مطلوبان' });
  const p = Projects.create({ user_id: req.user.id, name, data, thumbnail });
  res.json({ id: p.id });
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, data, thumbnail } = req.body || {};
  const ok = Projects.update(id, req.user.id, { name, data, thumbnail });
  if (!ok) return res.status(404).json({ error: 'غير موجود' });
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const ok = Projects.remove(id, req.user.id);
  res.json({ ok });
});

export default router;
