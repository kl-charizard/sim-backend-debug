import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { getDatabase, initDatabase } from './db.js';
import { apiKeyAuth } from './middleware/auth.js';
import { perKeyRateLimiter } from './middleware/rateLimit.js';
import adminRouter from './routes/admin.js';
import openrouterRouter from './routes/openrouter.js';
import iflytekRouter from './routes/iflytek.js';
import facefusionRouter from './routes/facefusion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  const app = express();

  // Ensure data directory exists
  const dataDir = path.resolve(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  await initDatabase();

  app.set('trust proxy', 1);
  app.use(helmet());
  const parsedCors = (() => {
    if (!config.CORS_ORIGIN || config.CORS_ORIGIN === '*') return true;
    const list = config.CORS_ORIGIN.split(',').map(v => v.trim()).filter(Boolean);
    return list.length <= 1 ? list[0] : list;
  })();
  app.use(cors({ origin: parsedCors }));
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan(config.LOG_FORMAT));

  // Health check
  app.get('/health', async (req, res) => {
    try {
      const db = await getDatabase();
      db.get('SELECT 1', (err) => {
        if (err) return res.status(500).json({ ok: false, error: 'db_unavailable' });
        res.json({ ok: true, service: 'cloud-proxy-service' });
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: 'init_error' });
    }
  });

  // Admin routes
  app.use('/admin', adminRouter);

  // Protected routes
  app.use('/v1', apiKeyAuth, perKeyRateLimiter, openrouterRouter);
  app.use('/v1', apiKeyAuth, perKeyRateLimiter, iflytekRouter);
  app.use('/v1', apiKeyAuth, perKeyRateLimiter, facefusionRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  // Error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: 'server_error', message: err.message });
  });

  app.listen(config.PORT, () => {
    console.log(`Server listening on http://0.0.0.0:${config.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});


