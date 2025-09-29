const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const morgan = require('morgan');
const compression = require('compression');
const { body, validationResult } = require('express-validator');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 11434;

// Hardcoded OpenRouter API key as requested
const OPENROUTER_API_KEY = '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';

// In-memory storage for API keys (in production, use a database)
const apiKeys = new Map();

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: {
      message: 'Too many requests from this IP, please try again later.',
      type: 'rate_limit_exceeded',
      code: 'rate_limit_exceeded'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/v1', limiter);

// API Key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: {
        message: 'API key required. Please include x-api-key header.',
        type: 'invalid_request_error',
        code: 'missing_api_key'
      }
    });
  }

  // Check if API key exists and is valid
  const keyData = apiKeys.get(apiKey);
  if (!keyData) {
    return res.status(401).json({
      error: {
        message: 'Invalid API key',
        type: 'invalid_request_error',
        code: 'invalid_api_key'
      }
    });
  }

  // Check if key has expired
  if (keyData.expiry !== 'Never' && new Date() > new Date(keyData.expiry)) {
    apiKeys.delete(apiKey);
    return res.status(401).json({
      error: {
        message: 'API key has expired',
        type: 'invalid_request_error',
        code: 'expired_api_key'
      }
    });
  }

  // Add key data to request for logging
  req.apiKeyData = keyData;
  next();
};

// Serve admin interface
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Sound by Sound Slowly API Service',
    version: '1.0.0',
    openrouterKey: OPENROUTER_API_KEY.substring(0, 20) + '...'
  });
});

// API Key management endpoints
app.post('/admin/api-keys', (req, res) => {
  try {
    const { appName, developer, email, purpose, rateLimit, expiry } = req.body;
    
    // Generate API key
    const apiKey = 'sbs_' + require('crypto').randomBytes(16).toString('hex');
    const timestamp = new Date().toISOString();
    const expiryDate = expiry === 0 ? 'Never' : new Date(Date.now() + expiry * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const keyData = {
      key: apiKey,
      appName,
      developer,
      email,
      purpose,
      rateLimit: parseInt(rateLimit),
      expiry: expiryDate,
      createdAt: timestamp,
      lastUsed: null,
      requestCount: 0
    };
    
    apiKeys.set(apiKey, keyData);
    
    res.json({
      success: true,
      apiKey,
      keyData
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Failed to generate API key',
        type: 'internal_error',
        code: 'key_generation_failed'
      }
    });
  }
});

app.get('/admin/api-keys', (req, res) => {
  const keys = Array.from(apiKeys.values()).map(key => ({
    appName: key.appName,
    developer: key.developer,
    email: key.email,
    purpose: key.purpose,
    rateLimit: key.rateLimit,
    expiry: key.expiry,
    createdAt: key.createdAt,
    lastUsed: key.lastUsed,
    requestCount: key.requestCount
  }));
  
  res.json({ keys });
});

app.delete('/admin/api-keys/:key', (req, res) => {
  const { key } = req.params;
  
  if (apiKeys.has(key)) {
    apiKeys.delete(key);
    res.json({ success: true, message: 'API key deleted successfully' });
  } else {
    res.status(404).json({
      error: {
        message: 'API key not found',
        type: 'not_found',
        code: 'key_not_found'
      }
    });
  }
});

// OpenAI compatible endpoints
app.get('/v1/models', validateApiKey, async (req, res) => {
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Filter to only show GPT-4o-mini and related models
    const filteredModels = response.data.data.filter(model => 
      model.id.includes('gpt-4o-mini') || 
      model.id.includes('openai/gpt-4o-mini') ||
      model.id.includes('gpt-4o')
    );
    
    res.json({
      object: 'list',
      data: filteredModels
    });
  } catch (error) {
    console.error('Error fetching models:', error.message);
    res.status(500).json({
      error: {
        message: 'Failed to fetch models',
        type: 'api_error',
        code: 'models_fetch_error'
      }
    });
  }
});

