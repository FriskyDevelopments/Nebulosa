# Repo Audit Checklist & Identified Risks

The following items were identified during a fast repo audit for workflow mismatches. Some low-risk items were fixed (Node version drift, missing test script, placeholder branch names), but the following risks and inconsistencies remain and should be addressed by the team:

## 1. Secrets and Environment Assumptions
- **`.env.example` vs `railway.env.example`:** There are environment variables with real-looking tokens/secrets checked into `railway.env.example` (e.g. `BOT_TOKEN`, `ZOOM_USER_CLIENT_SECRET`). Please review and ensure these aren't live production secrets.
- **Missing `.env` defaults:** No local `.env` or `.nvmrc` to enforce local developer environments consistently.
- **Hardcoded secrets in scripts:** Some test scripts or backup scripts appear to read directly from `.env` or have inline secrets.

## 2. Lockfiles and Package Managers
- **Inconsistent package manager usage:** We have a `package-lock.json` indicating npm is the primary package manager. The GitHub workflow `node.js.yml` relies on `npm ci`. Ensure all developers use `npm` locally to avoid lockfile churn (no `yarn.lock` or `pnpm-lock.yaml` found, which is good, but enforce `npm` via `engines` in `package.json` if possible).

## 3. Deployment Inconsistencies
- **Conflicting deployment workflows:**
  - `package.json` has a `"deploy": "railway up"` script.
  - There is a `Dockerfile` and a GitHub Action `docker-image.yml` to build docker images.
  - There are multiple deploy scripts like `railway-deploy.sh`, `upload-ftp.sh`, `upload-rsync.sh`.
  - Please standardize the deployment strategy. If Railway is the primary target, consider using the Railway GitHub integration instead of disparate scripts and workflows.

## 4. Testing Strategy
- **Missing Tests:** The `test` script in `package.json` simply echoes an error and exits with code 0 to pass CI. A proper testing framework (like Jest or Vitest) should be implemented and tests written for core logic.
- **Brittle CI Steps:** The `node.js.yml` CI workflow assumes tests exist.

## 5. Multiple "Bot" Entrypoints
- The root directory contains numerous `.js` files starting bots (`railway-bot.js`, `production-bot.js`, `stixmagic-bot.js`, `railway-complete-bot.js`). This creates confusion about what the actual production entrypoint is. `package.json` indicates `stixmagic-bot.js`, while the Dockerfile uses `railway-complete-bot.js`.

**Recommendation:** Clean up old scripts, consolidate deployment configurations, and establish a clear testing strategy.
