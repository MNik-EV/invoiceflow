# HTTP API

Base path: `/api/v1`. Responses are JSON unless an attachment/report is downloaded. Authentication uses an opaque HttpOnly cookie; never copy it into browser storage or authorization headers.

## Conventions

- Mutating browser requests must have a same-origin `Origin` header.
- Jalali form dates are `YYYY/MM/DD`; JSON response dates are ISO/Gregorian.
- Toman/BigInt values are decimal strings.
- Multipart endpoints enforce an aggregate request limit and each file is revalidated by magic bytes.
- Unauthorized access to another user's invoice returns `404`.

Error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "اطلاعات درخواست معتبر نیست.",
    "fieldErrors": { "invoiceAmount": ["مبلغ فاکتور معتبر نیست."] },
    "requestId": "correlation-id"
  }
}
```

## Authentication

### `POST /auth/login`

Local login, available when `AUTH_PROVIDER=local|hybrid`. Rate-limited by a hash of normalized username and network source.

```json
{ "username": "davood", "password": "..." }
```

### `GET /auth/oidc/start?next=/dashboard`

Starts OIDC Authorization Code + PKCE. Available when `AUTH_PROVIDER=oidc|hybrid` and all mandatory OIDC variables are configured. `next` accepts safe same-origin relative paths only.

### `GET /auth/oidc/callback`

OIDC redirect URI. Validates transaction state, nonce, PKCE verifier, issuer/client token checks, resolves an external identity, creates a local server session, and redirects to the saved route.

### `POST /auth/logout`

Revokes the current server session, records an audit event, and clears the cookie.

### `GET /auth/session`

Returns the current user identity and role.

## Invoice requests

### `GET /invoice-requests`

Users receive only their own rows; finance/super administrators receive all. Optional filters:

- `category=LUNCH|LAB_PURCHASE`
- `status=PENDING_REVIEW|APPROVED|REJECTED|PAID`

### `POST /invoice-requests`

`multipart/form-data` fields:

| Field                | Lunch                         | Specialist purchase | Notes                                  |
| -------------------- | ----------------------------- | ------------------- | -------------------------------------- |
| `category`           | `LUNCH`                       | `LAB_PURCHASE`      | required                               |
| `invoiceDate`        | required                      | required            | Jalali                                 |
| `title`              | optional                      | required            | max 200                                |
| `vendorName`         | optional                      | optional            | restaurant/supplier                    |
| `purchaseCategory`   | empty                         | required            | IC/MOSFET/MODULE/SENSOR/PCB/TOOL/OTHER |
| `participantIds`     | JSON UUID array, at least one | `[]`                | creator is not inserted automatically  |
| `invoiceAmount`      | required                      | required            | positive toman string                  |
| `description`        | optional                      | optional            | max 2000                               |
| `duplicateConfirmed` | boolean text                  | boolean text        | second-submit override                 |
| `invoice`            | required                      | required            | JPG/PNG/WebP/PDF                       |
| `paymentProof`       | required                      | required            | JPG/PNG/WebP/PDF                       |
| `foodImage`          | optional                      | not used            | image only                             |
| `supportingDocument` | not used                      | optional            | JPG/PNG/WebP/PDF                       |

Returns `409 DUPLICATE_CONFIRMATION_REQUIRED` when a similar non-rejected invoice exists and override is false.

### `POST /invoice-requests/duplicate-check`

Accepts the same non-file fields as JSON and returns candidate IDs/status/confidence. The server repeats this check during create.

### `GET /invoice-requests/:id`

Returns the aggregate: creator, participants, attachment metadata, payment, and status history. File storage keys and bank secrets are not exposed.

### `PATCH /invoice-requests/:id`

Creator-only correction for a `REJECTED` request. Multipart fields match create plus required optimistic `version`. Category cannot change. Optional replacement/new documents may be appended.

### `GET /invoice-requests/:id/attachments/:attachmentId`

Authenticated private download. Verifies request ownership/admin role and storage status, then sends bytes with the detected media type, sanitized attachment filename, `X-Content-Type-Options: nosniff`, and private no-store caching.

## Profile

### `GET /me/bank-account`

Returns the current user's decrypted bank profile only to that user.

### `PUT /me/bank-account`

Validates Iranian card/IBAN checksums, encrypts values before persistence, and audits changed field names without recording values.

```json
{ "cardNumber": "6037997513657099", "iban": "IR062960000000100324200001" }
```

### `PUT /me/password`

Local password change. Verifies the current Argon2id password, requires a new password of at least 12 characters, and revokes all other sessions.

### `GET /users/participants`

Returns active users for the lunch participant selector.

## Finance administration

Requires `FINANCE_ADMIN` or `SUPER_ADMIN`.

### `POST /admin/invoice-requests/:id/approve`

```json
{ "version": 1 }
```

Validates required documents, snapshots the current lunch allowance/participant count where applicable, calculates the approved amount, transitions to `APPROVED`, and audits atomically.

### `POST /admin/invoice-requests/:id/reject`

```json
{ "version": 1, "reason": "تصویر رسید خوانا نیست" }
```

### `POST /admin/invoice-requests/:id/payment`

```json
{
  "version": 2,
  "amount": "1400000",
  "paidOn": "1405/06/03",
  "trackingCode": "123456789"
}
```

Requires complete payee bank data and an amount exactly equal to the approved snapshot. Creates the one-to-one payment and permanently transitions to `PAID`.

### `GET /admin/reports/monthly?year=1405&month=6&category=LUNCH`

Returns monthly rows. Category is optional.

### `GET /admin/reports/monthly/export?year=1405&month=6&format=csv|xlsx&category=LAB_PURCHASE`

Exports UTF-8 BOM CSV or RTL XLSX and records an audit event. Spreadsheet-formula prefixes are neutralized.

## Super administration

Requires `SUPER_ADMIN`.

- `GET|POST /admin/users` — list/create users.
- `PATCH /admin/users/:id` — change profile, role, or active status; role/deactivation revokes sessions.
- `GET /admin/settings` — values and recent revisions.
- `PUT /admin/settings/:key` — allow-listed setting update with optimistic `version`.
- `GET /admin/audit-logs` — paginated/filterable audit events.

The last active super administrator cannot demote or deactivate themselves.

## Health

- `GET /api/health/live` — process liveness; no database dependency.
- `GET /api/health/ready` — database, required settings, and document storage readiness.

Health routes are outside `/api/v1` to remain stable for orchestration probes.
