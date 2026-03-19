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
| `TELEGRAM_BOT_TOKEN` | No | Alias for `BOT_TOKEN` |
| `PORT` | No | HTTP server port (default: 3000) |
| `WEBHOOK_URL` | No | Public base URL for webhook mode |
| `DATABASE_URL` | No | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | No | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `STRIPE_PRICE_PREMIUM` | No | Stripe price ID for Premium plan |
| `STRIPE_PRICE_PRO` | No | Stripe price ID for Pro plan |
| `APP_BASE_URL` | No | Public app URL (used for Stripe redirects) |
| `INTERNAL_API_URL` | No | Internal bot→API base URL (default: `http://localhost:PORT`) |
| `ADMIN_API_ENABLED` | No | Set to `false` to disable admin debug endpoint (default: `true`) |

---

## Cleanup

A background cleanup worker runs every hour and:
- Expires DRAFT/SAVED records past their expiry timestamp
- Permanently deletes REJECTED/EXPIRED records past the trash retention period

---

## Subscription System

The subscription system provides plan-based feature access for Telegram users, backed by Stripe payments.

### Subscription Architecture

#### Design Principle

`telegramUsers.plan` is the **current entitlement snapshot** — the source of truth for runtime feature access.
`subscriptions` is the **billing record** — it mirrors Stripe's state for auditability.

Stripe is never queried at runtime for feature decisions; the local DB is always the authoritative source.

#### Database Schema

**`telegram_users`** (extended):

| Column | Type | Description |
|--------|------|-------------|
| `plan` | enum | Current entitlement: `free`, `premium`, `pro` |
| `subscription_status` | enum | Billing state: `inactive`, `active`, `cancelled`, `past_due` |
| `updated_at` | timestamp | Last entitlement change |
| `monthly_token_allowance` | integer | Reserved for future token phase (not active) |
| `token_balance` | integer | Reserved for future token phase (not active) |

**`subscriptions`**:

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | FK | References `telegram_users.id` |
| `plan` | enum | Plan at time of subscription |
| `provider` | text | `stripe` |
| `provider_subscription_id` | text | Stripe subscription ID |
| `stripe_customer_id` | text | Stripe customer ID |
| `provider_price_id` | text | Stripe price ID |
| `status` | enum | Current billing status |
| `current_period_end` | timestamp | End of current billing period |
| `cancel_at_period_end` | boolean | Whether sub will cancel at period end |
| `renewal_date` | timestamp | Next billing date |

**`stripe_events`** (idempotency log):

| Column | Type | Description |
|--------|------|-------------|
| `event_id` | text (unique) | Stripe event ID |
| `type` | text | Event type |
| `processed` | boolean | Whether processing succeeded |

Duplicate `event_id` entries are rejected, preventing double-processing of Stripe retries.

#### Stripe Webhook Lifecycle

```
Stripe → POST /api/subscription/webhook
         │
         ├─ Verify signature (STRIPE_WEBHOOK_SECRET)
         ├─ Check stripe_events table for duplicate event_id
         │    └─ Duplicate? Return 200 immediately
         │
         ├─ checkout.session.completed
         │    └─ Activate plan + create subscription record
         ├─ customer.subscription.created
         │    └─ Sync if local record exists
         ├─ customer.subscription.updated
         │    └─ Sync status, period end, cancel_at_period_end
         ├─ customer.subscription.deleted
         │    └─ Downgrade user to free plan
         ├─ invoice.payment_succeeded
         │    └─ Reactivate past_due subscriptions
         └─ invoice.payment_failed
              └─ Mark subscription + user as past_due
```

#### Entitlement Helper

All feature gating must use `getUserEntitlement(user)` from `server/entitlements.ts`:

```ts
import { getUserEntitlement } from "./entitlements";

const ent = getUserEntitlement(user);
if (ent.isPremium) { /* advanced tools */ }
if (ent.isPro)     { /* everything     */ }
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/user` | Upsert Telegram user (idempotent) |
| `GET` | `/api/user/:telegram_id` | Get user info and current plan |
| `POST` | `/api/subscription/create-checkout` | Create Stripe Checkout session |
| `POST` | `/api/subscription/webhook` | Handle Stripe webhook events |
| `GET` | `/api/admin/user/:telegram_id` | Debug: user + subscription + entitlement |

### Stripe Setup

1. Create a Stripe account and obtain your secret key.
2. Create two recurring price objects (monthly) for Premium and Pro plans.
3. Set the price IDs in `STRIPE_PRICE_PREMIUM` and `STRIPE_PRICE_PRO`.
4. Configure a webhook endpoint pointing to `https://your-domain/api/subscription/webhook`.
5. Subscribe to these events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`, `invoice.payment_succeeded`.
6. Set `STRIPE_WEBHOOK_SECRET` to the webhook signing secret.

### Feature Gating

```ts
// server-side (TypeScript)
import { getUserEntitlement } from "./entitlements";
const ent = getUserEntitlement(user);
if (ent.isPremium) { /* premium + pro */ }
if (ent.isPro)     { /* pro only      */ }
```

```js
// bot-side (JavaScript)
if (userHasPremiumAccess(subUser)) { /* unlock advanced tools */ }
if (userHasProAccess(subUser))     { /* unlock everything     */ }
```

### Future: Token System

The schema already contains placeholder fields for the future token phase:

| Plan | Monthly tokens |
|------|---------------|
| Free | 100 |
| Premium | 1 000 |
| Pro | 5 000 |

Fields `monthly_token_allowance` and `token_balance` exist in `telegram_users` but contain no active logic.

---

## Development Roadmap

- **Phase 1** *(current)*: Magic Center, draft lifecycle, usage limits, cleanup worker
- **Phase 2**: Real background-removal / WebP conversion in Magic Cut
- **Phase 3**: Sticker pack publishing, public catalog, sharing
- **Phase 4**: Animated stickers, collaboration packs

---

## License

MIT © PupFr
