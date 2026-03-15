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
- **🪄 Sticker Spell Engine**: Map Telegram stickers to bot actions — portals, rituals, reactions and more

## Sticker Spell Engine

The Sticker Spell Engine lets specific Telegram stickers trigger bot actions automatically.  Instead of typing a command, users simply send a registered sticker and the bot executes the configured spell.

### How it works

1. A user sends a sticker inside a Telegram chat where the bot is present.
2. The bot reads the sticker's `file_id`.
3. It looks up the `file_id` in the **spell registry** (the `sticker_spells` table).
4. If a matching spell is found, the configured action is executed.

### Supported action types

| Action type | Behaviour |
|---|---|
| `send_message` | Bot replies with the `payload` text |
| `send_link` | Bot replies with an inline button that opens the `payload` URL |
| `send_sticker` | Bot sends the sticker whose `file_id` is in `payload` |
| `trigger_reaction` | Bot sends the `payload` as an emoji / reaction message |
| `launch_feature` | Bot announces a feature launch with the `payload` description |

### Registering a spell

Use the Admin API to add a new spell:

```bash
curl -X POST http://localhost:3000/api/spells \
  -H "Content-Type: application/json" \
  -d '{
    "stickerFileId": "ABC123",
    "spellName": "portal",
    "actionType": "send_link",
    "payload": "https://t.me/+invite",
    "tokenCost": 5
  }'
```

### Admin API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/spells` | List all registered spells |
| `POST` | `/api/spells` | Create a new spell |
| `DELETE` | `/api/spells/:id` | Delete a spell by id |

### Default spells (`config/spellDefaults.ts`)

Three built-in spell templates are provided:

| Spell name | Action type | Default payload |
|---|---|---|
| `portal` | `send_link` | `https://t.me/+invite` |
| `ritual` | `send_message` | 🔥 Ritual started — the event has begun! |
| `magic` | `trigger_reaction` | ⚡ Magic activated! |

Register a sticker `file_id` against one of these templates via the Admin API to activate it.

### Adding new stickers

1. Find the `file_id` of the Telegram sticker you want to use (forward the sticker to `@userinfobot` or log it from the bot console).
2. Call `POST /api/spells` with the `file_id`, the desired `spell_name`, `action_type`, and `payload`.
3. The spell is immediately active — no restart needed.

### Optional token cost

Set `token_cost > 0` on a spell to require tokens before it fires.  The token deduction logic lives in `bot.cjs` inside the `executeSpell` function and can be wired to your existing token balance system.


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