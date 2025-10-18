# Sora-2 Video Generation Web App - Step-by-Step Plan

This plan outlines the steps to build a web app for generating videos using OpenAI's Sora-2 API. The app will allow users to input prompts, generate videos, monitor progress, and manage their video library.

## Instructions for AI Agent
- Check off each task as it is completed by changing `[ ]` to `[x]`
- Ensure prerequisites are met before starting dependent tasks (e.g., set up database before implementing auth)
- Validate each implementation step (e.g., run tests, check API responses, verify UI renders correctly) before proceeding
- If a task requires multiple files or complex logic, break it down into subtasks and check them individually
- Keep the workspace organized and commit changes regularly to version control
- Reference the `api-docs` folder for full API documentation and examples
- Use the provided Neon DATABASE_URL securely (server-side only)

## Project Setup
- [x] Initialize the project structure as a monorepo with separate frontend and backend folders
- [x] Set up version control (Git) and create initial commit
- [x] Configure environment variables for API keys and database connections (keep Neon DATABASE_URL secure and server-side only)
- [x] Set up package managers (npm/yarn) and install base dependencies

## Backend Development
- [x] Create Node.js/Express server with TypeScript
- [x] Implement custom user authentication with JWT, storing users in Neon database
  - Create user registration and login endpoints
  - Implement password hashing and JWT token generation/validation
  - Add middleware for protecting routes
- [x] Set up Neon PostgreSQL database with Prisma ORM
- [x] Define database schema for users, videos, and jobs using Prisma
- [x] Implement database queries using Neon's serverless client (e.g., in actions.ts or API routes: `const sql = neon(process.env.DATABASE_URL); const data = await sql\`...\`;`)
- [x] Create API routes for user management
- [x] Integrate OpenAI SDK for Video API calls
  - Example (JavaScript): `import OpenAI from 'openai'; const openai = new OpenAI(); let video = await openai.videos.create({ model: 'sora-2', prompt: "A video of the words 'Thank you' in sparkling letters" });`
  - Example (Python): `from openai import OpenAI; openai = OpenAI(); video = openai.videos.create(model="sora-2", prompt="A video of a cool cat on a motorcycle in the night")`
  - Full examples available in `api-docs/platform.openai.com_docs_guides_video-generation_gallery=open&galleryItem=Space-Race.md`
- [x] Implement video generation endpoint (POST /api/videos/create)
  - Use OpenAI SDK to create videos with model, prompt, size, seconds parameters
  - Handle optional input_reference for image uploads
  - Return job ID and initial status
  - Example curl: `curl -X POST "https://api.openai.com/v1/videos" -H "Authorization: Bearer $OPENAI_API_KEY" -H "Content-Type: multipart/form-data" -F prompt="Wide tracking shot..." -F model="sora-2-pro" -F size="1280x720" -F seconds="8"`
- [x] Add job status polling system (GET /api/videos/status)
  - Poll GET /videos/{id} for status updates (queued, in_progress, completed, failed)
  - Implement progress tracking and display
  - Use exponential backoff for polling (e.g., every 10-20 seconds)
  - Example: `video = await openai.videos.retrieve(video.id); while (video.status === 'in_progress' || video.status === 'queued') { ... }`
- [x] Create video management endpoints (GET /api/videos, DELETE /api/videos/{id})
  - GET /api/videos: List videos with pagination (limit, after, order)
  - DELETE /api/videos/{id}: Remove video from storage
  - Example list: `curl "https://api.openai.com/v1/videos?limit=20&after=video_123&order=asc" -H "Authorization: Bearer $OPENAI_API_KEY"`
  - Example delete: `curl -X DELETE "https://api.openai.com/v1/videos/[VIDEO_ID]" -H "Authorization: Bearer $OPENAI_API_KEY"`
- [x] Implement remix functionality (POST /api/videos/remix)
  - Use remix_video_id and new prompt for targeted changes
  - Example: `curl -X POST "https://api.openai.com/v1/videos/<previous_video_id>/remix" -H "Authorization: Bearer $OPENAI_API_KEY" -H "Content-Type: application/json" -d '{"prompt": "Shift the color palette to teal, sand, and rust"}'`
- [x] Add error handling and rate limiting
- [x] Set up background job processing for polling (Bull with Redis)

## Frontend Development
- [x] Initialize Next.js project with TypeScript
- [x] Set up UI framework (Material-UI or Tailwind CSS)
- [x] Create authentication pages (login, signup, profile)
- [x] Build main dashboard layout
- [x] Implement prompt input form with validation
- [x] Add options selection (model, resolution, duration)
- [x] Integrate file upload for reference images
- [x] Create progress tracking UI with real-time updates
- [x] Build video preview and download components
  - Use GET /videos/{id}/content for MP4, thumbnail, spritesheet
  - Handle streaming/download with proper headers
  - Example download: `curl -L "https://api.openai.com/v1/videos/video_abc123/content" -H "Authorization: Bearer $OPENAI_API_KEY" --output video.mp4`
  - Variants: ?variant=thumbnail or ?variant=spritesheet
- [x] Implement video library with pagination and search
- [x] Add remix interface for existing videos
- [x] Ensure responsive design for mobile devices

## Integration and Testing
- [x] Connect frontend to backend APIs
- [x] Implement WebSocket or polling for real-time status updates
- [x] Add comprehensive error handling and user feedback
- [x] Write unit tests for backend API functions
- [x] Create integration tests for video generation workflow
- [x] Test with OpenAI sandbox environment
- [x] Validate against API guardrails and content policies
- [x] Perform load testing for concurrent video generations

## Deployment and Monitoring
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Implement logging and error monitoring (Winston + Sentry)
- [ ] Add usage analytics and cost tracking
- [ ] Set up database backups and security measures
- [ ] Configure domain and SSL certificates (for local development, use localhost)
- [ ] Set up local production-like environment

## Documentation and Final Touches
- [x] Create user documentation and README
- [x] Add API documentation for backend endpoints
- [x] Implement help tooltips and onboarding flow
- [x] Add privacy policy and terms of service
- [ ] Perform final security audit
- [ ] Launch beta version and gather user feedback