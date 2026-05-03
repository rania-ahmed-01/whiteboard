import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Users } from '../db.js';
import { JWT_SECRET, authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/register', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'البريد وكلمة السر مطلوبان' });
  if (password.length < 6) return res.status(400).json({ error: 'كلمة السر قصيرة (٦ أحرف على الأقل)' });
  if (Users.findByEmail(email)) return res.status(409).json({ error: 'البريد مسجل بالفعل' });
  const hash = bcrypt.hashSync(password, 10);
  const user = Users.create({ email, password: hash, name });
  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'البريد وكلمة السر مطلوبان' });
  const user = Users.findByEmail(email);
  if (!user) return res.status(401).json({ error: 'بيانات غير صحيحة' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'بيانات غير صحيحة' });
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

router.get('/me', authRequired, (req, res) => {
  const user = Users.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

export default router;
