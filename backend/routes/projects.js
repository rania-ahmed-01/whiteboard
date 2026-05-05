import { Router } from 'express';
import { Projects } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res, next) => {
  try {
    res.json(await Projects.listByUser(req.user.id));
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const p = await Projects.get(id, req.user.id);
    if (!p) return res.status(404).json({ error: 'غير موجود' });
    res.json(p);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, data, thumbnail } = req.body || {};
    if (!name || !data) return res.status(400).json({ error: 'الاسم والبيانات مطلوبان' });
    const p = await Projects.create({ user_id: req.user.id, name, data, thumbnail });
    res.json({ id: p.id });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { name, data, thumbnail } = req.body || {};
    const ok = await Projects.update(id, req.user.id, { name, data, thumbnail });
    if (!ok) return res.status(404).json({ error: 'غير موجود' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const ok = await Projects.remove(id, req.user.id);
    res.json({ ok });
  } catch (e) { next(e); }
});

export default router;
