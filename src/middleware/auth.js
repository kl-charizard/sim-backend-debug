import { findApiKey, touchApiKey } from '../db.js';

export async function apiKeyAuth(req, res, next) {
  try {
    const header = req.get('x-api-key') || '';
    if (!header) return res.status(401).json({ error: 'missing_api_key' });

    const record = await findApiKey(header);
    if (!record) return res.status(401).json({ error: 'invalid_api_key' });
    if (record.status !== 'active') return res.status(403).json({ error: 'api_key_disabled' });

    req.userKey = { key: record.key, limitPerMin: record.rate_limit_per_min };
    await touchApiKey(record.key);
    next();
  } catch (err) {
    next(err);
  }
}


