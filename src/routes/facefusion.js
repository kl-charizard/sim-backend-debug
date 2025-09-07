import express from 'express';
import axios from 'axios';
import { config } from '../config.js';

const router = express.Router();

// POST /v1/facefusion/swap { targetImageUrl, sourceFaceUrl }
router.post('/facefusion/swap', async (req, res, next) => {
  try {
    const { targetImageUrl, sourceFaceUrl } = req.body || {};
    if (!config.FACEFUSION_BASE_URL) return res.status(500).json({ error: 'facefusion_not_configured' });

    const response = await axios.post(`${config.FACEFUSION_BASE_URL.replace(/\/$/, '')}/swap`, {
      targetImageUrl,
      sourceFaceUrl,
    }, {
      headers: { 'Authorization': `Bearer ${config.FACEFUSION_API_KEY}` },
      timeout: 120000,
    });

    res.json(response.data);
  } catch (err) {
    if (err.response) {
      res.status(err.response.status || 502).json(err.response.data);
    } else {
      next(err);
    }
  }
});

export default router;


