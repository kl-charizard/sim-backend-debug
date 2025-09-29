const request = require('supertest');
const app = require('../server');

describe('API Service', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);
      
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('service', 'Sound by Sound Slowly API Service');
    });
  });

  describe('GET /v1/models', () => {
    it('should return available models', async () => {
      const res = await request(app)
        .get('/v1/models')
        .expect(200);
      
      expect(res.body).toHaveProperty('object', 'list');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /v1/chat/completions', () => {
    it('should handle valid chat completion request', async () => {
      const res = await request(app)
        .post('/v1/chat/completions')
        .send({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: 'Hello, how are you?'
            }
          ]
        })
        .expect(200);
      
      expect(res.body).toHaveProperty('choices');
      expect(Array.isArray(res.body.choices)).toBe(true);
    });

    it('should reject invalid request without messages', async () => {
      const res = await request(app)
        .post('/v1/chat/completions')
        .send({
          model: 'gpt-4o-mini'
        })
        .expect(400);
      
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('type', 'invalid_request_error');
    });

    it('should reject request with invalid message role', async () => {
      const res = await request(app)
        .post('/v1/chat/completions')
        .send({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'invalid_role',
              content: 'Hello'
            }
          ]
        })
        .expect(400);
      
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /v1/completions', () => {
    it('should handle valid completion request', async () => {
      const res = await request(app)
        .post('/v1/completions')
        .send({
          model: 'gpt-4o-mini',
          prompt: 'Hello, how are you?'
        })
        .expect(200);
      
      expect(res.body).toHaveProperty('choices');
      expect(res.body).toHaveProperty('object', 'text_completion');
    });

    it('should reject request without prompt', async () => {
      const res = await request(app)
        .post('/v1/completions')
        .send({
          model: 'gpt-4o-mini'
        })
        .expect(400);
      
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const res = await request(app)
        .get('/unknown-endpoint')
        .expect(404);
      
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code', 'not_found');
    });
  });
});
