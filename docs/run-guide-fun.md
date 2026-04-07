# 🎛️ Nebulosa Launch Guide (Fun + Visual)

Welcome to mission control. This is the fastest way to boot Nebulosa locally and verify it is alive.

---

## 🗺️ System map (at a glance)

```text
┌──────────────────────────────────────────────────────┐
│                  Your Terminal                       │
└──────────────┬───────────────────────────────────────┘
               │ npm run dev
               ▼
┌──────────────────────────────────────────────────────┐
│              stixmagic-bot.js                        │
│  - Express health server (/health)                  │
│  - Telegram bot (polling OR webhook mode)           │
│  - Cleanup worker                                   │
└───────┬───────────────────────────────────────┬──────┘
        │                                       │
        ▼                                       ▼
┌──────────────────────┐              ┌──────────────────────┐
│ Telegram Bot API     │              │ Local HTTP health    │
│ (commands/messages)  │              │ http://localhost:3000│
└──────────────────────┘              └──────────────────────┘
```

---

## ✅ Preflight checklist

- Node.js 18+
- npm installed
- Telegram bot token from BotFather
- (Optional) public URL for webhook mode

---

## 🔐 Environment setup

Create `.env` at repository root:

```env
BOT_TOKEN=123456:your_real_bot_token
PORT=3000
# Optional: if set, app runs in webhook mode. If omitted, polling mode is used.
# WEBHOOK_URL=https://your-domain.com
```

---

## 🚀 Start locally (polling mode)

```bash
npm install
npm run dev
```

Expected startup signals:
- `🤖 Stix Magic bot started in polling mode`
- `🌟 Stix Magic server running on port 3000`
- Health endpoint responds with JSON

Verify health:

```bash
curl http://localhost:3000/health
```

Expected response shape:

```json
{"status":"ok","service":"Stix Magic","version":"1.0.0"}
```

---

## 🌐 Start in webhook mode (production-ish)

```bash
export WEBHOOK_URL=https://your-public-domain.com
npm run dev
```

The app will bind Telegram webhook to:

```text
https://your-public-domain.com/webhook
```

---

## 🧪 Build check (frontend)

```bash
npm run client:build
```

If successful, production assets are emitted under `dist/public`.

---

## 🛟 Troubleshooting mini-map

```text
Bot doesn't respond
   ├─ Check BOT_TOKEN validity
   ├─ Confirm no second process is using same token in polling mode
   └─ Inspect console for polling_error/webhook_error

Health fails
   ├─ Confirm PORT is free
   └─ Curl localhost:PORT/health

Webhook fails
   ├─ Verify HTTPS + publicly reachable domain
   ├─ Ensure WEBHOOK_URL is a valid URL
   └─ Check outbound network/proxy restrictions
```

---

## 🧭 Operational tips

- Keep one bot runner active per token when polling.
- Use webhook mode in cloud deployments.
- Use a process manager (PM2/systemd/container orchestrator) for automatic restarts.
- Monitor logs for `❌ Bot handler failed (...)` events to catch feature regressions quickly.
