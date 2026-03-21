# Stix Magic 🪄

A Telegram-first sticker platform built with **grammY**, **Express**, **Prisma**, and **Stripe**.

Users interact through a Telegram bot. The backend manages user accounts, subscription plans, and payments.

---

## Architecture

```
stixmagic/
├── bot/
│   └── bot.ts               # grammY Telegram bot (/start, /plans, Stars payments)
├── api/
│   ├── server.ts            # Express server
│   └── routes/
│       ├── users.ts         # POST /api/users/create-or-get, GET /api/users/:telegram_id
│       └── subscription.ts  # Stripe + Stars payment endpoints + Stripe webhook
├── db/
│   └── schema.prisma        # Prisma schema (User, Subscription)
├── services/
│   ├── userService.ts       # User CRUD helpers
│   └── subscriptionService.ts # Subscription management helpers
├── utils/
│   ├── stripe.ts            # Stripe checkout + webhook helpers
│   ├── stars.ts             # Telegram Stars price config
│   └── telegram.ts          # canUseFeature(), plan display helpers
├── .env.example             # Environment variable template
├── package.json
└── tsconfig.json
```

---

## Setup

### 1. Install dependencies

```bash
cd stixmagic
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `TELEGRAM_BOT_TOKEN` | Token from [@BotFather](https://t.me/BotFather) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` or `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret from Stripe Dashboard |
| `STRIPE_PRICE_PREMIUM` | Stripe Price ID for the **Premium** plan |
| `STRIPE_PRICE_PRO` | Stripe Price ID for the **Pro** plan |
| `STARS_PRICE_PREMIUM` | Stars charged for Premium (30 days), default `75` |
| `STARS_PRICE_PRO` | Stars charged for Pro (30 days), default `200` |
| `APP_BASE_URL` | Public base URL of the API (e.g. `https://your-app.railway.app`) |
| `PORT` | Port for the API server (default: `3000`) |

### 3. Run database migrations

Generate the Prisma client and apply migrations:

```bash
npm run db:generate
npm run db:migrate
```

### 4. Start the services

**API server** (in one terminal):

```bash
npm run dev
```

**Telegram bot** (in another terminal):

```bash
npm run dev:bot
```

For production, build first then start:

```bash
npm run build
npm start          # API server
npm run start:bot  # Telegram bot
```

### 5. Test Stripe webhooks locally

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli), then forward events to your local server:

```bash
stripe listen --forward-to localhost:3000/api/subscription/webhook
```

The CLI will print a webhook signing secret — set it as `STRIPE_WEBHOOK_SECRET` in your `.env`.

Trigger a test event:

```bash
stripe trigger checkout.session.completed
```

---

## API Reference

### `POST /api/users/create-or-get`

Creates a new user or returns the existing one.

**Body:**
```json
{ "telegram_id": 123456789, "telegram_username": "alice" }
```

**Response:**
```json
{ "id": 1, "telegram_id": "123456789", "plan": "free", "subscription_status": "inactive" }
```

---

### `GET /api/users/:telegram_id`

Returns plan and subscription status for a user.

**Response:**
```json
{ "telegram_id": "123456789", "plan": "free", "subscription_status": "inactive" }
```

---

### `POST /api/subscription/create-checkout`

Creates a Stripe Checkout Session and returns the payment URL.

**Body:**
```json
{ "telegram_id": 123456789, "plan": "premium" }
```

**Response:**
```json
{ "url": "https://checkout.stripe.com/..." }
```

---

### `POST /api/subscription/webhook`

Stripe webhook endpoint. Handles:

- `checkout.session.completed` — activates the user's subscription
- `invoice.paid` — keeps the subscription active on renewal
- `customer.subscription.deleted` — cancels subscription and resets user to Free plan

---

### `POST /api/subscription/stars-payment`

Records a successful Telegram Stars payment sent by the bot after a `successful_payment` event.
Grants 30 days of access from the payment date.

**Body:**
```json
{ "telegram_id": 123456789, "plan": "premium", "telegram_payment_charge_id": "CHARGE_ID" }
```

**Response:**
```json
{ "success": true, "plan": "premium", "renewal_date": "2026-04-12T00:00:00.000Z" }
```

---

## Feature Access

Use `canUseFeature(user, feature)` to gate functionality by plan:

```typescript
import { canUseFeature } from "./utils/telegram.js";

if (canUseFeature(user, "ai_generation")) {
  // only available on Pro
}
```

| Feature | Free | Premium | Pro |
|---|---|---|---|
| `basic_stickers` | ✅ | ✅ | ✅ |
| `advanced_stickers` | ❌ | ✅ | ✅ |
| `custom_stickers` | ❌ | ✅ | ✅ |
| `ai_generation` | ❌ | ❌ | ✅ |
| `unlimited_packs` | ❌ | ❌ | ✅ |

---

## Expected User Flow

### Stripe (recurring subscription)

1. User sends `/start` → account created with **Free** plan
2. User sends `/plans`
3. Bot shows **💳 Premium (Card)** / **💳 Pro (Card)** buttons
4. User clicks → redirected to Stripe Checkout
5. After payment, Stripe sends `checkout.session.completed` webhook
6. Backend updates `user.plan` and `subscription_status`

### Telegram Stars (one-time, 30-day access)

1. User sends `/plans`
2. Bot shows **⭐ Premium — 75 Stars** / **⭐ Pro — 200 Stars** buttons
3. User clicks → bot sends a native Telegram invoice (currency: XTR)
4. User pays from their Stars balance — no browser redirect
5. Bot receives `successful_payment` event
6. Bot calls `POST /api/subscription/stars-payment`
7. Backend grants 30 days of the chosen plan

---

## Future Architecture

The system is ready for the following additions:

- **Token ledger** — `token_transactions` table tracking credits
- **Telegram wallet commands** — `/balance`, `/buy`
- **AI sticker generation jobs** — background queue triggered by plan features
- **Monthly token grants** — subscriptions that award credits on renewal

---

## Demo Pages

If you are looking for the demo pages for the animation work, including ASCII art animation demos, use the standalone **`stixmagic` repository** instead of the main Nebulosa repository.

The standalone Stix Magic repo is the intended home for the demo site, GitHub Pages deployment, and any animation showcase pages tied to this feature.
