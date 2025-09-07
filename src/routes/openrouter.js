import express from 'express';
import axios from 'axios';
import { config } from '../config.js';

const router = express.Router();

// POST /v1/openrouter/chat/completions -> proxy to OpenRouter
router.post('/openrouter/chat/completions', async (req, res, next) => {
  try {
    const { model, messages, temperature, top_p, max_tokens, stream, ...rest } = req.body || {};

    const payload = {
      model,
      messages,
      temperature,
      top_p,
      max_tokens,
      stream,
      ...rest,
    };

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, {
      headers: {
        'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
        'HTTP-Referer': config.OPENROUTER_REFERER,
        'X-Title': config.OPENROUTER_TITLE,
      },
      responseType: stream ? 'stream' : 'json',
      timeout: 60000,
    });

    if (stream && response.data?.pipe) {
      res.setHeader('Content-Type', 'text/event-stream');
      response.data.pipe(res);
    } else {
      res.json(response.data);
    }
  } catch (err) {
    if (err.response) {
      res.status(err.response.status || 502).json(err.response.data);
    } else {
      next(err);
    }
  }
});

export default router;


