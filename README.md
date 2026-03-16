# ✨ Stix Magic

**Stix Magic** is a Telegram-first sticker creation platform hosted at [stixmagic.com](https://stixmagic.com).

---

## Product Overview

| Concept | Description |
|---|---|
| **Magic Center** | Main navigation hub presented on `/start` |
| **Magic Cut** | Processing pipeline that converts a photo into a sticker draft |
| **Draft Vault** | Holds un-actioned sticker drafts |
| **Review System** | Inline Approve / Retry / Trash / Save actions on every draft |

---

## Architecture

```
stixmagic-bot.js          ← Main entry point
├── bot/
│   ├── index.js          ← Bot wiring (commands + events)
│   ├── magicCenter.js    ← Magic Center menu hub
│   └── handlers/
│       ├── stickerHandler.js   ← Photo → Draft (Magic Cut)
│       ├── draftHandler.js     ← Draft review callbacks + /drafts /trash
│       └── catalogHandler.js  ← /catalog /mystickers
├── services/
│   ├── stickerService.js ← Image processing (Magic Cut)
│   ├── draftService.js   ← Draft lifecycle (create/approve/retry/trash/save)
│   ├── usageService.js   ← Plan limits & usage tracking
│   └── cleanupService.js ← Expired draft removal logic
├── workers/
│   └── cleanupWorker.js  ← Scheduled background cleanup
├── models/
│   └── storage.js        ← In-memory storage (swap for DB in production)
└── config/
    └── limits.js         ← Plan limits (Free / Premium / Pro)
```

---

## User Flow

```
User sends photo
   → Magic Cut processes image
   → Draft created in Draft Vault
   → Review card sent with:
       ✅ Approve   – marks draft as approved
       🔄 Retry     – re-generates a new draft
       🗑 Trash     – marks as rejected / moves to trash
       💾 Save      – keeps in vault for later
   → Only Approved drafts can be published to a sticker pack
```

---

## Commands

| Command | Description |
|---|---|
| `/start` | Open Magic Center |
| `/menu` | Open Magic Center (alias) |
| `/drafts` | View Draft Vault |
| `/catalog` | Browse approved stickers |
| `/mystickers` | My sticker collection |
| `/trash` | View trashed drafts |
| `/plans` | Usage & plan information |
| `/help` | Help message |

---

## Plans & Limits

| Plan | Creations | Period | Max Drafts |
|---|---|---|---|
| Free | 3 | per day | 10 |
| Premium | 50 | per month | 100 |
| Pro | 300 | per month | Unlimited |

Draft expiry and trash retention periods are configurable in `config/limits.js`.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set BOT_TOKEN
```

### 3. Run

```bash
npm start
```

For webhook mode, also set `WEBHOOK_URL` in your environment.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BOT_TOKEN` | ✅ | Telegram Bot API token |
| `PORT` | No | HTTP server port (default: 3000) |
| `WEBHOOK_URL` | No | Public base URL for webhook mode |

---

## Cleanup

A background cleanup worker runs every hour and:
- Expires DRAFT/SAVED records past their expiry timestamp
- Permanently deletes REJECTED/EXPIRED records past the trash retention period

---

## Development Roadmap

- **Phase 1** *(current)*: Magic Center, draft lifecycle, usage limits, cleanup worker
- **Phase 2**: Real background-removal / WebP conversion in Magic Cut
- **Phase 3**: Sticker pack publishing, public catalog, sharing
- **Phase 4**: Animated stickers, collaboration packs

---

## License

MIT © PupFr
