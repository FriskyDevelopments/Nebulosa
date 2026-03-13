# Magic Cut — Architecture & Developer Guide

Magic Cut is a sticker-generation platform built into Nebulosa.  
Users browse a catalog of cut masks, upload an image, and generate a custom sticker.  
Admins review and publish community-submitted mask templates.

---

## System Architecture

```
                ┌──────────────────────┐
                │      USER APP        │
                │  Web / Telegram / UI │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │   ACCESS LAYER       │
                │ plans + permissions  │
                └──────────┬───────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Catalog Masks  │ │ User Uploads   │ │ Mask Submission│
└────────────────┘ └────────────────┘ └────────────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           ▼
                ┌──────────────────────┐
                │      CUT JOBS        │
                │ queue + processing   │
                └──────────┬───────────┘
                           ▼
                ┌──────────────────────┐
                │    OUTPUT STICKER    │
                │ saved to user library│
                └──────────────────────┘
```

---

## Core Areas

### 1. Catalog

`GET /api/catalog/masks` — list masks (filtered by plan access, category, status)  
`GET /api/catalog/masks/:id` — get a single mask  

Each mask has:
- `category`: basic | rounded | outline | glow | premium | experimental | custom
- `visibility`: public | premium | pro | admin_only
- `status`: draft | active | archived | pending_review | rejected

### 2. User Flow A — Cut a Sticker

1. User creates a Magic Cut account (`POST /api/magic-cut/users`)
2. User opens the catalog (`GET /api/catalog/masks?userId=...`)
3. User uploads their image (`POST /api/uploads`)
4. User creates a cut job (`POST /api/cut-jobs`)
5. Worker processes the job (status transitions: queued → processing → completed/failed)
6. Output sticker is returned (`GET /api/cut-jobs/:id`)

### 3. User Flow B — Submit a Mask

1. User opens Submit Mask page
2. User provides mask file URL + name + description
3. Submission created with `status = pending_review` (`POST /api/mask-submissions`)
4. Admin reviews (`PATCH /api/admin/submissions/:id/review`)
5. If approved, admin publishes to catalog (`POST /api/admin/catalog/publish-from-submission/:id`)

---

## Access Control

Plans control what users can do:

| Action                    | Free | Premium | Pro | Enterprise |
|---------------------------|------|---------|-----|------------|
| Browse public masks        | ✅   | ✅      | ✅  | ✅         |
| Browse premium masks       | ❌   | ✅      | ✅  | ✅         |
| Create cut jobs            | ✅   | ✅      | ✅  | ✅         |
| Submit custom masks        | ❌   | ✅      | ✅  | ✅         |
| Priority processing        | ❌   | ❌      | ✅  | ✅         |

Access is checked via `GET /api/access/me?userId=...` and enforced on every write endpoint.

---

## API Reference

### Catalog
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/catalog/masks` | List masks (query: `category`, `status`, `userId`) |
| GET | `/api/catalog/masks/:id` | Get a specific mask |

### Uploads
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/uploads` | Create an upload record |
| GET | `/api/uploads/:id` | Get an upload |

### Cut Jobs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/cut-jobs` | Create a cut job |
| GET | `/api/cut-jobs/:id` | Get job status + output |
| GET | `/api/cut-jobs/user/:userId` | List jobs for a user |

### Mask Submissions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/mask-submissions` | Submit a mask for review |
| GET | `/api/mask-submissions/:id` | Get a submission |
| GET | `/api/mask-submissions/user/:userId` | List user's submissions |

### Access
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/access/me?userId=` | User's full access summary |
| GET | `/api/access/catalog?userId=` | Catalog visibilities for user |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/submissions` | List submissions (query: `status`) |
| PATCH | `/api/admin/submissions/:id/review` | Approve / reject / request changes |
| POST | `/api/admin/catalog/publish-from-submission/:id` | Publish to catalog |
| POST | `/api/admin/catalog/masks` | Add mask directly to catalog |

---

## Database Schema

The schema is defined in two places:
- **Drizzle ORM** (TypeScript, used at runtime): `shared/schema.ts`
- **Prisma** (portable SQL schema): `prisma/schema.prisma`

### Tables

| Table | Purpose |
|-------|---------|
| `plans` | Subscription tiers: free, premium, pro, enterprise |
| `magic_cut_users` | Platform users with plan assignment |
| `catalog_masks` | Official cut mask library |
| `user_uploads` | Images uploaded by users |
| `cut_jobs` | Job queue for image processing |
| `mask_submissions` | Community-submitted mask templates |
| `permissions` | Per-plan resource/action access rules |

---

## File Structure

```
shared/
  schema.ts              ← Drizzle ORM schema (all tables)

server/
  storage.ts             ← IStorage interface + MemStorage implementation
  routes.ts              ← All API routes (existing + Magic Cut)
  magic-cut/
    access.ts            ← AccessService (plan-based permissions)
    catalog.ts           ← CatalogService (mask browsing)
    cut-jobs.ts          ← CutJobService (job creation & processing)
    submissions.ts       ← SubmissionService (submit + admin review)

prisma/
  schema.prisma          ← Prisma schema (mirrors Drizzle schema)

client/src/
  App.tsx                ← React router
  pages/
    magic-cut.tsx        ← Main Magic Cut dashboard
    catalog.tsx          ← Catalog browse page
    cut-flow.tsx         ← Step-by-step cut flow
    submit-mask.tsx      ← Mask submission flow
```

---

## Processing Architecture

Cut jobs use a **decoupled queue model** designed for future scaling:

```
User submits cut request
  → POST /api/cut-jobs
  → record created (status = queued)
  → [future] job ID pushed to BullMQ / Redis queue
  → worker picks up job
  → worker calls image-cutting engine
  → output URL saved
  → status = completed
```

This design supports:
- AI-powered cut refinement
- Background removal
- Batch processing
- Premium priority queue

---

## Future Roadmap

- [ ] Telegram bot commands (`/catalog`, `/cut`, `/submit`)
- [ ] Token billing per cut
- [ ] Subscription gating
- [ ] AI cut engine integration
- [ ] Community mask marketplace
- [ ] Team/admin moderation tools
