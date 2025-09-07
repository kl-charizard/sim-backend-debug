import express from 'express';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { insertApiKey } from '../db.js';

const router = express.Router();

function requireAdmin(req, res, next) {
  const adminKey = req.get('x-admin-key');
  if (!adminKey || adminKey !== config.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'unauthorized_admin' });
  }
  next();
}

// POST /admin/keys -> { rateLimitPerMin?: number }
router.post('/keys', requireAdmin, async (req, res, next) => {
  try {
    const rate = Number(req.body?.rateLimitPerMin || config.DEFAULT_RATE_LIMIT_PER_MIN);
    const key = `sbs_${nanoid(32)}`;
    const record = await insertApiKey(key, rate);
    res.status(201).json({ key: record.key, rateLimitPerMin: record.rate_limit_per_min, status: record.status });
  } catch (err) {
    next(err);
  }
});

export default router;


