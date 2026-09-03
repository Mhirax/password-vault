# Implementation Log

Running history of what's been built and why. One entry per commit, newest first. Update this alongside each commit rather than reconstructing it later.

---

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
