# Database Guide

InvoiceFlow uses PostgreSQL with Prisma. All migrations are committed SQL and run in order; production uses `prisma migrate deploy`, never `db push`.

## Conventions

- Primary keys are UUIDs.
- Technical instants are `TIMESTAMPTZ(3)` in UTC.
- Business dates (`invoice_date`, `paid_on`) are PostgreSQL `DATE` values.
- The UI converts Jalali input/display at the boundary; the database remains Gregorian.
- Money is integer toman in `BIGINT`; APIs serialize it as a decimal string.
- Table and column names are snake_case through Prisma mappings.
- Financial rows use `RESTRICT`; session and participant dependents use intentional cascades.

## Core tables

| Table                    | Purpose                                        | Important constraints/indexes                                                                      |
| ------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `users`                  | Local/OIDC users, role, encrypted bank profile | unique normalized username/email; role + active index                                              |
| `sessions`               | Revocable opaque sessions                      | unique token hash; expiry/revocation indexes; provider snapshot                                    |
| `external_identities`    | OIDC subject links                             | unique `(provider, subject)`                                                                       |
| `invoice_requests`       | Lunch and specialist invoice aggregate         | positive amounts/version; category fields; approval snapshot; creator/category/status date indexes |
| `invoice_participants`   | Lunch participants                             | unique `(request_id, user_id)`                                                                     |
| `attachments`            | Private storage metadata                       | unique storage key; positive bytes; request/type/status and SHA-256 indexes                        |
| `payments`               | One recorded reimbursement per request         | unique request; nonempty tracking code; payment date index                                         |
| `system_settings`        | Typed mutable business settings                | unique key and optimistic version                                                                  |
| `setting_revisions`      | Append-only setting history                    | setting + date index                                                                               |
| `request_status_history` | Append-only state transitions                  | request/actor + date indexes                                                                       |
| `audit_logs`             | Security and financial audit trail             | entity/user/action + date indexes                                                                  |
| `auth_throttles`         | Persistent login throttling                    | unique hashed key; cleanup index                                                                   |

## Invoice discriminator

`invoice_requests.category` is one of:

- `LUNCH`: `purchase_category` must be null; participants are validated by the service.
- `LAB_PURCHASE`: `title` and `purchase_category` are required; purchase category is `IC`, `MOSFET`, `MODULE`, `SENSOR`, `PCB`, `TOOL`, or `OTHER`.

For approved/paid lunch rows, `calculated_amount`, `allowance_per_participant`, and `approved_participant_count` are mandatory snapshots. Specialist purchases require `calculated_amount` while lunch-only snapshots remain null.

## Settings

| Key                        | Value representation         | Default       |
| -------------------------- | ---------------------------- | ------------- |
| `lunch.allowance_toman`    | positive integer JSON string | `350000`      |
| `invoice.max_amount_toman` | positive integer JSON string | `10000000000` |

Settings are validated by a code allow-list. Every update increments `version`, creates `setting_revisions`, and writes an audit record.

## Migrations

Generate a migration during development:

```bash
npm run db:migrate -- --name descriptive_change
```

Validate and apply committed migrations:

```bash
npm run db:validate
npm run db:deploy
```

The second migration safely converts installations from the original lunch-only schema: roles and status enums are migrated, tables/columns/indexes are renamed, existing requests become `LUNCH`, the generic category fields are added, and approval checks are rebuilt without losing records.

Never edit a migration already applied to a shared environment. Add a forward migration. The committed historical migration is retained so existing installations remain upgradeable.

## Seed

Seed is explicit and idempotent:

```bash
SEED_DEFAULT_PASSWORD='temporary-strong-password' npm run db:seed
```

It creates one super administrator, one finance administrator, four employee examples, and the default settings. Production teams may skip the sample seed and provision the first administrator through a controlled bootstrap process.

## Backup and restore

Database and document storage form one logical recovery set. Quiesce writes or take coordinated snapshots.

```bash
pg_dump --format=custom --no-owner --file=invoice-flow.dump "$DATABASE_URL"
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" invoice-flow.dump
```

Also archive the configured `STORAGE_ROOT`/object bucket with versioning. Test that restored attachment metadata resolves to restored objects. Encrypt backups, restrict access, and define retention based on local financial-record requirements.

## Maintenance

- Periodically revoke/delete expired sessions and stale throttle rows according to policy.
- Monitor table/index growth, connection saturation, failed migrations, and storage metadata/object drift.
- Do not update paid requests or append-only histories directly.
- Rotate the bank encryption key through a reviewed migration/re-encryption job; `encryption_key_id` identifies the key used per user.
