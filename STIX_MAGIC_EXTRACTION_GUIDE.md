# Stix Magic – Extraction Guide

This document identifies which files in this repository can be directly transferred
to a standalone **Stix Magic** repository, and which patterns from the original
Nebulosa codebase were reused to build them.

---

## What to Copy to the Stix Magic Repo

The following files were added in this PR and are **fully self-contained**.
They have no dependency on any Nebulosa/Zoom code.

### Core Stix Magic files

```
stixmagic-bot.js                ← entry point
bot/
  index.js                      ← bot wiring
  magicCenter.js                ← Magic Center hub
  handlers/
    stickerHandler.js           ← Magic Cut → draft review card
    draftHandler.js             ← Approve / Retry / Trash / Save
    catalogHandler.js           ← /catalog /mystickers
services/
  stickerService.js             ← Magic Cut processor
  draftService.js               ← draft lifecycle
  usageService.js               ← plan limits & usage
  cleanupService.js             ← draft expiry & purge
workers/
  cleanupWorker.js              ← hourly background cleanup
models/
  storage.js                    ← in-memory storage (swap for DB)
config/
  limits.js                     ← Free / Premium / Pro plan definitions
```

### Configuration / deployment files to copy

```
.env.example                    ← BOT_TOKEN / PORT / WEBHOOK_URL
package.json                    ← stixmagic name + stixmagic-bot.js main
Dockerfile                      ← Node 18-alpine container (no changes needed)
railway.json                    ← Railway deployment config
Procfile                        ← web: node stixmagic-bot.js
```

---

## Nebulosa Patterns Reused in the Stix Magic Code

| Stix Magic file | Nebulosa source it was based on | What was reused |
|---|---|---|
| `models/storage.js` | `server/storage.ts` (MemStorage class) | Map-based in-memory store, interface contract |
| `stixmagic-bot.js` | `railway-complete-bot.js` | Express + webhook/polling toggle, health endpoint |
| `bot/index.js` | `bot.cjs` | `onText` / `on('photo')` / `on('callback_query')` patterns |
| `bot/handlers/draftHandler.js` | `bot.cjs` session handling | User session state management pattern |
| `services/usageService.js` | `server/storage.ts` metrics | Period-based counter reset pattern |
| `services/cleanupService.js` | `server/storage.ts` | Iterate-over-all-users pattern |

---

## Nebulosa Additions Worth Porting (Optional)

These are pieces from the **original Nebulosa code** that have no direct
equivalent in the Stix Magic modules yet but would add value:

### 1. Typed database schema (`shared/schema.ts`)
The Drizzle ORM + Zod schema provides a type-safe, production-ready replacement
for the in-memory `models/storage.js`.

**What to adapt for Stix Magic:**
```typescript
// Users
telegramUsers: id, telegramId, username, firstName, isActive, joinedAt
// Plans & usage
userPlans:     userId, plan, creationsUsed, usageResetAt
// Drafts
stickerDrafts: id, userId, fileId, fileUniqueId, status, retryCount,
               sourceMessageId, chatId, reviewMessageId, expiresAt,
               createdAt, updatedAt
```

### 2. Express API routes (`server/routes.ts`)
Nebulosa has `/api/meetings/*` endpoints. Stix Magic can adapt these as:
- `GET /api/drafts/:userId` – list drafts
- `GET /api/usage/:userId` – usage stats
- `POST /api/stickers/approve` – approve a draft (useful for a web dashboard)

### 3. Request logging middleware (`server/index.ts`)
The `res.on("finish")` timing middleware is useful for debugging. Copy the
`app.use` block into `stixmagic-bot.js`.

### 4. Railway + Dockerfile patterns
`Dockerfile`, `railway.json`, `Procfile`, `render.yaml` — all portable
deployment configs. Only the `CMD` / `main` needs updating to
`node stixmagic-bot.js`.

---

## CI Workflows to Bring Over

From `.github/workflows/`:

| Workflow | Relevance for Stix Magic |
|---|---|
| `node.js.yml` | ✅ Keep — runs `npm ci` + `npm test` on pushes |
| `sonarqube-security.yml` | ✅ Keep — needs `SONAR_TOKEN` secret in the new repo settings |
| `docker-image.yml` | ✅ Keep — builds & pushes the container |
| `pages.yml` / `static.yml` | ⚠️ Only if Stix Magic has a static site / landing page |

> **Note on the SonarQube CI failure in this repo:** The workflow is failing
> because the `SONAR_TOKEN` secret is not configured. This is a pre-existing
> environment issue, not caused by the Stix Magic code changes. To fix it, add
> the `SONAR_TOKEN` secret in GitHub → Settings → Secrets & Variables → Actions.

---

## Minimal `package.json` for a standalone Stix Magic repo

```json
{
  "name": "stixmagic",
  "version": "1.0.0",
  "description": "Stix Magic – Telegram-first sticker creation platform",
  "main": "stixmagic-bot.js",
  "scripts": {
    "start": "node stixmagic-bot.js",
    "dev":   "node stixmagic-bot.js"
  },
  "dependencies": {
    "node-telegram-bot-api": "^0.66.0",
    "express":               "^4.18.2",
    "dotenv":                "^16.3.1"
  },
  "engines": { "node": ">=18.0.0" }
}
```

---

## Phase 2 additions (future)

Once the standalone Stix Magic repo is set up with the above files, Phase 2 can add:
- Background-removal via the `@imgly/background-removal-node` package
- WebP conversion via `sharp`
- PostgreSQL persistence via Drizzle (swap `models/storage.js` for a DB adapter)
- Sticker pack publishing via the Telegram Bot API `createNewStickerSet` endpoint
