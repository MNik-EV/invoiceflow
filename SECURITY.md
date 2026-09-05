# Security Policy

## Supported versions

Security fixes are applied to the latest commit on `main`. Deployers should track tagged releases once published and keep dependencies current.

## Reporting a vulnerability

Do not open a public issue. Use GitHub's **Report a vulnerability** / private security advisory feature for this repository and include affected version, impact, reproduction steps, and any suggested mitigation. Maintainers should acknowledge a complete report within five business days.

Do not access data you do not own, disrupt a live deployment, or retain downloaded financial documents. Use local seed data for reproduction.

## Deployment responsibility

InvoiceFlow provides application controls, but operators remain responsible for TLS, secret management, identity-provider policy, database/storage access, backups, malware scanning appropriate to their environment, log protection, and compliance with local financial/privacy rules. Review [DEPLOYMENT.md](./DEPLOYMENT.md) before production use.
