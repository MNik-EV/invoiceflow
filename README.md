<div align="center">
  <img src="./public/logo.svg" width="96" alt="InvoiceFlow logo" />
  <h1>InvoiceFlow</h1>
  <p><strong>A production-ready, Persian-first invoice approval and reimbursement platform.</strong></p>
  <p>
    <a href="./README.fa.md">فارسی</a> ·
    <a href="./ARCHITECTURE.md">Architecture</a> ·
    <a href="./API_DOCUMENTATION.md">API</a> ·
    <a href="./DEPLOYMENT.md">Deployment</a>
  </p>
  <p>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" />
    <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white" />
    <img alt="OpenID Connect" src="https://img.shields.io/badge/SSO-OpenID_Connect-F78C40" />
    <img alt="License" src="https://img.shields.io/badge/license-MIT-orange" />
  </p>
</div>

InvoiceFlow replaces scattered chat messages, spreadsheets, and untraceable reimbursements with one secure workflow. It currently provides two focused invoice paths: team lunch reimbursements and specialist laboratory/electronics purchases such as ICs, MOSFETs, modules, sensors, PCBs, and tools.

The product ships with a full Persian RTL interface, Jalali dates, light/dark themes, private document storage, auditable financial actions, local authentication, and standards-based OpenID Connect SSO.

![InvoiceFlow product preview](./docs/images/product-preview.svg)

## Why InvoiceFlow?

| For employees                         | For finance teams                | For operators                           |
| ------------------------------------- | -------------------------------- | --------------------------------------- |
| Three-step invoice submission         | Review, reject, approve, and pay | Docker and one-command local mode       |
| Separate lunch and lab purchase forms | Immutable paid records           | PostgreSQL migrations and health checks |
| Personal history only                 | Persian Excel and CSV reports    | Local/OIDC/hybrid authentication        |
| Responsive Persian UI                 | Settings and full audit trail    | Private, replaceable storage adapter    |

## Highlights

- **Focused user experience:** ordinary users only need Home, New Invoice, History, and Bank Profile.
- **Two business workflows:** lunch reimbursement uses `min(invoice, participants × allowance)`; specialist purchases use the reviewed invoice amount.
- **Secure by default:** opaque revocable sessions, Argon2id passwords, server-side RBAC and ownership checks, CSP, request throttling, MIME sniffing, size limits, encrypted bank details, and no public document URLs.
- **Traceable finance:** approvals, rejections, payments, settings, login events, user changes, and exports are audited.
- **Reliable records:** PostgreSQL constraints, optimistic concurrency, status history, duplicate warnings, and permanent payment locking.
- **Iran-ready:** Persian RTL, Vazirmatn, Jalali input/display, Gregorian database dates, toman integers, and UTF-8/BOM CSV exports.
- **Integration-ready:** OpenID Connect Authorization Code flow with PKCE, state, nonce, account linking, and optional safe auto-provisioning.

## Tech stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn-style Radix primitives, Prisma 6, PostgreSQL 17, Zod, React Hook Form, Vitest, Playwright, and ExcelJS.

## Quick start without Docker

This is the easiest way to evaluate the project on Windows, macOS, or Linux. Node.js 20.9+ is required.

```bash
npm ci
npm run dev:local
```

The command starts an isolated real PostgreSQL instance under `.local/`, generates secure development secrets, applies migrations, seeds accounts, and starts the app at [http://localhost:3000](http://localhost:3000). The generated password is printed once and stored only in the ignored `.env` file.

Stop everything with `Ctrl+C`. If needed:

```bash
npm run db:local:stop
```

## Quick start with Docker

```bash
cp .env.example .env
# Replace every placeholder secret in .env
docker compose up --build -d
docker compose run --rm -e SEED_DEFAULT_PASSWORD='a-strong-temporary-password' migrate npm run db:seed
```

Open `http://localhost:3000`. See [DEPLOYMENT.md](./DEPLOYMENT.md) before exposing the service.

## Seeded local accounts

| Username                              | Role                  |
| ------------------------------------- | --------------------- |
| `superadmin`                          | Super administrator   |
| `financeadmin`                        | Finance administrator |
| `davood`, `mozhgan`, `behdad`, `sara` | Employee              |

All accounts use `SEED_DEFAULT_PASSWORD`. Seed data is opt-in and must not be used as production identity data.

## OpenID Connect SSO

Set `AUTH_PROVIDER=oidc` to require SSO or `AUTH_PROVIDER=hybrid` to keep both local and SSO login. Register this callback in the identity provider:

```text
https://your-domain.example/api/v1/auth/oidc/callback
```

Then configure `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, and `OIDC_REDIRECT_URI`. Auto-provisioning is off by default; when enabled, only verified email identities are linked and all new accounts receive the least-privileged `USER` role.

## Quality gates

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

End-to-end tests require seeded accounts and a running application:

```bash
npx playwright install chromium
npm run test:e2e
```

## Documentation

- [Architecture and security model](./ARCHITECTURE.md)
- [Database schema and migration policy](./DATABASE.md)
- [HTTP API reference](./API_DOCUMENTATION.md)
- [Production deployment runbook](./DEPLOYMENT.md)
- [Contributing guide](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)

## Project status

InvoiceFlow is a complete production foundation: its core workflows, RBAC, uploads, reports, migrations, local development runtime, Docker image, and automated tests are implemented. Teams should still perform their own threat model, backup/restore drill, IdP integration test, and operational review before production use.

## License

Released under the [MIT License](./LICENSE). The name, logo, colors, and deployment configuration are intentionally easy to replace for downstream installations.
