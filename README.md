# AdNexus AI

> **The AI-Powered Advertising Platform** — Manage multi-channel campaigns, leverage AI agents for optimization, and gain real-time analytics across all major ad platforms from a single unified dashboard.

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v3-06B6D4?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Express.js-4.x-000000?logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License" />
</p>

<p align="center">
  <img src="https://img.shields.io/github/actions/workflow/status/your-org/adnexus-ai/ci.yml?branch=main&label=build" alt="Build Status" />
  <img src="https://img.shields.io/badge/tests-25%2B-blue?logo=jest" alt="Tests" />
  <img src="https://img.shields.io/badge/coverage-65%25-yellow?logo=codecov" alt="Coverage" />
  <img src="https://img.shields.io/badge/pages-50%2B-blueviolet" alt="Pages" />
  <img src="https://img.shields.io/badge/components-75%2B-ff69b4" alt="Components" />
  <img src="https://img.shields.io/badge/PWA-ready-5a0fc8?logo=pwa" alt="PWA" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/platform-Web%20%7C%20PWA%20%7C%20Mobile%20Responsive-informational" alt="Platforms" />
  <img src="https://img.shields.io/badge/WCAG%202.1-AA-green" alt="Accessibility" />
  <img src="https://img.shields.io/badge/Lighthouse-85%2B-orange?logo=lighthouse" alt="Lighthouse" />
</p>

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/adnexus-ai.git
cd adnexus-ai

# 2. Start with Docker (recommended)
docker-compose up --build

# 3. Or start manually:
# Frontend
cd app && npm install && npm run dev
# Backend
cd adnexus-backend/api && npm install && npm run dev

