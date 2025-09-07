import rateLimit from 'express-rate-limit';

// Single limiter instance; dynamic max and key per request
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req, _res) => req.userKey?.limitPerMin || 60,
  keyGenerator: (req, _res) => req.userKey?.key || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', retry_after_ms: 60 * 1000 },
});

export const perKeyRateLimiter = limiter;


