# Sound by Sound Slowly API Service

A Node.js API service that acts as a hub to OpenRouter's GPT-4o-mini, providing an OpenAI-compatible API for speech learning applications.

## Features

- 🚀 **OpenAI Compatible API** - Drop-in replacement for OpenAI API
- 🔄 **OpenRouter Integration** - Routes requests to OpenRouter's GPT-4o-mini
- 🛡️ **Security** - Rate limiting, CORS, helmet security headers
- 📊 **Monitoring** - Health checks, logging, error handling
- 🐳 **Docker Ready** - Containerized deployment
- 🎯 **Speech Learning Focus** - Optimized for hearing-impaired users

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit .env with your OpenRouter API key
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Service

```bash
# Development
npm run dev

# Production
npm start
```

### 4. Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t sound-by-sound-api .
docker run -p 3000:3000 -e OPENROUTER_API_KEY=your_key sound-by-sound-api
```

## API Endpoints

### Health Check
```
GET /health
```

### Models
```
GET /v1/models
```

### Chat Completions
```
POST /v1/chat/completions
```

### Text Completions (Legacy)
```
POST /v1/completions
```

## Usage Examples

### Chat Completions

```bash
curl -X POST http://api.soundbysoundslowly.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "system",
        "content": "You are a speech therapist helping with pronunciation."
      },
      {
        "role": "user",
        "content": "How do I pronounce the word 'pronunciation'?"
      }
    ],
    "max_tokens": 150
  }'
```

### Text Completions

```bash
curl -X POST http://api.soundbysoundslowly.com/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "prompt": "Help me practice pronouncing difficult words:",
    "max_tokens": 100
  }'
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Required |
| `PORT` | Server port | 11434 |
| `NODE_ENV` | Environment | production |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | 900000 |
| `ALLOWED_ORIGINS` | CORS allowed origins | * |
| `REQUIRE_API_KEY` | Require API key | false |

### Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables
- Returns 429 status when exceeded

### CORS

- Configurable allowed origins
- Supports credentials
- Pre-configured for Sound by Sound Slowly domains

## Deployment

### Google Cloud Run

1. Build and push Docker image:
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/sound-by-sound-api
```

2. Deploy to Cloud Run:
```bash
gcloud run deploy sound-by-sound-api \
  --image gcr.io/PROJECT_ID/sound-by-sound-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENROUTER_API_KEY=your_key
```

### Cloudflare Workers (Alternative)

For serverless deployment, you can adapt the code to run on Cloudflare Workers.

## Monitoring

### Health Check
```bash
curl http://api.soundbysoundslowly.com/health
```

### Logs
- Structured JSON logging
- Request/response logging
- Error tracking
- Performance metrics

## Security

- Helmet.js security headers
- Rate limiting per IP
- CORS protection
- Input validation
- Error sanitization

## Development

### Running Tests
```bash
npm test
```

### Code Quality
- ESLint configuration
- Prettier formatting
- Jest testing framework

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please contact the Sound by Sound Slowly development team.
