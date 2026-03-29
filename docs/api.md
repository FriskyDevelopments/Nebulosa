# Stix Magic Platform – API Reference

Base URL: `http://localhost:3000` (dev) | `https://api.stixmagic.com` (prod)

All request and response bodies use `application/json`.

---

## Authentication

All protected endpoints require one of:

| Method | Header |
|---|---|
| JWT Bearer | `Authorization: Bearer <token>` |
| API Key | `x-api-key: <key>` |

---

## Health

### `GET /health`
Returns platform liveness status. No authentication required.

**Response 200**
```json
{ "status": "ok", "env": "production", "timestamp": "2024-01-01T00:00:00.000Z" }
```

### `GET /health/ready`
Returns runtime dependency readiness.

**Response 200** (all mode-required dependencies available)
```json
{ "status": "ready", "mode": "api", "dependencies": { "db": { "ready": true } }, "timestamp": "2024-01-01T00:00:00.000Z" }
```

**Response 503** (one or more required dependencies unavailable)
```json
{ "status": "not_ready", "mode": "api", "dependencies": { "db": { "ready": false, "error": "..." } }, "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

## Auth

### `POST /auth/register`
Creates a new user account.

**Body**
```json
{ "email": "user@example.com", "username": "alice", "password": "securePassword123" }
```

**Response 201**
```json
{ "user": { "id": "...", "email": "user@example.com", "username": "alice", "role": "USER" } }
```

**Errors:** `400 Validation failed`, `409 Email/username taken`

---

### `POST /auth/login`
Authenticates and returns tokens.

**Body**
```json
{ "email": "user@example.com", "password": "securePassword123" }
```

**Response 200**
```json
{
  "user": { "id": "...", "email": "user@example.com" },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Errors:** `401 Invalid credentials`

---

### `POST /auth/refresh`
Issues a new access token using a valid refresh token.

**Body**
```json
{ "refreshToken": "eyJ..." }
```

**Response 200**
```json
{ "accessToken": "eyJ..." }
```

---

### `GET /auth/me` 🔒
Returns the currently authenticated user.

**Response 200**
```json
{ "user": { "id": "...", "email": "...", "username": "...", "role": "USER" } }
```

---

## Users

### `GET /users` 🔒 (ADMIN)
Lists all users with pagination.

**Query params:** `page`, `limit`

**Response 200**
```json
{ "items": [...], "meta": { "total": 100, "page": 1, "limit": 20, "pages": 5 } }
```

---

### `GET /users/:id` 🔒
Returns a user by ID.

**Response 200 / 404**

---

### `PATCH /users/:id` 🔒
Updates a user. Users can update themselves; admins can update anyone.

**Body** *(partial)*
```json
{ "username": "newname" }
```

---

## Content

### `GET /content`
Lists published content. Optional authentication for drafts.

**Query params:** `page`, `limit`, `userId`, `status`

---

### `GET /content/:id`
Returns a single content item including associated media.

---

### `POST /content` 🔒
Creates a content item.

**Body**
```json
{ "title": "My Post", "body": "Content here...", "type": "TEXT", "tags": ["magic"] }
```

**Response 201**

---

### `PATCH /content/:id` 🔒
Updates a content item (owner only).

---

### `POST /content/:id/publish` 🔒
Publishes a draft content item.

---

### `DELETE /content/:id` 🔒
Soft-deletes a content item (sets status to DELETED).

---

## Media

### `GET /media` 🔒
Lists media records.

**Query params:** `page`, `limit`, `contentId`, `status`

---

### `GET /media/:id` 🔒
Returns a single media record.

---

### `POST /media/upload` 🔒
Uploads a file (multipart/form-data).

**Form fields:** `file` (required), `contentId` (optional)

**Allowed types:** JPEG, PNG, GIF, WebP, MP4, WebM, MP3, OGG, PDF

**Max size:** 50 MB

**Response 201**
```json
{ "media": { "id": "...", "filename": "...", "status": "PENDING" } }
```

---

## Analytics

### `POST /analytics/events`
Tracks an analytics event. Authentication optional.

**Body**
```json
{ "event": "page_view", "properties": { "path": "/home" }, "sessionId": "abc123" }
```

**Response 201**

---

### `GET /analytics/events` 🔒 (ADMIN)
Lists tracked events.

**Query params:** `page`, `limit`, `userId`, `event`, `from`, `to`

---

### `GET /analytics/aggregate` 🔒 (ADMIN)
Returns aggregate count for an event.

**Query params:** `event` (required), `from`, `to`

**Response 200**
```json
{ "event": "page_view", "count": 1042 }
```

---

## Integrations

### `GET /integrations` 🔒
Lists connected integration tokens for the current user.

---

### `DELETE /integrations/:id` 🔒
Revokes an integration connection.

---

## Error Format

All error responses follow this shape:

```json
{ "error": "Human-readable message", "details": [...] }
```

`details` is only present for validation errors (`400`), containing an array of:
```json
[{ "path": "email", "message": "Invalid email" }]
```
