# AdNexus AI — Phase 4 Build Plan

## Gap Analysis (from roadmap + product completeness)

### From roadmap explicitly mentioned but not built:
1. **Per-client token scoping** — Agency tier mentions "per-client token scoping" — we have agency overview but no client-level API token management
2. **White-label reports** — Agency tier: "white-label reports (basic)" — branded/custom report builder
3. **Full developer portal** — API keys, webhooks, event logs — currently only a small section in Settings
4. **AI credit usage analytics** — Pricing strategy details credit consumption; no UI for this

### Product completeness features:
5. **Campaign Calendar** — Schedule/planning view (every serious ad tool has this)
6. **Performance Goals** — Set and track KPI targets across campaigns
7. **Product Tour** — Guided walkthrough for first-time users (connects to onboarding)
8. **CSV Export Center** — Bulk data export hub with scheduling

## Phase 4 Build: 8 New Pages

### Group A: Developer & Data (API Portal + Export Center + Credit Analytics)
1. **DeveloperPortal** (`src/pages/DeveloperPortal.tsx`) — Full API keys, webhooks, event logs, rate limits, SDK snippets
2. **ExportCenter** (`src/pages/ExportCenter.tsx`) — Bulk CSV/data export with scheduling and history
3. **CreditUsage** (`src/pages/CreditUsage.tsx`) — AI credit consumption analytics and billing breakdown

### Group B: Agency & Goals (Client Scoping + White-Label + Performance Goals)
4. **ClientScopes** (`src/pages/ClientScopes.tsx`) — Per-client API token scoping and permission management
5. **WhiteLabelReports** (`src/pages/WhiteLabelReports.tsx`) — Branded report builder with custom logo/colors
6. **PerformanceGoals** (`src/pages/PerformanceGoals.tsx`) — KPI target setting, tracking, goal progress

### Group C: UX & Planning (Calendar + Product Tour)
7. **CampaignCalendar** (`src/pages/CampaignCalendar.tsx`) — Monthly/weekly campaign planning calendar
8. **ProductTour** (`src/components/ProductTour.tsx`) — Guided walkthrough overlay for new users
