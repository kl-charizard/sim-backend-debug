import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config.js';

const router = express.Router();

function buildIflytekAuthHeaders(host, path, date) {
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const signatureSha = crypto.createHmac('sha256', config.IFLYTEK_API_SECRET).update(signatureOrigin).digest('base64');
  const authorization = `api_key=\"${config.IFLYTEK_API_KEY}\", algorithm=\"hmac-sha256\", headers=\"host date request-line\", signature=\"${signatureSha}\"`;
  return {
    Authorization: authorization,
    Date: date,
    Host: host,
  };
}

// Example proxy for iFlytek webtts or other REST API depending on your usage
// POST /v1/iflytek/tts { text, voice, format }
router.post('/iflytek/tts', async (req, res, next) => {
  try {
    const { text, voice = 'xiaoyan', format = 'mp3' } = req.body || {};
    if (!config.IFLYTEK_BASE_URL) return res.status(500).json({ error: 'iflytek_not_configured' });

    const url = new URL(config.IFLYTEK_BASE_URL);
    const host = url.host;
    const path = url.pathname || '/';
    const date = new Date().toUTCString();
    const headers = buildIflytekAuthHeaders(host, path, date);

    const response = await axios.post(config.IFLYTEK_BASE_URL, { text, voice, format }, { headers, responseType: 'arraybuffer' });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(response.data);
  } catch (err) {
    if (err.response) {
      res.status(err.response.status || 502).json(err.response.data);
    } else {
      next(err);
    }
  }
});

export default router;


