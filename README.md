# InvoiceHub (Foundation)

InvoiceHub is a Next.js foundation branch for an accounting document processing platform.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Auth.js (NextAuth) with Google OAuth
- Zod validation

## Implemented in this branch
- Core project architecture and route structure
- Prisma schema for users, companies, documents, OCR records, audit logs, and export jobs
- Role/status enums for auth and document lifecycle
- Auth foundation with Google SSO and DB-backed access checks
- Shared auth and activity utilities
- Protected placeholder pages for main app sections
- Seed script for admin user, sample companies, and default document types

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env
   ```
3. Configure Google OAuth credentials and database URL.
4. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
5. Push schema and seed (optional in local dev):
   ```bash
   npx prisma db push
   npm run prisma:seed
   ```
6. Start dev server:
   ```bash
   npm run dev
   ```

## Environment variables
- `DATABASE_URL`: PostgreSQL connection string.
- `AUTH_SECRET`: Secret for Auth.js.
- `AUTH_URL`: Base URL for auth callbacks (e.g. `http://localhost:3000`).
- `GOOGLE_CLIENT_ID`: Google OAuth client id.
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret.
- `OCR_PROVIDER`: OCR backend selector (`mock`, `openai`, or `google_vision`).
- `OPENAI_API_KEY`: Required when `OCR_PROVIDER=openai`.

## Notes
- Unknown Google users are denied sign-in.
- OCR providers:
  - `mock` (default) keeps deterministic sample OCR output for local/dev flows without external APIs.
  - `openai` sends uploaded image/PDF files to OpenAI Responses API and validates strict JSON output before persisting.
  - `google_vision` is reserved for future integration and currently returns a clear provider error if selected.
- Disabled users are denied sign-in and blocked from protected routes.
- OCR, exports, and full CRUD flows are intentionally out of scope for this branch.
