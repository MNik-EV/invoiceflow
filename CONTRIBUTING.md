# Contributing

Thanks for helping improve InvoiceFlow. Please keep contributions focused, secure, and easy to review.

## Development

1. Fork the repository and create a branch from `main`.
2. Install Node.js 20.9+ and run `npm ci`.
3. Start the self-contained environment with `npm run dev:local`.
4. Add tests for behavior changes.
5. Run the quality gates before opening a pull request:

   ```bash
   npm run format:check
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

Use Conventional Commit-style subjects where practical (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`). Keep schema changes in forward-only Prisma migrations and explain data/backward-compatibility impact in the PR.

## Engineering rules

- Put business logic in domain/application modules, not React components or route handlers.
- Enforce authorization in the server service closest to the data operation.
- Never expose storage keys, secrets, passwords, full bank data, or session tokens.
- Keep money as integer toman/BigInt and dates Gregorian in storage.
- Preserve Persian RTL accessibility and both color themes.
- New invoice categories require explicit validation, approval semantics, database constraints, tests, and documentation.
- Do not weaken paid-record immutability or audit atomicity.

## Pull requests

Describe the problem, approach, screenshots for UI changes, test evidence, migration impact, and security/privacy impact. Small cohesive PRs are preferred. A maintainer review and green CI are required before merge.

Report vulnerabilities through the process in [SECURITY.md](./SECURITY.md), not a public issue.
