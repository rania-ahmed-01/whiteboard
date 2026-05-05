import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import uploadRoutes from './routes/uploads.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, time: Date.now() }));

// Static frontend (sibling folder)
const clientDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(clientDir));
app.get(/^(?!\/api).*/, (req, res, next) => {
  const idx = path.join(clientDir, 'index.html');
  if (fs.existsSync(idx)) res.sendFile(idx);
  else next();
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

try {
  await initDb();
  console.log('✓ PostgreSQL connected — schema ready');
} catch (err) {
  console.error('✗ Failed to initialize PostgreSQL:', err.message);
  console.error('  Set DATABASE_URL or ensure database "whiteboard" exists with user "postgres".');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  WhiteBoard Studio Server                ║`);
  console.log(`  ║  → http://localhost:${PORT}                  ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});
