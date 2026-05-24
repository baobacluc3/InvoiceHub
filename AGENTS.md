# InvoiceHub Agent Guide

## Project Context
InvoiceHub is the foundation branch for an accounting document processing platform. This branch should prioritize stable architecture, typed domain models, authentication and authorization boundaries, and placeholder UI routes.

## Coding Rules
- Use TypeScript strict mode and avoid `any` unless absolutely necessary.
- Prefer server components in App Router by default.
- Put reusable server logic under `lib/`.
- Use Zod for validation schemas in shared utilities.
- Keep UI placeholders intentionally minimal and clearly labeled.
- Do not implement full CRUD, OCR engine logic, or export generation in this branch.
- When adding Prisma models, always include timestamps and explicit relations.
- Protect app routes through shared auth guards and middleware.
