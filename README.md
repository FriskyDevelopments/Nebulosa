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

### Token Wallet Commands
- `/balance` - Show your current token balance and plan
- `/wallet` - Show wallet summary (balance, plan, last refill)
- `/buy` - Browse token purchase options

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
├── config/
│   └── tokenCosts.js      # Token cost configuration
├── workers/
│   └── monthlyTokenRefill.js  # Monthly token refill worker
├── jobs/
│   └── stickerGenerationQueue.js  # BullMQ sticker generation queue
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

## Token Wallet Architecture

The token system uses a **ledger model** — balances are never stored directly; they are computed from the sum of all transactions. This ensures auditability and prevents double-spending.

### Database Table: `token_transactions`

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Primary key |
| `user_id` | text | Telegram user ID |
| `amount` | integer | Positive (credit) or negative (debit) |
| `type` | text | `credit` or `debit` |
| `source` | text | `subscription_refill`, `manual_credit`, `feature_use`, `admin_adjustment` |
| `created_at` | timestamp | Transaction time |

### Balance Calculation

```
balance = SUM(amount) WHERE user_id = '<telegram_id>'
```

Example ledger:
```
+100  subscription_refill   (free plan monthly grant)
 -10  feature_use            (sticker generation)
  -5  feature_use            (magic trigger)
= 85  balance
```

### Subscription Plans & Monthly Token Grants

| Plan | Monthly Tokens |
|------|---------------|
| free | 100 |
| premium | 1,000 |
| pro | 5,000 |

### Token Costs (configurable via environment variables)

| Action | Default Cost | Env Variable |
|--------|-------------|--------------|
| sticker_generation | 10 tokens | `TOKEN_COST_STICKER` |
| pack_export | 25 tokens | `TOKEN_COST_EXPORT` |
| magic_trigger | 5 tokens | `TOKEN_COST_MAGIC` |

Costs are defined in `config/tokenCosts.js`.

### API Endpoints

```
GET  /api/tokens/balance/:telegram_id   → { "balance": 420 }
GET  /api/tokens/history/:telegram_id   → [ ...transactions ]
POST /api/tokens/consume                → debit transaction or 402 INSUFFICIENT_TOKENS

POST body: { "telegram_id": "...", "amount": 10, "action": "sticker_generation" }
```

### Monthly Refill Worker

The worker at `workers/monthlyTokenRefill.js` credits tokens to all users based on their subscription plan. Run it monthly via cron or a Railway cron job:

```bash
node workers/monthlyTokenRefill.js
```

### Optional Job Queue (BullMQ + Redis)

Long-running tasks (e.g. AI sticker generation) can be offloaded to a Redis-backed queue:

```bash
# Set in .env
REDIS_URL=redis://localhost:6379
```

```js
const { addStickerJob } = require('./jobs/stickerGenerationQueue');
await addStickerJob({ telegramId: '123', stickerData: { ... } });
```

If `REDIS_URL` is not set or BullMQ is not installed, the queue degrades gracefully.

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