# 4. Open http://localhost:5173
```

| Environment | URL | Purpose |
|-------------|-----|---------|
| Frontend App | http://localhost:5173 | React development server |
| Backend API | http://localhost:3001/api | Express REST API |
| API Docs | http://localhost:3001/api/docs | Interactive documentation |
| Supabase | http://localhost:54321 | Local database & auth |
| Redis | redis://localhost:6379 | Cache & job queue |

**Prerequisites:** Node.js >= 18, npm >= 9, Docker (optional)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Screenshots](#screenshots)
3. [Tech Stack](#tech-stack)
4. [Getting Started](#getting-started)
5. [Project Structure](#project-structure)
6. [Key Features](#key-features)
7. [Architecture](#architecture)
8. [Deployment](#deployment)
9. [Development Guide](#development-guide)
10. [Contributing](#contributing)
11. [Code of Conduct](#code-of-conduct)
12. [Security](#security)
13. [Changelog](#changelog)
14. [License](#license)

---

## Project Overview

AdNexus AI is a full-stack advertising management platform that unifies campaign creation, AI-driven optimization, real-time analytics, and multi-platform integration into a single powerful interface. Built for modern marketing teams, it connects directly to **Google Ads**, **Meta (Facebook) Ads**, **TikTok Ads**, and **LinkedIn Ads** APIs, while providing intelligent AI agents to automate bidding strategies, budget allocation, and performance recommendations.

### What Makes AdNexus AI Different

- **Unified Multi-Platform Control** — Connect and manage campaigns across Google, Meta, TikTok, and LinkedIn from one dashboard
- **AI Agent for Smart Optimization** — Conversational AI that analyzes performance data and suggests actionable improvements
- **Real-Time Performance Analytics** — Live campaign metrics with interactive charts and customizable reports
- **40+ Feature-Rich Pages** — Comprehensive coverage of every advertising workflow from creation to reporting
- **Modern Tech Stack** — Built with React 18, TypeScript, Tailwind CSS, and Framer Motion for a premium experience

### Key Capabilities

| Capability | Description |
|------------|-------------|
| Campaign Management | Create, edit, pause, and monitor campaigns across all platforms |
| AI Optimization Agent | Conversational AI for performance analysis and automated suggestions |
| Real-Time Analytics | Interactive charts, trend analysis, and custom report building |
| Multi-Account Support | Connect unlimited ad accounts across all supported platforms |
| Budget & Bidding AI | Smart budget allocation and automated bid adjustments |
| Audience Targeting | Advanced audience builder with demographic and interest targeting |
| Creative Asset Library | Store, organize, and A/B test ad creatives |
| Team Collaboration | Role-based access control and shared workspaces |
| Webhook & API | Full REST API and webhook support for integrations |
| White-Label Ready | Custom branding and domain support for agencies |

---

## Screenshots

AdNexus AI features **40+ fully designed pages** covering every aspect of modern advertising management:

### Core Dashboard
| Page | Description |
|------|-------------|
| **Dashboard Overview** | Real-time KPIs, spend trends, campaign status, and performance summaries |
| **Campaigns List** | Sortable, filterable table of all campaigns with status badges |
| **Campaign Detail** | Deep-dive into a single campaign with charts, ads, and settings |
| **Campaign Creation Wizard** | Step-by-step campaign builder with platform-specific options |
| **Ad Groups Management** | Organize and manage ad groups within campaigns |
| **Ads Library** | Grid view of all ad creatives with performance overlays |

### AI Agent
| Page | Description |
|------|-------------|
| **AI Chat Interface** | Conversational interface for asking performance questions |
| **AI Suggestions Panel** | Auto-generated optimization recommendations |
| **AI-Assisted Budget Planner** | Smart budget allocation based on historical performance |
| **AI Bid Optimizer** | Automated bid adjustment suggestions with one-click apply |

### Analytics & Reporting
| Page | Description |
|------|-------------|
| **Performance Analytics** | Interactive charts (line, bar, area) with date range selection |
| **Custom Report Builder** | Drag-and-drop report creation with 50+ metrics |
| **Scheduled Reports** | Automated email reports with PDF/CSV export |
| **Attribution Dashboard** | Multi-touch attribution modeling |
| **Audience Insights** | Demographic breakdowns and interest analysis |

### Platform Integrations
| Page | Description |
|------|-------------|
| **Google Ads Integration** | OAuth connection, account selection, sync status |
| **Meta Ads Integration** | Facebook/Instagram campaign management |
| **TikTok Ads Integration** | TikTok For Business account connection |
| **LinkedIn Ads Integration** | LinkedIn Campaign Manager integration |
| **API Keys Management** | Generate and manage API keys for custom integrations |

### Account & Team
| Page | Description |
|------|-------------|
| **Account Settings** | Profile, billing, notification preferences |
| **Team Management** | Invite members, assign roles, set permissions |
| **Connected Accounts** | View and manage all linked ad accounts |
| **Billing & Usage** | Track spend, invoices, and plan limits |
| **Activity Log** | Audit trail of all actions across the platform |

> **For a complete visual walkthrough of all 40+ pages, see the [screenshots gallery](#) in our documentation.**

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI framework with concurrent features |
| **TypeScript** | 5.0+ | Type-safe development |
| **Tailwind CSS** | 3.x | Utility-first styling |
| **Framer Motion** | 10.x | Declarative animations and transitions |
| **Recharts** | 2.x | Interactive data visualization |
| **Zustand** | 4.x | Lightweight state management |
| **React Query** | 4.x | Server-state synchronization |
| **React Router** | 6.x | Client-side routing |
| **Axios** | 1.x | HTTP client for API communication |
| **date-fns** | 2.x | Date formatting and manipulation |
| **Lucide React** | 0.x | Icon library |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Express.js** | 4.x | REST API server |
| **TypeScript** | 5.0+ | Type-safe API development |
| **Supabase (PostgreSQL)** | — | Primary database with real-time subscriptions |
| **Supabase Auth** | — | Authentication and authorization |
| **MCP (Model Context Protocol)** | — | AI agent context and tool orchestration |
| **Google Ads API** | v14 | Google Ads platform integration |
| **Meta Marketing API** | v18 | Facebook/Instagram Ads integration |
| **TikTok Ads API** | v1.3 | TikTok For Business integration |
| **LinkedIn Ads API** | v2024 | LinkedIn Campaign Manager integration |
| **BullMQ** | 4.x | Background job processing |
| **Redis** | 7.x | Caching and job queue storage |

### Infrastructure & Tools

| Technology | Purpose |
|------------|---------|
| **Vite** | Fast development builds and HMR |
| **ESLint + Prettier** | Code linting and formatting |
| **Husky** | Git hooks for pre-commit checks |
| **Vitest** | Unit testing framework |
| **Playwright** | End-to-end testing |
| **Docker** | Containerization for deployment |
| **GitHub Actions** | CI/CD pipeline |

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0 (LTS recommended)
- **npm** >= 9.0.0 or **Yarn** >= 1.22.0
- **PostgreSQL** >= 14 (or use Supabase cloud)
- **Redis** >= 7 (for job queues)
- **Git**

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/your-org/adnexus-ai.git
cd adnexus-ai
```

