# Backend — step-by-step build plan

Node.js + Express + PostgreSQL. This doc is the working checklist for Phases 1–3 of the project roadmap (backend only — frontend has its own plan later).

## Encryption decision: client-side (resolved)

Browser derives the key and encrypts/decrypts via the Web Crypto API; backend only ever stores/returns ciphertext, and never sees the master password or the encryption key. Implemented in `frontend/src/crypto/vaultCrypto.mjs`.

Two keys are derived from the master password via PBKDF2 (600k iterations, SHA-256) → HKDF with distinct `info` labels, so they're computationally independent of each other:
- **Encryption key** (`vault-encryption-key`) — AES-GCM 256, stays in the browser, encrypts/decrypts vault entries
- **Auth proof** (`vault-auth-proof`) — sent to the server at login instead of the master password; the server hashes and stores it like a password, but it reveals nothing about the encryption key

This changes the shape of the auth and `vault-entries` bodies below — the server hands back ciphertext, and the client decrypts locally.

---

## Phase 1 — Skeleton

- [ ] `npm install express` in `backend/`
- [ ] Create `src/index.js` — minimal Express app, listens on `process.env.PORT`
- [ ] Pick an ORM: Prisma or Drizzle, install it
- [ ] Configure `DATABASE_URL` via `.env` (add `.env.example` with placeholder values — never commit real `.env`)
- [ ] Define schema from the agreed data model:
  - `users`: `id`, `username`, `kdf_salt`, `created_at`
  - `vault_entries`: `id`, `user_id`, `site_name`, `username`, `password_ciphertext`, `iv`, `auth_tag`, `notes`, `url`, `created_at`, `updated_at`
- [ ] Run the first migration against a local Postgres instance
- [ ] Add `GET /health` — should also run a trivial DB query, to prove app ↔ DB connectivity, not just that the process is running
- [ ] Manually test with curl / Thunder Client / Postman
- [ ] Replace the placeholder `npm test` script with a real (even if minimal) test for `/health`, so CI starts meaning something

## Phase 2 — Auth & crypto core

- [x] Encryption-location decision resolved (client-side, see above)
- [x] Key derivation module — `frontend/src/crypto/vaultCrypto.mjs` (PBKDF2 + HKDF), tested in `vaultCrypto.test.mjs`
- [ ] `POST /auth/signup` — client sends `{ username, kdfSalt, authProof }`; backend hashes `authProof` (bcrypt/argon2) and stores it + `kdfSalt`, never the raw value
- [ ] `GET /auth/salt/:username` — returns the stored `kdfSalt` so the client can derive keys before login
- [ ] `POST /auth/login` — client sends `{ username, authProof }`; backend compares against the stored hash, issues a session (JWT or httpOnly cookie)
- [ ] Auth middleware — rejects any vault route without a valid session
- [ ] `POST /auth/logout`
- [ ] Manually walk through signup → login → protected route → logout

## Phase 3 — Vault CRUD

- [ ] `GET /vault-entries` — list, metadata only (no decrypted passwords in the list view)
- [ ] `GET /vault-entries/:id` — single entry, decrypted
- [ ] `POST /vault-entries` — create, encrypt before writing to DB
- [ ] `PUT /vault-entries/:id` — update, re-encrypt any changed sensitive fields
- [ ] `DELETE /vault-entries/:id`
- [ ] All of the above sit behind the auth middleware from Phase 2
- [ ] Full manual test pass of create/read/update/delete via Postman/curl before touching the frontend

---

## Reference — API contract (v1)

```
POST   /auth/signup         { username, kdfSalt, authProof } → { id, username }
GET    /auth/salt/:username → { kdfSalt }
POST   /auth/login          { username, authProof } → { token }
POST   /auth/logout         → 204

GET    /vault-entries       → [{ id, siteName, username, url, createdAt }]
GET    /vault-entries/:id   → { id, siteName, username, passwordCiphertext, iv, authTag, url, notes }
POST   /vault-entries       { siteName, username, passwordCiphertext, iv, authTag, url?, notes? } → created entry
PUT    /vault-entries/:id   { ...fields } → updated entry
DELETE /vault-entries/:id   → 204
```

The server never receives or returns a decrypted password — `passwordCiphertext`/`iv`/`authTag` are opaque to it. Decryption happens client-side with the encryption key derived from the master password.

## Ground rules while building

- Master password and encryption keys never reach the backend at all — only `authProof` does, and only to be hashed and compared, never logged or persisted in raw form
- `.env` never committed — already enforced by `.gitignore`, don't fight it
- Keep CI green — swap in real tests as each route lands, rather than leaving the placeholder in place indefinitely
