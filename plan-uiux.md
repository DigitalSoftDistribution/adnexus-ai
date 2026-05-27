# AdNexus AI — UI/UX Refinement Plan: Frontend to 100%

## Current State
- 40 pages built with mock data
- Auth pages exist but use placeholder handlers
- No API connection to the backend
- No global state management
- Layout exists but needs polish

## Goal
Fully functional frontend with real API integration, polished UI/UX, proper auth flow, mobile responsiveness, and production-grade interactions.

## Agent Groups (22 Agents)

### Group A: Foundation (3 agents)
A1. **API_Client_Builder** — Robust axios client with interceptors, retry logic, error handling, request/response transforms
A2. **State_Manager_Builder** — Zustand stores: authStore, workspaceStore, campaignStore, draftStore, notificationStore, uiStore
A3. **Toast_System_Builder** — Toast notifications (success/error/warning/info), positioned top-right, auto-dismiss

### Group B: Auth & Navigation (3 agents)
B1. **Auth_Pages_Builder** — Rewrite SignIn, SignUp, ForgotPassword with real auth hooks, form validation, loading states
B2. **Layout_Navigation_Builder** — Fix sidebar (active states, collapsible, mobile drawer), Navbar (user menu, workspace switcher, notification bell), breadcrumbs
B3. **Onboarding_Tour_Builder** — Wire onboarding to API, functional product tour with step highlighting

### Group C: Core App Pages (4 agents)
C1. **Dashboard_Builder** — Real KPI cards with sparklines, Recharts connected to API, platform comparison, campaign status, activity feed, smart alerts banner
C2. **Campaigns_Builder** — Data table with sorting/filtering/pagination, bulk actions, create modal (creates draft), grid view, connect to campaigns API
C3. **Ads_Builder** — Creative grid with real data, fatigue health indicators, detail drawer with insights, comparison tool, connect to ads API
C4. **Reports_Builder** — Report builder with date range picker, cross-platform performance charts, conversion funnel visualization, scheduled reports table

### Group D: AI & Agent (2 agents)
D1. **AI_Agent_Builder** — Rule builder with IF/THEN logic, optimization log with reasoning, pending approvals queue, MCP config, agent performance metrics
D2. **Brief_Studio_Builder** — Morning Brief page (fetch from API), AI Creative Studio, Creative Brief generator

### Group E: Management (3 agents)
E1. **Settings_Builder** — All 7 tabs: connected accounts (OAuth flows), team members (invites/roles), notifications (preferences), billing (Stripe portal), security (2FA), integrations, API keys
E2. **Inbox_Drafts_Audit_Builder** — Inbox with notifications, Drafts page with approve/reject actions, Audit Log timeline
E3. **Agency_Goals_Builder** — Agency dashboard with client list, Performance Goals CRUD, Team management

### Group F: Advanced Pages (3 agents)
F1. **Phase3_Pages_Builder** — A/B Testing, Audience Manager, Budget Pacing, Slack Integration, Campaign Templates, Mobile Approval UI
F2. **Phase4_Pages_Builder** — Developer Portal (5 tabs), Export Center, Credit Usage, Client Token Scoping, White-Label Reports, Campaign Calendar
F3. **Marketing_Pages_Builder** — Blog, BlogPost, ComparePipeboard, CompareMadgicx, ToolExplorer pages polish

### Group G: Polish & Interaction (4 agents)
G1. **Animation_Polish_Builder** — Framer Motion page transitions, section entrance animations, hover effects, loading skeletons
G2. **Command_Palette_Builder** — Functional Cmd+K with search across pages, actions, recent items
G3. **Mobile_Responsive_Builder** — All pages mobile-friendly, responsive breakpoints, touch-friendly targets
G4. **Forms_Validation_Builder** — Consistent form components, validation patterns, error messages, loading states