#### 2. Install Dependencies

```bash
# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

#### 3. Environment Setup

Create environment configuration files:

**Frontend** — `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Backend** — `backend/.env`:
```env
PORT=3001
NODE_ENV=development
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Platform API Credentials
GOOGLE_ADS_DEVELOPER_TOKEN=your_dev_token
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
TIKTOK_APP_ID=your_app_id
TIKTOK_SECRET=your_secret
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret

# AI / MCP
MCP_API_KEY=your_mcp_api_key
OPENAI_API_KEY=your_openai_key

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379
```

#### 4. Database Setup

```bash
# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

#### 5. Start Development Servers

```bash
# Start frontend (port 5173)
cd frontend && npm run dev

# Start backend (port 3001) — in a new terminal
cd backend && npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **API Documentation**: http://localhost:3001/api/docs

#### 6. Verify Installation

```bash
# Run test suites
npm run test        # Unit tests
npm run test:e2e    # E2E tests
```

---

## Project Structure

### Frontend (`/frontend`)

```
frontend/
├── public/                     # Static assets
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # Base UI (buttons, inputs, modals)
│   │   ├── layout/             # Layout components (sidebar, header)
│   │   ├── charts/             # Recharts wrappers
│   │   └── forms/              # Form components
│   ├── pages/                  # Route-level page components
│   │   ├── Dashboard/
│   │   ├── Campaigns/
│   │   ├── Analytics/
│   │   ├── AIAgent/
│   │   ├── Integrations/
│   │   ├── Settings/
│   │   └── ...
│   ├── hooks/                  # Custom React hooks
│   ├── stores/                 # Zustand state stores
│   ├── lib/                    # Utilities and helpers
│   ├── services/               # API service functions
│   ├── types/                  # TypeScript type definitions
│   ├── constants/              # App constants and config
│   └── styles/                 # Global styles and Tailwind config
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

### Backend (`/backend`)

```
backend/
├── src/
│   ├── api/                    # API route handlers
│   │   ├── campaigns/
│   │   ├── ads/
│   │   ├── analytics/
│   │   ├── ai-agent/
│   │   ├── integrations/
│   │   ├── auth/
│   │   └── webhooks/
│   ├── services/               # Business logic services
│   │   ├── google-ads/
│   │   ├── meta-ads/
│   │   ├── tiktok-ads/
│   │   ├── linkedin-ads/
│   │   ├── ai-optimizer/
│   │   └── reporting/
│   ├── models/                 # Data models and types
│   ├── db/                     # Database queries and migrations
│   ├── jobs/                   # BullMQ background job handlers
│   ├── middleware/             # Express middleware
│   ├── utils/                  # Utility functions
│   └── config/                 # Configuration management
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker-compose.yml
└── package.json
```

---

## Key Features

### Campaign Management (10 Features)

| # | Feature | Description |
|---|---------|-------------|
| 1 | Campaign Creation Wizard | Step-by-step wizard with platform-specific fields |
| 2 | Bulk Campaign Editor | Edit multiple campaigns simultaneously |
| 3 | Campaign Scheduling | Schedule campaigns to start/stop at specific times |
| 4 | Campaign Duplication | Clone campaigns with settings and ads |
| 5 | Campaign Templates | Save and reuse campaign configurations |
| 6 | A/B Testing Framework | Built-in split testing for ads and audiences |
| 7 | Campaign Status Dashboard | Visual status indicators and alerts |
| 8 | Budget Pacing | Real-time budget spend tracking and pacing alerts |
| 9 | Campaign Notes | Add team notes and annotations to campaigns |
| 10 | Campaign Archiving | Archive completed campaigns with full history |

### AI Agent & Optimization (8 Features)

| # | Feature | Description |
|---|---------|-------------|
| 11 | Conversational AI Chat | Natural language interface for campaign queries |
| 12 | Smart Bid Suggestions | AI-generated bid adjustments with confidence scores |
| 13 | Budget Reallocation AI | Automatic budget shifts based on performance |
| 14 | Performance Anomaly Detection | Alerts for unusual metric changes |
| 15 | AI-Generated Recommendations | Actionable optimization suggestions |
| 16 | Predictive Analytics | Forecast campaign performance trends |
| 17 | AI Ad Copy Suggestions | Generate ad copy variations with AI |
| 18 | Automated Rules Engine | Set triggers for automated campaign actions |

### Analytics & Reporting (8 Features)

| # | Feature | Description |
|---|---------|-------------|
| 19 | Real-Time Dashboard | Live KPIs with auto-refreshing widgets |
| 20 | Custom Report Builder | Drag-and-drop report with 50+ metrics |
| 21 | Interactive Charts | Line, bar, area, pie, and funnel charts |
| 22 | Date Range Comparison | Compare performance across custom periods |
| 23 | Scheduled Reports | Automated PDF/CSV report delivery |
| 24 | Attribution Modeling | First-click, last-click, and linear attribution |
| 25 | Funnel Analysis | Visual conversion funnel breakdowns |
| 26 | Export & Sharing | Export reports, share via link or email |

### Platform Integrations (6 Features)

| # | Feature | Description |
|---|---------|-------------|
| 27 | Google Ads OAuth | Secure OAuth 2.0 connection flow |
| 28 | Meta Ads Integration | Facebook & Instagram campaign sync |
| 29 | TikTok Ads Integration | TikTok For Business campaign sync |
| 30 | LinkedIn Ads Integration | LinkedIn Campaign Manager sync |
| 31 | API Key Management | Generate and manage API access keys |
| 32 | Webhook Endpoints | Receive real-time platform event notifications |

### Team & Account Management (5 Features)

| # | Feature | Description |
|---|---------|-------------|
| 33 | Role-Based Access Control | Admin, Editor, Viewer, and custom roles |
| 34 | Team Invitation System | Invite members via email with role assignment |
| 35 | Activity Audit Log | Track every action across the platform |
| 36 | Billing & Usage Tracking | Monitor spend against plan limits |
| 37 | White-Label Branding | Custom logos, colors, and domains |

### UI/UX & Platform (5 Features)

| # | Feature | Description |
|---|---------|-------------|
| 38 | Dark Mode | Full dark theme support across all pages |
| 39 | Keyboard Shortcuts | Power-user keyboard navigation |
| 40 | Customizable Dashboard | Drag-and-drop widget arrangement |
| 41 | Notification Center | In-app alerts for campaigns, AI suggestions, and team activity |
| 42 | Mobile Responsive | Fully responsive design for tablet and mobile |

---

## Architecture

### System Architecture Diagram

```
                               AdNexus AI Platform
                    (v0.1.0 - AI-Powered Advertising Management)
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                      CLIENT LAYER                                │       │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │       │
│   │  │  Web App     │  │  PWA         │  │  Mobile Responsive   │  │       │
│   │  │  (React 18)  │  │  (Install)   │  │  (Tablet/Phone)      │  │       │
│   │  │              │  │              │  │                      │  │       │
│   │  │ 50+ Pages    │  │ Offline Cache│  │ Touch-optimized      │  │       │
│   │  │ 75+ Components│ │ Push Notifs  │  │ Viewport adaptive    │  │       │
│   │  │ Dark Mode    │  │ Background   │  │ Gesture support      │  │       │
│   │  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │       │
│   └─────────┼──────────────────┼─────────────────────┼──────────────┘       │
│             │                  │                     │                       │
│             │    REST API      │   WebSocket/SSE     │                       │
│             ▼                  ▼                     ▼                       │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                      API GATEWAY                                 │       │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │       │
│   │  │  NGINX       │  │  Rate Limit  │  │  Auth Middleware     │  │       │
│   │  │  Reverse     │  │  (Redis)     │  │  JWT + RBAC          │  │       │
│   │  │  Proxy       │  │  Throttling  │  │  Session Mgmt        │  │       │
│   │  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │       │
│   └─────────┼──────────────────┼─────────────────────┼──────────────┘       │
│             │                  │                     │                       │
│             ▼                  ▼                     ▼                       │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                      APPLICATION LAYER                           │       │
│   │                     (Express.js + TypeScript)                    │       │
│   │                                                                  │       │
│   │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │       │
│   │  │  Auth      │ │ Campaign   │ │  AI Agent  │ │  Billing     │  │       │
│   │  │  Service   │ │  Service   │ │  Service   │ │  (Stripe)    │  │       │
│   │  │            │ │            │ │            │ │              │  │       │
│   │  │ • OAuth    │ │ • CRUD     │ │ • Chat     │ │ • Subs       │  │       │
│   │  │ • MFA      │ │ • Wizard   │ │ • Predict  │ │ • Invoices   │  │       │
│   │  │ • RBAC     │ │ • A/B Test │ │ • Anomaly  │ │ • Usage      │  │       │
│   │  └──────┬─────┘ └──────┬─────┘ └──────┬─────┘ └──────┬───────┘  │       │
│   │         │              │              │              │           │       │
│   │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │       │
│   │  │  Export    │ │  Draft     │ │  Report    │ │  Search      │  │       │
│   │  │  Service   │ │  Engine    │ │  Service   │ │  Service     │  │       │
│   │  │            │ │            │ │            │ │              │  │       │
│   │  │ • CSV/PDF  │ │ • Approval │ │ • Builder  │ │ • Full-text  │  │       │
│   │  │ • Excel    │ │ • Rollback │ │ • Schedule │ │ • Filters    │  │       │
│   │  └──────┬─────┘ └──────┬─────┘ └──────┬─────┘ └──────┬───────┘  │       │
│   └─────────┼──────────────┼──────────────┼──────────────┼──────────┘       │
│             │              │              │              │                   │
│             ▼              ▼              ▼              ▼                   │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                      DATA LAYER                                  │       │
│   │                                                                  │       │
│   │  ┌─────────────────────────────────────────────────────────┐     │       │
│   │  │              Supabase (PostgreSQL)                       │     │       │
│   │  │  • Users/Auth  • Campaigns  • Ads  • Analytics          │     │       │
│   │  │  • Teams/Roles • Audit Logs • Templates • Settings      │     │       │
│   │  │  • Reports     • Webhooks   • Comments  • Notifications │     │       │
│   │  └─────────────────────────────────────────────────────────┘     │       │
│   │                                                                  │       │
│   │  ┌─────────────────────┐  ┌─────────────────────────────┐       │       │
│   │  │  Redis Cache        │  │  BullMQ Job Queue           │       │       │
│   │  │  • Session Store    │  │  • Campaign Sync            │       │       │
│   │  │  • API Responses    │  │  • AI Processing            │       │       │
│   │  │  • Rate Limiting    │  │  • Report Generation        │       │       │
│   │  │  • Real-time PubSub │  │  • Email Delivery           │       │       │
│   │  │  • Leaderboard      │  │  • Morning Brief            │       │       │
│   │  └─────────────────────┘  └─────────────────────────────┘       │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                   EXTERNAL INTEGRATIONS                          │       │
│   │                                                                  │       │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐  │       │
│   │  │ Google   │ │ Meta     │ │ TikTok   │ │ LinkedIn │ │ Slack │  │       │
│   │  │ Ads API  │ │ Ads API  │ │ Ads API  │ │ Ads API  │ │ Web-  │  │       │
│   │  │ (OAuth2) │ │ (OAuth2) │ │ (OAuth2) │ │ (OAuth2) │ │ hooks │  │       │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────┘  │       │
│   │                                                                  │       │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────────┐  │       │
│   │  │ Stripe   │ │ OpenAI   │ │ SendGrid │ │ MCP Server          │  │       │
│   │  │ Billing  │ │ GPT-4o   │ │ Email    │ │ (Python/Tool        │  │       │
│   │  │ API      │ │ API      │ │ Service  │ │  Orchestration)     │  │       │
│   │  └──────────┘ └──────────┘ └──────────┘ └─────────────────────┘  │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                   INFRASTRUCTURE & OPS                           │       │
│   │                                                                  │       │
│   │  GitHub Actions CI/CD  │  Docker Compose  │  Grafana + Alerts   │       │
│   │  • Test → Staging → Production                                   │       │
│   │  • Lint + Type Check + Security Scan                             │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Action** — User interacts with the React frontend
2. **API Request** — Frontend sends authenticated request to Express backend
3. **Business Logic** — Backend processes request, applies business rules
4. **Data Layer** — Reads/writes to Supabase PostgreSQL database
5. **Platform Sync** — Background jobs sync data with ad platform APIs via BullMQ
6. **AI Processing** — MCP-integrated AI agent analyzes data and generates suggestions
7. **Real-Time Updates** — WebSocket/SSE pushes updates to frontend

