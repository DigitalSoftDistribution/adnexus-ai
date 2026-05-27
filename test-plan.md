# AdNexus AI — Browser QA Test Plan

## Test Groups
- **Group A**: Marketing pages (Home, Blog, Compare, Tools) — 6 pages
- **Group B**: Auth & Onboarding (SignIn, SignUp, Forgot, Onboarding) — 4 pages  
- **Group C**: Core App (Dashboard, Campaigns, Ads, AI Agent, Reports, Drafts, Inbox, Audit) — 8 pages
- **Group D**: Power Features (A/B, Audiences, Pacing, Goals, Calendar, Templates, Creative) — 8 pages
- **Group E**: Settings, Agency, Integrations (Settings, Agency, Scopes, Slack, DevPortal, Export, Credits, Brief) — 8 pages
- **Group F**: Global Components (Navbar, Chat Overlay, Command Palette, Product Tour, Footer) — interactive testing

## For Each Page
1. Visit URL, screenshot full page
2. Check: No visual glitches, layout issues, broken elements
3. Check: Colors match dark theme, fonts correct
4. Check: Interactive elements visible and clickable
5. Check: Mock data renders realistically
6. Note any issues

## Acceptance Criteria
- All pages load without errors
- Dark theme consistent across all pages
- All interactive elements visible
- No layout breaks on desktop (1440x900)
- Navigation between pages works
