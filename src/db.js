import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';

let dbInstance = null;

export async function getDatabase() {
  if (dbInstance) return dbInstance;
  // Ensure parent directory exists
  const dbDir = path.dirname(config.DATABASE_FILE);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  dbInstance = new sqlite3.Database(config.DATABASE_FILE);
  return dbInstance;
}

export async function initDatabase() {
  const db = await getDatabase();
  await run(db, `CREATE TABLE IF NOT EXISTS api_keys (
    key TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'active',
    rate_limit_per_min INTEGER NOT NULL DEFAULT ${config.DEFAULT_RATE_LIMIT_PER_MIN},
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT
  )`);
}

export function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

export function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function(err, row) {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

export async function findApiKey(key) {
  const db = await getDatabase();
  return get(db, 'SELECT key, status, rate_limit_per_min, created_at, last_used_at FROM api_keys WHERE key = ?', [key]);
}

export async function insertApiKey(key, rateLimitPerMin) {
  const db = await getDatabase();
  await run(db, 'INSERT INTO api_keys (key, rate_limit_per_min) VALUES (?, ?)', [key, rateLimitPerMin]);
  return findApiKey(key);
}

export async function touchApiKey(key) {
  const db = await getDatabase();
  await run(db, "UPDATE api_keys SET last_used_at = datetime('now') WHERE key = ?", [key]);
}


