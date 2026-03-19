# LA NUBE BOT ✦　ＬＡ　ＮＵＢＥ　ＢＯＴ　☁️

An intelligent Zoom meeting management Telegram bot that revolutionizes virtual collaboration through advanced AI-powered features and seamless communication technologies.

## Features

### Core Functionality
- **🤖 Automated Multipin with Puppeteer**: Browser automation for seamless multipin control
- **Multipin Management**: Camera ON + Hand Raise required for multipin access
- **Real-time Meeting Monitoring**: Continuous participant scanning with 30-second intervals
- **Automatic Violation Detection**: Escalating enforcement actions for policy violations
- **Bilingual Support**: Complete English/Spanish localization with Mexico flag integration

### Advanced Capabilities
- **Browser Bot Automation**: Headless Puppeteer for actual multipin execution
- **Meeting Host Chat**: Private coordination within Zoom meetings for hosts/cohosts
- **Command Chat Integration**: Strategic alerts and violation notifications
- **Zoom Chat Monitoring**: Automatic spam detection and link removal
- **GitHub OAuth Bypass**: Static domain solution for OAuth authentication
- **Professional Dashboard**: Real-time analytics and monitoring interface
- **Auto-Start Integration**: Browser bots launch automatically with new meetings

## Architecture

### Backend
- **Node.js + Express**: RESTful API with TypeScript
- **Telegram Bot API**: Complete command processing and user interaction
- **Zoom OAuth Integration**: User-level authentication with automatic token refresh
- **PostgreSQL + Drizzle ORM**: Type-safe database operations

### Frontend
- **React + TypeScript**: Modern dashboard interface
- **Shadcn/UI + Tailwind**: Professional component library
- **TanStack Query**: Server state management
- **Real-time Updates**: Live meeting insights and bot status

### External Services
- **Zoom API**: Meeting management and participant monitoring
- **GitHub Pages**: OAuth callback hosting (bypasses dynamic domain issues)
- **Short.io**: Domain redirect management

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended)
- Telegram Bot Token
- Zoom OAuth App (User-level)

### Environment Variables
```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
BOT_TOKEN=your_telegram_bot_token       # alias used by the bot process
LOG_CHANNEL_ID=your_telegram_channel_id
ADMIN_USER_ID=your_telegram_user_id

# Zoom OAuth (existing integration)
ZOOM_USER_CLIENT_ID=your_zoom_client_id
ZOOM_USER_CLIENT_SECRET=your_zoom_client_secret
ZOOM_REDIRECT_URI=your_redirect_uri
GITHUB_OAUTH_CALLBACK=https://your-username.github.io/your-repo/

# Database (PostgreSQL)
DATABASE_URL=postgres://user:pass@host:5432/dbname

# Subscription System — Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PREMIUM=price_...
STRIPE_PRICE_PRO=price_...

# App
APP_BASE_URL=https://stixmagic.com
# Internal API base URL used by the Telegram bot to reach the server API
# Defaults to http://localhost:PORT when bot and server run in the same process
INTERNAL_API_URL=http://localhost:5000

# Admin debug endpoint (set to "false" to disable in production)
ADMIN_API_ENABLED=true
```

### Installation
```bash
npm install
npm run dev
```

### OAuth Setup
1. Create GitHub repository for OAuth callback
2. Upload `github-oauth-callback.html` as `index.html`
3. Enable GitHub Pages
4. Update Zoom app OAuth Redirect URL to GitHub Pages URL

## Commands

### User Commands
- `/start` - Welcome message and bot introduction
- `/help` - Command list and usage instructions
- `/lang` - Switch between English/Spanish
- `/zoomlogin` - Zoom OAuth authentication

### Meeting Management
- `/createroom [topic]` - Create instant meeting with auto-multipin
- `/scanroom [meeting_id]` - Scan meeting participants
- `/monitor [meeting_id]` - Start/stop automatic monitoring
- `/chatwatch [meeting_id]` - Monitor and moderate Zoom chat

### Browser Bot Automation (Admin)
- `/startbot [meeting_id] [zoom_link]` - Start browser bot for multipin automation
- `/stopbot [meeting_id]` - Stop browser bot automation
- `/botstatus` - View all active browser bots status

### Admin Commands
- `/startsession` - Start monitoring session (test mode)
- `/status` - Bot system status with browser bot info
- `/shutdown` - End monitoring session and cleanup browser bots
- `/promote [meeting_id] [username]` - Promote user to cohost
- `/commandchat` - Manage Command Chat integration

## Development

### Project Structure
```
├── bot.cjs                 # Main Telegram bot logic
├── server/
│   ├── index.ts           # Express server
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database interface
│   └── vite.ts            # Development server
├── client/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Route pages
│   │   └── lib/           # Utilities
│   └── index.html         # Frontend entry
├── shared/
│   └── schema.ts          # Database schema
└── zoomAuth.js            # Zoom API integration
```

### Key Features Implementation

#### Multipin Core System
- 60-second camera-off timer before access expires
- Instant regrant when camera + hand raise requirements met
- Hand raise requirement prevents accidental grants

#### OAuth Bypass Solution
- GitHub Pages hosts static callback page
- Redirects to Replit with OAuth parameters
- Bypasses Zoom's dynamic domain restrictions

#### Meeting Analytics
- Real-time participant tracking
- Violation detection and reporting
- Meeting insights with duration statistics

## Deployment

### Replit Deployment
1. Import repository to Replit
2. Configure environment variables
3. Run `npm run dev`
4. Access dashboard at provided URL

### Production Considerations
- Set up proper database migrations
- Configure logging and monitoring
- Implement rate limiting
- Set up backup strategies

## Subscription System

The subscription system provides plan-based feature access for Telegram users, backed by Stripe payments.

### Subscription Architecture

#### Design Principle

`telegramUsers.plan` is the **current entitlement snapshot** — the source of truth for runtime feature access.
`subscriptions` is the **billing record** — it mirrors Stripe's state for auditability.

Stripe is never queried at runtime for feature decisions; the local DB is always the authoritative source.

#### Plans

| Plan | Description |
|------|-------------|
| `free` | Basic access (default) |
| `premium` | Unlock advanced features |
| `pro` | Unlock everything |

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

### Bot Commands

- `/start` — Creates a user account (free plan) and shows welcome message with plan info
- `/plans` — Shows available plans with inline upgrade buttons (fetches fresh plan from API)

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/user` | Upsert Telegram user (idempotent) |
| `GET` | `/api/user/:telegram_id` | Get user info and current plan |
| `POST` | `/api/subscription/create-checkout` | Create Stripe Checkout session |
| `POST` | `/api/subscription/webhook` | Handle Stripe webhook events |
| `GET` | `/api/admin/user/:telegram_id` | Debug: user + subscription + entitlement |

#### Create Checkout — request body
```json
{
  "telegram_id": "123456789",
  "plan": "premium"
}
```

#### Admin endpoint

The admin endpoint is enabled by default and returns the full user/subscription/entitlement debug payload. Disable it in production:

```env
ADMIN_API_ENABLED=false
```

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

## Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For technical support or feature requests:
- Create GitHub issue
- Contact development team
- Check documentation

---

**LA NUBE BOT** - Revolutionizing virtual collaboration through intelligent automation.