### Authentication Flow

```
User → Supabase Auth (OAuth/Email) → JWT Token → API Authorization → Resource Access
```

---

## Deployment

For detailed deployment instructions including:

- Docker containerization
- Environment-specific configuration
- Database migration strategies
- CI/CD pipeline setup
- Cloud platform deployment (AWS, GCP, Vercel, Railway)
- SSL certificate configuration
- Monitoring and logging setup

**See [DEPLOY.md](DEPLOY.md)**

### Quick Deploy with Docker

```bash
# Build and start all services
docker-compose up --build

# The application will be available at http://localhost:3000
```

---

## Development Guide

### Adding a New Feature

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Add backend API endpoint**:
   - Create route handler in `backend/src/api/`
   - Add business logic in `backend/src/services/`
   - Add TypeScript types in `backend/src/models/`
   - Write tests in `backend/tests/`

3. **Add frontend page/component**:
   - Create page component in `frontend/src/pages/`
   - Add route in `frontend/src/App.tsx`
   - Add API service function in `frontend/src/services/`
   - Add Zustand store if state management needed

4. **Add animations**:
   - Use Framer Motion for page transitions in `frontend/src/components/layout/`
   - Add micro-interactions to components
   - Follow the animation conventions in `frontend/src/lib/animations.ts`

