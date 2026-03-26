# Stix Magic Platform – Developer Onboarding

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **PostgreSQL 15+** — [postgresql.org](https://www.postgresql.org)
- **Redis 7+** — [redis.io](https://redis.io)
- **npm 9+** (ships with Node.js)

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/FriskyDevelopments/Nebulosa.git
cd Nebulosa/src
npm install
```

### 2. Configure environment variables

```bash
cp ../.env.example .env
# Edit .env with your local configuration
```

Minimum required variables:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/stixmagic
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-local-secret-at-least-32-chars
```

### 3. Set up the database

```bash
# Apply the initial migration
psql $DATABASE_URL < database/migrations/001_initial_schema.sql

# Generate the Prisma client (needed for IDE intellisense)
npm run db:generate
```

### 4. Start the API server

```bash
npm run dev    # starts with --watch for auto-restart
```

The server will be available at `http://localhost:3000`.

### 5. Start the background workers (optional)

```bash
npm run worker:start
```

---

## Running Tests

```bash
npm test
```

Tests are in `src/tests/`. They run entirely in memory – no database or Redis needed.

---

## Project Scripts

| Script | Description |
|---|---|
| `npm start` | Start the production server |
| `npm run dev` | Start with auto-reload |
| `npm test` | Run all tests |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Open Prisma Studio (database UI) |
| `npm run worker:start` | Start background workers |

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Runtime environment |
| `PORT` | No | `3000` | HTTP server port |
| `DATABASE_URL` | **Yes (prod)** | — | PostgreSQL connection URL |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL |
| `JWT_SECRET` | **Yes (prod)** | — | JWT signing secret |
| `JWT_EXPIRES_IN` | No | `24h` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime |
| `TELEGRAM_BOT_TOKEN` | No | — | Telegram bot token |
| `TELEGRAM_WEBHOOK_URL` | No | — | Public URL for Telegram webhooks |
| `STORAGE_PROVIDER` | No | `local` | Storage backend (`local` or `s3`) |
| `STORAGE_LOCAL_PATH` | No | `./uploads` | Local file storage path |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed origins |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate-limit window (ms) |
| `LOG_LEVEL` | No | `info` | Winston log level |

---

## Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/botfather) and get the token.
2. Set `TELEGRAM_BOT_TOKEN` in `.env`.
3. In development, the bot uses **polling** automatically.
4. In production, set `TELEGRAM_WEBHOOK_URL` to your public HTTPS URL.

---

## Adding a New API Endpoint

1. **Create a controller** in `src/api/controllers/`.
2. **Create a route file** in `src/api/routes/`.
3. **Register the router** in `src/api/app.js`.
4. **Write tests** in `src/tests/`.

Example route registration in `app.js`:
```js
app.use('/my-feature', require('./routes/my-feature.routes'));
```

---

## Adding a New Background Job

1. **Create a job enqueuer** in `src/workers/jobs/`.
2. **Create a processor** in `src/workers/processors/`.
3. **Require the processor** in `src/workers/index.js`.

---

## Docker

A `Dockerfile` is included at the repository root for containerised deployments.

```bash
docker build -t stixmagic-platform .
docker run -p 3000:3000 --env-file .env stixmagic-platform
```
