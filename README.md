# password-manager

Self-hosted, single-user password manager. Node.js/Express backend, PostgreSQL database, React frontend (mobile app planned as a later phase reusing the same API).

## Status

Early scaffold — backend and frontend implementation not started yet. See project roadmap for phases.

## Structure

- `backend/` — Express API, Postgres access, auth and encryption logic
- `frontend/` — React app (vault UI, password generator)

## Principles

- Self-hosted only, no third-party cloud sync
- Master password never stored — vault entries are encrypted, not the password itself
- Backend built as a plain API so the frontend (web, later mobile) is just a client
