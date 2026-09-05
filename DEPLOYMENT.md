# Production Deployment Runbook

InvoiceFlow produces a standalone Next.js container. The provided Compose stack includes PostgreSQL, a one-shot migration job, and the web service. Production may replace PostgreSQL/storage with managed services while keeping the same contracts.

## Prerequisites

- Docker Engine with Compose v2, or Node.js 20.9+ plus PostgreSQL 15+
- TLS-capable reverse proxy/load balancer
- Durable backup targets for PostgreSQL and document storage
- An OpenID Provider client when SSO is enabled

## Environment

Copy `.env.example` to a secret-managed environment file. Never commit `.env`.

Required production values:

- `APP_URL`: canonical HTTPS origin, no path.
- `DATABASE_URL` or Compose `POSTGRES_*`: least-privileged database credentials.
- `SESSION_SECRET`: at least 32 high-entropy characters.
- `BANK_ENCRYPTION_KEY`: base64-encoded 32-byte AES key.
- `BANK_ENCRYPTION_KEY_ID`: stable identifier for that encryption key.
- `STORAGE_ROOT`: mounted durable private directory for the local driver.

Generate secrets:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

## Docker Compose deployment

1. Configure `.env`, including a strong `POSTGRES_PASSWORD`.
2. Build and start. The `migrate` service must succeed before `web` starts:

   ```bash
   docker compose up --build -d
   docker compose ps
   docker compose logs migrate
   ```

3. For a new non-SSO installation only, explicitly seed temporary accounts:

   ```bash
   docker compose run --rm \
     -e SEED_DEFAULT_PASSWORD='replace-with-a-strong-temporary-password' \
     migrate npm run db:seed
   ```

4. Verify probes:

   ```bash
   curl --fail http://127.0.0.1:3000/api/health/live
   curl --fail http://127.0.0.1:3000/api/health/ready
   ```

The Compose port binds to loopback by default. Publish only the reverse proxy, not PostgreSQL or the application port directly.

## OpenID Connect

Register an OIDC confidential web client with this exact redirect URI:

```text
https://invoice.example.com/api/v1/auth/oidc/callback
```

Configure:

```dotenv
AUTH_PROVIDER=oidc
OIDC_ISSUER_URL=https://id.example.com/realms/company
OIDC_CLIENT_ID=invoice-flow
OIDC_CLIENT_SECRET=secret-from-provider
OIDC_REDIRECT_URI=https://invoice.example.com/api/v1/auth/oidc/callback
OIDC_SCOPES=openid profile email
OIDC_DISPLAY_NAME=ورود با حساب سازمانی
OIDC_AUTO_PROVISION=false
```

Use `hybrid` during a controlled migration if local emergency/admin access must remain available. Keep auto-provisioning false when accounts should be approved in advance. If enabled, confirm the provider cryptographically validates email ownership and emits `email_verified=true`; new accounts always start as `USER`.

Test discovery, authorization, callback, account linking, inactive-user denial, logout expectations, clock synchronization, and key rotation in staging before enforcing OIDC.

## Reverse proxy

- Terminate TLS and redirect HTTP to HTTPS.
- Preserve `Host`, `X-Forwarded-Proto`, and a trustworthy client IP chain.
- Do not rewrite `/api/v1/auth/oidc/callback`.
- Permit request bodies larger than `UPLOAD_MAX_FILE_BYTES` plus multipart overhead, but apply an upstream cap.
- Disable shared caching for authenticated pages and downloads.
- Preserve application CSP and security headers.

If the proxy supplies client IP headers, accept them only from trusted proxy addresses. InvoiceFlow hashes the resolved source before audit/throttle storage.

## Managed PostgreSQL / platform deployment

Build the `runner` target, mount writable private storage, then execute migrations as a release job:

```bash
docker build --target migrator -t invoice-flow-migrator .
docker build --target runner -t invoice-flow .
docker run --rm --env-file .env invoice-flow-migrator npm run db:deploy
docker run --read-only --env-file .env \
  -v invoice-documents:/app/storage \
  -p 127.0.0.1:3000:3000 invoice-flow
```

Do not run multiple concurrent migration jobs. Back up before schema releases and use forward migrations rather than editing applied history.

## Upgrade procedure

1. Review release notes and migration SQL.
2. Back up PostgreSQL and document storage as a coordinated recovery point.
3. Build immutable images and scan dependencies/container layers.
4. Run `npm run db:deploy` once.
5. Roll out web instances and wait for readiness.
6. Smoke-test login, invoice read, private attachment download, and one non-financial validation path.
7. Monitor error rate, database connections, storage failures, and audit writes.

Database migrations are generally forward-only. A web rollback is safe only when the previous version remains compatible with the migrated schema.

## Backup and disaster recovery

- Schedule encrypted PostgreSQL dumps/snapshots with tested point-in-time recovery.
- Back up the document volume/bucket with object versioning where possible.
- Store the encryption key in a secrets manager; losing it makes bank details unrecoverable.
- Restore database and documents to the same logical point, then run attachment reconciliation checks.
- Document recovery-time and recovery-point objectives and rehearse them.

## Production checklist

- [ ] All placeholder values replaced; `.env` absent from source control and images
- [ ] HTTPS and secure cookies verified
- [ ] Database and application ports not publicly exposed
- [ ] OIDC flow tested or seed passwords rotated immediately
- [ ] At least two controlled super administrators configured
- [ ] Backup and restore drill completed
- [ ] Storage volume permissions and capacity alerts configured
- [ ] Central logs/alerts include readiness failures and correlation IDs
- [ ] Retention, privacy, and financial record policies approved
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, integration tests, and `npm run build` green
