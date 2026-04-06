# STIX MΛGIC Unified System Architecture & Setup Guide

This document outlines how the Telegram bot, the React web dashboards (Nebulosa Control Center, Spark), and the external integrations (Zoom) form a single, unified platform, and what you need to run it in production.

## 1. Unified System Overview

The STIX MΛGIC system is composed of several moving parts that communicate seamlessly:

### A. The Telegram Bot (The User Entrypoint)
- **Role:** Handles core user interactions such as account creation, plan upgrades via Telegram Stars or Stripe, and initiating sticker creation logic.
- **Tech:** Built using `grammy` and `node-telegram-bot-api`. It listens for commands like `/start` or `/plans`.
- **Integration:** When users pay for a plan or request processing, the bot communicates with the internal Express API (`/api/subscription`, `/api/users`) to persist states in the database.

### B. The React Web Application (The Interface)
- **Role:** Provides the visual tools for users and operators.
  - **Magic UI & Spark (`/magic`, `/spark`):** Where users can upload images, transform them, and manage their sticker projects.
  - **Nebulosa Control Center (`/nebulosa`):** The operator dashboard used for monitoring live sessions, executors, sending alerts, and queueing actions (e.g., Zoom participant management).
- **Tech:** React + Vite, styled with Tailwind CSS & Shadcn UI.
- **Integration:** The UI consumes the Express backend API using standard REST calls. It allows operators to trigger backend logic that controls meetings or bots.

### C. The Node.js / Express Backend (The Brain)
- **Role:** Serves as the central API gateway. It handles Telegram webhooks/polling, serves the REST API for the React frontend, processes OAuth callbacks (Zoom, Telegram), and connects to the database.
- **Integration:** The server coordinates between the frontend UI and the Telegram bot. For instance, when the Web UI triggers a Zoom command or a Telegram OAuth login, this backend processes the secure tokens and updates the user's database record.

### D. The Zoom Integration (The Extension)
- **Role:** Enables real-time management of Zoom meetings (e.g., auto-pinning users, monitoring cameras) directly linked to Nebulosa commands.

---

## 2. What You Need to Have (Prerequisites)

To launch this unified system, you need accounts and tokens from the following services:

### 1. Telegram Platform
- **Bot Token:** Talk to [@BotFather](https://t.me/botfather) on Telegram to create a new bot and obtain your `TELEGRAM_BOT_TOKEN`.
- **Telegram Stars / Stripe Integration:** In BotFather, configure payments for your bot if you plan to accept real money or Telegram Stars.

### 2. Zoom App Marketplace (If using Zoom features)
- **App Credentials:** Create an OAuth app in the Zoom App Marketplace.
- **Tokens Required:** `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`.
- **Redirect URI:** Configure the Zoom OAuth redirect URI to point to your domain's callback path (e.g., `https://yourdomain.com/api/auth/zoom/callback`).

### 3. Database
- **PostgreSQL Database:** A running instance of PostgreSQL (e.g., Neon, Supabase, or AWS RDS).
- **Token Required:** `DATABASE_URL`.

### 4. Hosting / Infrastructure
- **Server:** A Node.js environment (e.g., Render, Railway, DigitalOcean) to run the Express backend and the Telegram bot process.
- **Domain:** A public HTTPS domain required for Telegram Webhooks and OAuth callbacks.

---

## 3. Environment Variable Checklist

Configure the following variables in your `.env` file or hosting provider's secret manager:

```env
# Server & Environment
PORT=3000
APP_BASE_URL=https://your-production-domain.com

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
BOT_TOKEN=your-bot-token-from-botfather

# Database
DATABASE_URL=postgresql://user:password@host:port/db_name

# Nebulosa Control Center (Operator Auth)
NEBULOSA_ENV=prod
NEBULOSA_SESSION_SECRET=super-secure-random-string
NEBULOSA_EXECUTOR_SECRET=another-secure-random-string
NEBULOSA_OPERATOR_ALLOWLIST=admin,operator

# Zoom OAuth
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
ZOOM_REDIRECT_URI=https://your-production-domain.com/api/auth/zoom/callback
```

---

## 4. How the Flow Actually Works in Practice

### Scenario: A user signs up and upgrades
1. User finds your bot on Telegram and sends `/start`.
2. The **Telegram Bot** catches the message, sends an API request to the **Express Backend** to register the user in the **Database**.
3. The bot replies with a welcome message featuring the STIX MΛGIC branding.
4. User clicks "Sign In" on your **React Web App** (via Telegram OAuth). The **Express Backend** verifies the Telegram hash and logs them into the web dashboard.
5. In the Web App (`/magic`), the user uploads an image, and the magic flow generates a sticker pack using the unified database record.

### Scenario: Operator monitors a Zoom room
1. Operator logs into `/nebulosa` using secure Nebulosa operator credentials.
2. The **React UI** fetches real-time command queues and active executor status from the **Express Backend**.
3. The operator clicks "Mute Participant".
4. The Web App sends a `POST /api/v1/commands` to the **Express Backend**, which queues the action.
5. The associated **Zoom extension/executor** polls the backend, receives the command, and executes the mute action live in the meeting.

---
