export const config = {
  PORT: process.env.PORT || 8080,
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  LOG_FORMAT: process.env.LOG_FORMAT || 'tiny',

  // Admin
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || '',

  // Database
  DATABASE_FILE: process.env.DATABASE_FILE || new URL('../data/db.sqlite', import.meta.url).pathname,

  // Provider keys (server-side)
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_REFERER: process.env.OPENROUTER_REFERER || '',
  OPENROUTER_TITLE: process.env.OPENROUTER_TITLE || 'SoundBySound Slowly',

  IFLYTEK_BASE_URL: process.env.IFLYTEK_BASE_URL || '',
  IFLYTEK_API_KEY: process.env.IFLYTEK_API_KEY || '',
  IFLYTEK_APP_ID: process.env.IFLYTEK_APP_ID || '',
  IFLYTEK_API_SECRET: process.env.IFLYTEK_API_SECRET || '',

  FACEFUSION_BASE_URL: process.env.FACEFUSION_BASE_URL || '',
  FACEFUSION_API_KEY: process.env.FACEFUSION_API_KEY || '',

  // Limits
  DEFAULT_RATE_LIMIT_PER_MIN: Number(process.env.DEFAULT_RATE_LIMIT_PER_MIN || 60),
};


