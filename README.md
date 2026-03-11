# Dubai Garments Storefront + Admin

Next.js storefront and private admin panel for AI sales automation workflows.

## Environment Setup

```bash
cp .env.example .env.local
```

Fill `.env.local` with your real values.  
`.env.local` is ignored by git.

## Config Mode

Set `CONFIG_MODE=auto` in both storefront and FastAPI env files:

- Development (`NODE_ENV=development`): configuration is read from local env files.
- Production: configuration is read from DB-backed `system_settings` (managed from Admin Configuration page).

## Database Setup

```bash
npm run db:migrate
npm run db:seed
npm run db:seed:users
```

## Run App

```bash
npm run dev
```

Open:

- Storefront: `http://localhost:3000`
- Customer login: `http://localhost:3000/customer/login`
- Admin login: `http://localhost:3000/admin/login`

## Notes

- Admin routes and admin APIs are role-protected by middleware.
- Login credentials are fetched from the `users` table (not env credentials).
- `db:seed:users` creates/updates one admin and one customer user from `BOOTSTRAP_*` vars in `.env.local`.

## Docker

Docker Compose and Docker Desktop setup is documented here:

- [Docker Desktop Setup](/Users/rafi/developer/ai_development/projects/dubai_garments/docs/docker-desktop-setup.md)
- [Architecture Overview](/Users/rafi/developer/ai_development/projects/dubai_garments/docs/architecture-overview.md)
- [n8n Follow-up Automation](/Users/rafi/developer/ai_development/projects/dubai_garments/docs/n8n-followup-automation.md)
- [n8n Scheduler Cron](/Users/rafi/developer/ai_development/projects/dubai_garments/docs/n8n-scheduler-cron.md)
- [n8n SendGrid Inbound Test](/Users/rafi/developer/ai_development/projects/dubai_garments/docs/n8n-sendgrid-inbound-test.md)
