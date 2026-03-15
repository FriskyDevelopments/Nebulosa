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
BOT_TOKEN=your_telegram_bot_token
LOG_CHANNEL_ID=your_telegram_channel_id
ADMIN_USER_ID=your_telegram_user_id
ZOOM_USER_CLIENT_ID=your_zoom_client_id
ZOOM_USER_CLIENT_SECRET=your_zoom_client_secret
ZOOM_REDIRECT_URI=your_redirect_uri
GITHUB_OAUTH_CALLBACK=https://your-username.github.io/your-repo/
DATABASE_URL=your_postgresql_url

# Subscription System — Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PREMIUM=price_...
STRIPE_PRICE_PRO=price_...

# App base URL (used for Stripe redirect URLs)
APP_BASE_URL=https://stixmagic.com
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

## Subscription System (Phase 1)

The subscription system provides plan-based feature access for Telegram users, backed by Stripe payments.

### Plans

| Plan | Description |
|------|-------------|
| `free` | Basic access (default) |
| `premium` | Unlock advanced features |
| `pro` | Unlock everything |

### Database Schema

The subscription system adds two new tables to the existing schema:

**`telegram_users`** (extended):
- `plan` — current plan: `free`, `premium`, `pro`
- `subscription_status` — `inactive`, `active`, `cancelled`, `past_due`
- `updated_at` — last modified timestamp

**`subscriptions`**:
- `user_id` — FK to `telegram_users.id`
- `plan` — plan at time of subscription
- `provider` — payment provider (`stripe`)
- `provider_subscription_id` — Stripe subscription ID
- `status` — subscription status
- `renewal_date` — next billing date

### Bot Commands

- `/start` — Creates a user account (free plan) and shows welcome message with plan info
- `/plans` — Shows available plans with inline upgrade buttons

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/user` | Create or retrieve a user by `telegram_id` |
| `GET` | `/api/user/:telegram_id` | Get user info and current plan |
| `POST` | `/api/subscription/create-checkout` | Create Stripe Checkout session |
| `POST` | `/api/subscription/webhook` | Handle Stripe webhook events |

#### Create Checkout — request body
```json
{
  "telegram_id": "123456789",
  "plan": "premium"
}
```

#### Webhook Events handled
- `checkout.session.completed` — activates plan
- `customer.subscription.updated` — syncs status/renewal date
- `customer.subscription.deleted` — downgrades to free
- `invoice.payment_failed` — marks as `past_due`

### Stripe Setup

1. Create a Stripe account and obtain your secret key.
2. Create two recurring price objects (monthly) for Premium and Pro plans.
3. Set the price IDs in `STRIPE_PRICE_PREMIUM` and `STRIPE_PRICE_PRO`.
4. Configure a webhook endpoint pointing to `https://your-domain/api/subscription/webhook`.
5. Set `STRIPE_WEBHOOK_SECRET` to the webhook signing secret.

### Feature Access Pattern

```js
// Example gating logic
if (user.plan === 'free') {
  // basic features only
} else if (user.plan === 'premium') {
  // advanced tools unlocked
} else if (user.plan === 'pro') {
  // all features unlocked
}
```

### Future: Token System

The architecture supports adding a monthly token grant in a future phase:

| Plan | Monthly tokens |
|------|---------------|
| Free | 100 |
| Premium | 1 000 |
| Pro | 5 000 |

Tokens are **not** implemented in this phase.


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