5. **Run tests and lint**:
   ```bash
   npm run lint
   npm run test
   npm run build
   ```

6. **Submit a pull request** with a clear description

### Adding a New API Endpoint

```typescript
// backend/src/api/campaigns/routes.ts
import { Router } from 'express';
import { CampaignController } from './controller';

const router = Router();
const controller = new CampaignController();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.patch('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
```

### Adding a New Page

```typescript
// frontend/src/pages/NewFeature/NewFeaturePage.tsx
import { motion } from 'framer-motion';
import { pageTransition } from '@/lib/animations';

export function NewFeaturePage() {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
    >
      {/* Page content */}
    </motion.div>
  );
}
```

### Code Conventions

- **Components**: PascalCase, single responsibility
- **Hooks**: camelCase, prefixed with `use`
- **Services**: camelCase, async functions for API calls
- **Stores**: camelCase, Zustand stores in `stores/` directory
- **Types**: PascalCase, exported from `types/` directory

---

## Contributing

We welcome contributions from the community! Whether you're fixing a bug, adding a feature, or improving documentation, your help is appreciated.

### How to Contribute

1. **Fork the repository** on GitHub and clone your fork
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Install dependencies** and ensure the project builds:
   ```bash
   cd app && npm install && npm run build
   cd ../adnexus-backend/api && npm install && npm run build
   ```
