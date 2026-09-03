# Implementation Log

Running history of what's been built and why. One entry per commit, newest first. Update this alongside each commit rather than reconstructing it later.

---

## a1009bf — CI: add Postgres service and run migrations before tests
**2026-09-03**

- `.github/workflows/ci.yml` — added a `postgres` service container and a `prisma migrate deploy` step before `npm test`, since the new `/health` test needs a real database to hit.

## d5b5234 — Phase 1 backend skeleton: Express + Prisma + /health
**2026-09-03**

Closes out Phase 1 of the backend checklist.

- `backend/src/app.js` / `index.js` — Express app split from the listener so tests can import the app without binding a port. `GET /health` runs `SELECT 1` via Prisma to prove DB connectivity, not just that the process is up.
- `backend/src/prisma.js` — Prisma client, using the `@prisma/adapter-pg` driver adapter (Prisma 7 requires an explicit adapter now, not just a connection string).
- `backend/prisma/schema.prisma` — `User` (`kdfSalt`, `authHash`) and `VaultEntry` (`passwordCiphertext`, `iv`, `authTag`) models matching the API contract; first migration applied.
- `backend/src/health.test.js` — real test replacing the placeholder `npm test`, using Node's built-in test runner.
- `backend/.env.example` — placeholder `DATABASE_URL`/`PORT`.

Notable friction along the way (all environment issues, not design problems):
- npm's `latest` tag for `prisma` currently points at an unstable `8.0.0-rc.12` — pinned to the last stable release, `7.10.0`, instead.
- Port 5432 was already taken by a native Postgres service on this machine, and 5433 by the Kudi AI project's Docker container — this project's Postgres container runs on **5434** locally.
- Prisma 7's default client generator now outputs TypeScript; switched to the classic `prisma-client-js` generator since this project has no TypeScript setup.
- Prisma's `prisma init` also scaffolds AI-assistant doc folders (`.claude/skills`, `.windsurf/skills`, `.agents/skills`, `skills-lock.json`) — removed, not part of the app.
- Node's built-in test runner, pointed at a bare directory on Windows, misidentified `src/index.js` as a test file and ran the server itself — fixed by pointing `npm test` at `src/*.test.js` explicitly.

Verified manually with `npm start` + `curl http://localhost:3000/health` → `{"status":"ok","db":"connected"}`.

## f935d1a — Add IMPLEMENTATION_LOG.md
**2026-09-03**

- `IMPLEMENTATION_LOG.md` — this file. Plain-English commit log kept as a learning trail alongside terse git history, since the point of this project is learning backend concepts while building, not just shipping code.

## 948f50c — Add client-side vault crypto module
**2026-09-03**

Implements the client-side encryption decision from the previous commit.

- `frontend/src/crypto/vaultCrypto.mjs` — derives a master key from the master password via PBKDF2 (600k iterations, SHA-256), then splits it via HKDF into two independent keys: an AES-GCM 256 encryption key (`vault-encryption-key`, stays in the browser) and an auth proof (`vault-auth-proof`, sent to the server at login). Also provides `encryptEntry`/`decryptEntry` for vault entries.
- `frontend/src/crypto/vaultCrypto.test.mjs` — 4 tests via Node's built-in test runner: deterministic derivation, key independence, encrypt/decrypt round-trip, wrong-password decryption failure.

Verified with `node --test frontend/src/crypto/vaultCrypto.test.mjs` — all passing.

## e1d2d01 — Resolve encryption decision: client-side, update API contract
**2026-09-03**

- `backend/README.md` — resolved the open "client-side vs. server-side encryption" decision in favor of client-side. Updated the Phase 2 checklist and API contract accordingly:
  - Added `POST /auth/signup` and `GET /auth/salt/:username`
  - `POST /auth/login` now sends `{ username, authProof }` instead of `{ username, masterPassword }`
  - `vault-entries` endpoints now send/return `{ passwordCiphertext, iv, authTag }` instead of a plaintext `password` — the server never handles decrypted vault contents

## 7f0b4ea — Initial project scaffold with CI skeleton
**2026-09-03**

- Monorepo structure: `backend/` (Express API, not yet implemented) and `frontend/` (React app, not yet implemented)
- `.github/workflows/ci.yml` — runs `npm ci && npm test` in `backend/` on push/PR to `main`
- `.gitignore`, root `README.md`, `backend/package.json` (placeholder test script), `frontend/README.md`

---

## Next up

- Phase 1 backend skeleton: Express app, `GET /health`, ORM choice (Prisma or Drizzle), `users`/`vault_entries` schema, first migration
- Frontend app scaffold (Vite + React) — doesn't exist yet, only the crypto module does