// Chat completions endpoint
app.post('/v1/chat/completions', 
  validateApiKey,
  [
    body('model').notEmpty().withMessage('Model is required'),
    body('messages').isArray({ min: 1 }).withMessage('Messages must be a non-empty array'),
    body('messages.*.role').isIn(['system', 'user', 'assistant']).withMessage('Invalid message role'),
    body('messages.*.content').notEmpty().withMessage('Message content is required')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            message: 'Invalid request parameters',
            type: 'invalid_request_error',
            code: 'invalid_parameters',
            details: errors.array()
          }
        });
      }

      const { model, messages, ...otherParams } = req.body;
      
      // Map model to OpenRouter format if needed
      let openRouterModel = model;
      if (model === 'gpt-4o-mini') {
        openRouterModel = 'openai/gpt-4o-mini';
      }

      // Prepare request for OpenRouter
      const openRouterRequest = {
        model: openRouterModel,
        messages: messages,
        ...otherParams
      };

      // Add speech learning context to system messages
      const enhancedMessages = messages.map(msg => {
        if (msg.role === 'system') {
          return {
            ...msg,
            content: `${msg.content}\n\nContext: You are helping with speech learning for hearing-impaired users. Provide clear, encouraging, and educational responses focused on pronunciation, speech therapy, and communication skills.`
          };
        }
        return msg;
      });

      openRouterRequest.messages = enhancedMessages;

      // Update request count for API key
      if (req.apiKeyData) {
        req.apiKeyData.requestCount++;
        req.apiKeyData.lastUsed = new Date().toISOString();
      }

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        openRouterRequest,
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://soundbysoundslowly.com',
            'X-Title': 'Sound by Sound Slowly API Service'
          }
        }
      );

      // Return OpenAI compatible response
      res.json(response.data);

    } catch (error) {
      console.error('Error in chat completions:', error.message);
      
      if (error.response) {
        // OpenRouter API error
        res.status(error.response.status).json({
          error: {
            message: error.response.data?.error?.message || 'OpenRouter API error',
            type: 'api_error',
            code: error.response.data?.error?.code || 'openrouter_error'
          }
        });
      } else {
        // Internal server error
        res.status(500).json({
          error: {
            message: 'Internal server error',
            type: 'internal_error',
            code: 'server_error'
          }
        });
      }
    }
  }
);

// Completions endpoint (legacy OpenAI format)
app.post('/v1/completions', 
  validateApiKey,
  [
    body('model').notEmpty().withMessage('Model is required'),
    body('prompt').notEmpty().withMessage('Prompt is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            message: 'Invalid request parameters',
            type: 'invalid_request_error',
            code: 'invalid_parameters',
            details: errors.array()
          }
        });
      }

      const { model, prompt, ...otherParams } = req.body;
      
      // Convert to chat format for OpenRouter
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant for speech learning and hearing-impaired users. Provide clear, educational responses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const openRouterRequest = {
        model: model === 'gpt-4o-mini' ? 'openai/gpt-4o-mini' : model,
        messages: messages,
        ...otherParams
      };

      // Update request count for API key
      if (req.apiKeyData) {
        req.apiKeyData.requestCount++;
        req.apiKeyData.lastUsed = new Date().toISOString();
      }

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        openRouterRequest,
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://soundbysoundslowly.com',
            'X-Title': 'Sound by Sound Slowly API Service'
          }
        }
      );

      // Convert back to completions format
      const completion = response.data.choices[0];
      res.json({
        id: response.data.id,
        object: 'text_completion',
        created: response.data.created,
        model: response.data.model,
        choices: [{
          text: completion.message.content,
          index: completion.index,
          logprobs: null,
          finish_reason: completion.finish_reason
        }],
        usage: response.data.usage
      });

    } catch (error) {
      console.error('Error in completions:', error.message);
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'internal_error',
          code: 'server_error'
        }
      });
    }
  }
);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      type: 'internal_error',
      code: 'server_error'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      type: 'invalid_request_error',
      code: 'not_found'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Sound by Sound Slowly API Service running on port ${PORT}`);
  console.log(`📚 OpenAI compatible API available at http://localhost:${PORT}/v1`);
  console.log(`🔍 Health check available at http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
