# Backend API Documentation

All endpoints are prefixed with `/api` and require a JWT `Authorization: Bearer <token>` unless noted.

## Auth

### POST /api/auth/register
Request JSON:
```
{ "email": "user@example.com", "password": "secret", "name": "Ada" }
```
Response 200:
```
{ "token": "<jwt>", "user": { "id": "user_1", "email": "user@example.com", "name": "Ada" } }
```

### POST /api/auth/login
Request JSON:
```
{ "email": "user@example.com", "password": "secret" }
```
Response 200: same as register

### GET /api/auth/profile
Response 200:
```
{ "user": { "id": "user_1", "email": "user@example.com", "name": "Ada" } }
```

## Videos

### POST /api/videos/create
Start a new video generation.

Request JSON:
```
{ "prompt": "A kite surfing dog at sunset", "model": "sora-2", "size": "1280x720", "seconds": 8 }
```
Response 201:
```
{
  "message": "Video generation started",
  "video": { "id": "db_123", "openaiVideoId": "video_abc", "status": "queued", "prompt": "..." }
}
```
Errors:
- 400: `{ error: "Prompt is required" }`
- 400: `{ error: "Prompt violates content policy", moderation: {...} }` (when moderation is enabled)
- 500: `{ error: "Internal server error" }`

### GET /api/videos/status/:id
Returns latest status and download URL if available.

Response 200:
```
{
  "video": {
    "id": "db_123",
    "status": "completed",
    "videoUrl": "http://localhost:5001/api/videos/db_123/download",
    "thumbnailUrl": null
  }
}
```
Errors:
- 404: `{ error: "Video not found" }`

Note: The `videoUrl` points to the backend download endpoint, not a direct OpenAI URL.

### GET /api/videos
List videos (pagination by page/limit).

Query params: `?page=1&limit=20`

Response 200:
```
{
  "videos": [ { "id": "db_1", "status": "queued" }, ... ],
  "pagination": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

### GET /api/videos/:id/download
Download a completed video as MP4. Requires authentication.

Response 200:
- Content-Type: `video/mp4`
- Content-Disposition: `inline; filename="video-{id}.mp4"`
- Body: Binary MP4 video stream

Errors:
- 404: `{ error: "Video not found" }`
- 400: `{ error: "Video is not completed yet" }`
- 400: `{ error: "Video has no OpenAI ID" }`

Note: This endpoint streams the video from OpenAI on-demand. Videos are not stored locally.

### DELETE /api/videos/:id
Delete a video (and attempt to delete upstream if present).

Response 200:
```
{ "message": "Video deleted successfully" }
```
Errors:
- 404: `{ error: "Video not found" }`

### POST /api/videos/remix/:id
Create a new video based on an existing one with a new prompt.

Request JSON:
```
{ "prompt": "Shift the color palette to teal, sand, and rust" }
```
Response 201:
```
{
  "message": "Video remix started",
  "video": { "id": "db_456", "openaiVideoId": "video_def", "status": "queued", "prompt": "Remix: ..." }
}
```
Errors:
- 400: `{ error: "Prompt is required for remix" }`
- 404: `{ error: "Video not found" }`

## Video Download Flow

1. **Video Creation**: POST /api/videos/create returns a video with status "queued"
2. **Background Processing**: Server polls OpenAI API for status updates
3. **Completion**: When complete, `videoUrl` is set to backend download endpoint
4. **Frontend Access**: Frontend fetches video with authentication
5. **Streaming**: Backend downloads from OpenAI and streams to client

## Implementation Details

### Video URL Format
Completed videos have `videoUrl` set to:
```
http://localhost:5001/api/videos/{video-id}/download
```

### Authentication
All video endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Background Processing
- Uses simple asynchronous Node.js functions (no Redis/Bull required)
- Polls OpenAI API every 5-20 seconds with exponential backoff
- Updates database when video status changes
- Maximum 180 polling attempts (~15-30 minutes)

### Video Storage
- Videos are **not** stored locally on the backend
- Videos are downloaded from OpenAI on-demand when accessed
- OpenAI video URLs expire after 1 hour (not exposed to frontend)
- Backend download endpoint provides persistent access

## Notes
- Rate limiting is applied globally and to auth/video endpoints specifically.
- Requires OpenAI SDK 6.5.0+ for Sora-2 video API support.
- Optional environment flags:
  - `OPENAI_BASE_URL` to target a sandbox/proxy.
  - `OPENAI_MODERATION_MODEL` to enable moderation checks.
  - `BACKEND_URL` to set the base URL for video download endpoints.
