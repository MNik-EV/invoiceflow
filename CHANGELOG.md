# Changelog

All notable changes to InvoiceFlow will be documented here. The project follows semantic versioning once public releases are tagged.

## [Unreleased]

### Added

- Public, organization-neutral InvoiceFlow identity and orange light/dark theme.
- Separate lunch and specialist electronics/laboratory invoice workflows.
- OpenID Connect Authorization Code + PKCE login with local/oidc/hybrid modes.
- Simplified employee dashboard, invoice intake, personal history, and private attachments.
- Finance review/payment dashboard, category/status filters, reports, settings, user admin, and audit views.
- PostgreSQL migration preserving records from the original lunch-only schema.
- English and Persian project documentation, GitHub CI, templates, security policy, and MIT license.

### Security

- Encrypted OIDC transaction cookie with state and nonce validation.
- Server-side ownership/RBAC checks, secure sessions, upload magic-byte checks, CSP, and immutable paid records.
