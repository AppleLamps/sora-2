# Sora-2 Video Generation Web App

Generate videos using OpenAI's Sora-2 API from a clean, secure web interface. Includes auth, prompt entry, progress tracking, library management, remixing, and guardrails.

## Project Structure

```
SORA-2/
├── backend/          # Node.js/Express API server (TypeScript)
├── frontend/         # Next.js React app (TypeScript)
├── api-docs/         # Vendor docs and examples (reference only)
├── load-test/        # Artillery scenarios
└── to-do.md          # Progress tracker
```

## Prerequisites

- Node.js >= 18, npm >= 9
- OpenAI API key with Sora-2 access
- Neon PostgreSQL database URL

## Quick Start

1) Install dependencies

```bash
npm install
```

2) Configure environment

- Backend (`backend/.env`): copy from example and fill values

```
cp backend/.env.example backend/.env
# Edit backend/.env
```

Important backend variables:
- DATABASE_URL: Neon connection string
- OPENAI_API_KEY: your OpenAI API key
- OPENAI_BASE_URL: optional. Point to sandbox/proxy
- OPENAI_MODERATION_MODEL: optional. e.g., omni-moderation-latest to enable policy checks
- BACKEND_URL: http://localhost:5001 (used for generating video download URLs)
- FRONTEND_URL: http://localhost:3000 (dev)

- Frontend (`frontend/.env.local`): copy from example and adjust base URL if needed

```
cp frontend/.env.local.example frontend/.env.local
# NEXT_PUBLIC_API_URL=http://localhost:5000
```

3) Run dev servers

```bash
# Run both
npm run dev

# Or separately
npm run dev:backend
npm run dev:frontend
```

4) Sign up and generate a video

- Open http://localhost:3000
- Register or sign in
- Enter a prompt, pick model/resolution/seconds, and Generate
- The dashboard polls status and updates automatically

## Using Sandbox and Guardrails

- Sandbox: set `OPENAI_BASE_URL` to your sandbox endpoint to avoid live billing.
- Guardrails: set `OPENAI_MODERATION_MODEL=omni-moderation-latest` to check prompts; blocked prompts return HTTP 400 with a moderation payload.

## API Overview

Authenticated with Bearer JWT in Authorization header.

- POST /api/auth/register, POST /api/auth/login, GET /api/auth/profile
- POST /api/videos/create: start a generation
- GET /api/videos/status/:id: retrieve status and URLs
- GET /api/videos: list your videos (pagination)
- GET /api/videos/:id/download: download completed video (authenticated, streams MP4)
- DELETE /api/videos/:id: delete a video
- POST /api/videos/remix/:id: remix an existing video with a new prompt

See `backend/API.md` for full request/response examples and errors.

## Testing and QA

- Backend unit/integration tests:

```bash
npm -w backend test
```

- Load testing (Artillery):

```bash
# Optional: provide a JWT used for auth
setx LOAD_TEST_TOKEN "your-dev-jwt"
npm run load:test
```

## Troubleshooting

- CORS: ensure `FRONTEND_URL` matches your Next.js origin (default http://localhost:3000)
- Auth failures: verify JWT_SECRET in backend and client token in localStorage
- Video download errors: ensure `BACKEND_URL` is set correctly in backend/.env
- Sandbox errors: confirm `OPENAI_BASE_URL` is correct and reachable

## License

ISC
