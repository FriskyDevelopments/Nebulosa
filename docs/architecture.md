# Stix Magic Platform – System Architecture

## Overview

The Stix Magic Platform is a **modular monolith** backend designed to power:

- A **web frontend** via a RESTful JSON API
- A **Telegram bot interface** via the Telegram Bot API

It is architected to migrate cleanly into independent microservices as the platform scales.

---

## Repository Structure

```
src/
├── api/                     # HTTP API layer
│   ├── app.js               # Express application factory
│   ├── server.js            # Server entry point
│   ├── controllers/         # Route handlers
│   │   ├── auth.controller.js
│   │   ├── users.controller.js
│   │   ├── content.controller.js
│   │   ├── media.controller.js
│   │   ├── analytics.controller.js
│   │   └── health.controller.js
│   ├── middleware/          # Cross-cutting concerns
│   │   ├── authenticate.js  # JWT + API key authentication
│   │   ├── validate.js      # Zod request validation
│   │   └── error-handler.js # Structured error handling
│   └── routes/              # Express router definitions
│       ├── auth.routes.js
│       ├── users.routes.js
│       ├── content.routes.js
│       ├── media.routes.js
│       ├── analytics.routes.js
│       ├── integrations.routes.js
│       └── health.routes.js
│
├── auth/                    # Authentication & authorization
│   ├── authentication/      # JWT, API keys, password hashing
│   └── authorization/       # RBAC role guards
│
├── core/                    # Platform primitives
│   ├── config/              # Environment-based configuration
│   ├── logger/              # Structured Winston logger
│   └── utilities/           # Shared helpers
│
├── database/                # Data layer
│   ├── schema/              # Prisma schema (schema.prisma)
│   ├── migrations/          # SQL migration files
│   ├── repositories/        # Data-access objects
│   └── client.js            # Prisma client singleton
│
├── integrations/            # External service adapters
│   ├── telegram/            # Telegram Bot API integration
│   ├── storage/             # File storage (local / S3)
│   └── external-apis/       # Generic HTTP client with retry
│
├── services/                # Business logic layer
│   ├── user-service/        # User account management
│   ├── content-service/     # Content CRUD
│   ├── media-service/       # Media metadata management
│   └── analytics-service/   # Event tracking & aggregation
│
├── workers/                 # Background job processing
│   ├── index.js             # Worker entry point
│   ├── queues/              # Bull/Redis queue setup
│   ├── jobs/                # Job enqueuer functions
│   └── processors/          # Job handler functions
│
└── tests/                   # Node.js unit & integration tests
```

---

## Architecture Layers

```
┌──────────────────────────────────────────────────────────┐
│                     HTTP / Telegram                       │
├──────────────────────────────────────────────────────────┤
│                   API Layer (Express)                     │
│   Routes → Middleware → Controllers                       │
├──────────────────────────────────────────────────────────┤
│                   Service Layer                           │
│   UserService │ ContentService │ MediaService │ Analytics │
├──────────────────────────────────────────────────────────┤
│                 Repository / Database Layer               │
│         Prisma ORM  ←→  PostgreSQL                        │
├──────────────────────────────────────────────────────────┤
│           Background Workers (Bull / Redis)               │
│   MediaProcessor │ AnalyticsProcessor │ WebhookProcessor  │
├──────────────────────────────────────────────────────────┤
│                   Integrations                            │
│   Telegram Bot │ Storage Provider │ External APIs         │
└──────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Runtime | Node.js 18+ | LTS, excellent async I/O, broad ecosystem |
| HTTP Framework | Express 4 | Mature, minimal, flexible middleware model |
| Database | PostgreSQL | ACID compliance, rich querying, JSON support |
| ORM | Prisma | Type-safe, migration tooling, readable schema DSL |
| Queue | Bull (Redis) | Reliable job queues with retries and priority |
| Validation | Zod | Runtime schema validation with TypeScript-style ergonomics |
| Auth | JWT + API Keys | Stateless access tokens; API keys for bot/service clients |
| Logging | Winston | Structured JSON in prod, colorised in dev |

---

## Security Model

- All routes except `/health` and `/auth` require authentication.
- Authentication supports **JWT Bearer tokens** and **API keys** (`x-api-key` header).
- Role-based access control: `ADMIN > USER > BOT`.
- Passwords are hashed with bcrypt (12 rounds).
- API keys are bcrypt-hashed before storage.
- Rate limiting is applied globally (configurable via env vars).
- Helmet provides HTTP security headers.
- Secrets are loaded exclusively from environment variables – never hardcoded.

---

## Scaling Path

The modular monolith can be split into microservices by:

1. Extracting each `src/services/*` into its own Node.js process.
2. Moving inter-service calls to message-passing via the existing Redis queues.
3. Deploying each service independently with its own database connection pool.
4. Introducing an API gateway (e.g. Kong or nginx) to route traffic.
