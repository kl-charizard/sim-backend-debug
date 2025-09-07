## Cloud Proxy Service

Minimal Node.js service to issue per-user keys and proxy to providers:
- OpenRouter (LLM chat)
- iFlytek (e.g., TTS)
- FaceFusion (face swap)

Keys are stored in SQLite with per-key rate limiting.

### Prereqs
- Node 20+

### Setup
1. Create env file
```bash
cp env.example .env
```
2. Install deps
```bash
npm install
```
3. Init DB
```bash
npm run migrate
```
4. Start
```bash
npm run start
```

### API
- GET `/health`

Admin
- POST `/admin/keys`
  - Header: `x-admin-key: <ADMIN_API_KEY>`
  - Body: `{ "rateLimitPerMin": 60 }` (optional)
  - Returns: `{ key, rateLimitPerMin, status }`

Auth
- All `/v1/**` require `x-api-key: <issued key>`

OpenRouter
- POST `/v1/openrouter/chat/completions` → passthrough of OpenRouter request/response; supports `stream`

iFlytek (example TTS)
- POST `/v1/iflytek/tts` `{ text, voice?, format? }` → audio bytes

FaceFusion
- POST `/v1/facefusion/swap` `{ targetImageUrl, sourceFaceUrl }`

### Notes
- Place provider secrets only on the server; clients use issued keys.
- Configure `CORS_ORIGIN` as needed for your apps.
- Extend `api_keys` table (e.g., `plan`, `expires_at`) for subscriptions.