4. **Make your changes** following our [code conventions](#code-conventions)
5. **Write or update tests** for new functionality:
   ```bash
   npm run test        # Unit tests
   npm run test:integration  # Integration tests
   npm run test:e2e    # End-to-end tests
   ```
6. **Ensure all checks pass**:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   npm run test
   ```
7. **Commit with clear messages** following [Conventional Commits](https://conventionalcommits.org/):
   ```bash
   git commit -m "feat: add campaign scheduling feature"
   git commit -m "fix: resolve dashboard chart rendering issue"
   git commit -m "docs: update API endpoint documentation"
   git commit -m "test: add unit tests for auth middleware"
   ```
8. **Push to your fork** and submit a Pull Request with a clear description

### Pull Request Guidelines

- Provide a clear description of the changes and motivation
- Reference any related issues (e.g., `Fixes #123`)
- Include screenshots or screen recordings for UI changes
- Ensure all CI checks pass (build, test, lint)
- Request review from at least one maintainer
- Keep PRs focused; split large changes into smaller PRs

### Reporting Issues

When reporting bugs, please use the issue template and include:

| Field | Description |
|-------|-------------|
| **Steps to reproduce** | Numbered steps to recreate the bug |
| **Expected behavior** | What you expected to happen |
| **Actual behavior** | What actually happened |
| **Environment** | OS, browser version, Node.js version |
| **Screenshots** | Visual evidence if applicable |
| **Console errors** | Any errors in browser/dev console |

### Feature Requests

For feature requests, please:
1. Check existing issues to avoid duplicates
2. Describe the use case and expected behavior
3. Explain why this feature would be valuable
4. Consider contributing the feature yourself

### Code Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Components** | PascalCase, single responsibility | `CampaignCard.tsx` |
| **Hooks** | camelCase, `use` prefix | `useCampaignData.ts` |
| **Services** | camelCase, async functions | `fetchCampaigns()` |
| **Stores** | camelCase, Zustand pattern | `campaignStore.ts` |
| **Types** | PascalCase, exported | `CampaignStatus` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| **Files** | kebab-case for configs | `vite.config.ts` |

### Development Discussion

| Channel | Purpose |
|---------|---------|
| **GitHub Issues** | Bug reports and feature requests |
| **GitHub Discussions** | General questions, ideas, and Q&A |
| **Discord** | Real-time community chat (link coming soon) |

---

## Code of Conduct

This project adheres to the following principles:

- **Be respectful** — Treat everyone with respect. Healthy debate is encouraged, but harassment is not tolerated.
- **Be constructive** — Provide helpful feedback and focus on what's best for the community.
- **Be inclusive** — Welcome newcomers and help them get started.
- **Be professional** — Communicate clearly and stay on topic.

By participating, you are expected to uphold this code. Unacceptable behavior may result in a temporary or permanent ban.

---

## Security

If you discover a security vulnerability, please follow our responsible disclosure process:

1. **DO NOT** open a public issue
2. Email **security@adnexus.ai** with details
3. Include steps to reproduce and potential impact
4. Allow up to 48 hours for initial response
5. We will coordinate a fix and public disclosure timeline

### Security Features

- JWT-based authentication with refresh token rotation
- Row Level Security (RLS) on all database tables
- Rate limiting on all API endpoints
- Input validation and sanitization on all inputs
- SQL injection protection via parameterized queries
- CORS configuration with allowlist
- Encrypted storage of API credentials
- Security headers (HSTS, CSP, X-Frame-Options)
- Automated dependency vulnerability scanning

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes, features, and releases.

| Version | Date | Highlights |
|---------|------|-----------|
| 0.1.0 | 2025-05-21 | Initial release — 50+ pages, AI agent, multi-platform integrations |

---

## License

```
MIT License

Copyright (c) 2024 AdNexus AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Support

For support, please contact:

- **Email**: support@adnexus.ai
- **Documentation**: https://docs.adnexus.ai
- **Status Page**: https://status.adnexus.ai

---

<p align="center">
  Built with care by the AdNexus AI team and contributors.
</p>
