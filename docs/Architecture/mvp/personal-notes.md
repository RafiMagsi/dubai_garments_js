# KEY NOTES
1. implement design first
2. then we implement the MVP setep by step
3. [DONE] Seamless deployment: Health check loop added to deploy.yml.
4. [FIX] Visual Goldens: Implement a `global-setup.ts` for Playwright to save auth state so tests can run behind the login.
5. remember we changed the cards from full row height to compact, we did 1 mistake actually i was meant to align the content of these cards to top but keep the cards height same, so do it,
6. [NEW] Create `setup.sh` for easy marketplace installation.

# Dev (hot reload):
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Prod (existing behavior):
docker compose up -d --build

# New Features/Integration
People can add custom projects for their integration
Public exposed API that can give products for website integration with API token
Lead for should have required fields as minimum to receive it as lead, so the admin panel will be useful.
Make a tap for "AI Sales Copilot" or adjust it in a tab
LIFECYCLE - From Lead to Close starting from lead details page


# ENVATO READINESS CHECKLIST
- [ ] **Single-Tenant Installer:** Verify `scripts/setup.sh` works on clean Ubuntu/macOS.
- [ ] **Settings GUI:** (Priority) Ensure AI prompts and models can be changed in `/admin/settings` without touching `.env`.
- [ ] **Branding:** Allow buyer to upload their logo via the Admin panel.
- [ ] **Documentation:** Create a `README.md` that explains how to connect OpenAI and SendGrid in 2 minutes.
- [ ] **API Token UI:** Allow users to generate tokens for the "Public exposed API" from the dashboard.
- [x] **Downtime Fix:** Implemented health check loop in CI/CD.