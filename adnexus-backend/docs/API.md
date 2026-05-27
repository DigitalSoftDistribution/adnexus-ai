# AdNexus AI — API Reference

Complete reference for all REST API endpoints. Base URL: `http://localhost:3001/api/v1` (local) or your deployed domain.

---

## Table of Contents

- [Authentication](#authentication)
- [Campaigns](#campaigns)
- [Drafts](#drafts)
- [Agent & Automation](#agent--automation)
- [Reports](#reports)
- [Billing & Credits](#billing--credits)
- [Goals](#goals)
- [Audiences](#audiences)
- [Settings](#settings)
- [Error Reference](#error-reference)
- [Draft-First Workflow](#draft-first-workflow)
- [Credit System](#credit-system)

---

## Common Response Format

All responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message",
  "pagination": { "page": 1, "limit": 20, "total": 100, "total_pages": 5 }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid Authorization header",
    "details": {}
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 502 | Platform API error (Meta/Google/TikTok) |

### Authentication Header

All protected routes require a Bearer token:

```
Authorization: Bearer <jwt_token>
```

The JWT is obtained from the `/api/v1/auth/signin` or `/api/v1/auth/signup` endpoints.

---

## Authentication

All auth routes are public (no `Authorization` header required).

### POST /api/v1/auth/signup

Create a new user account with workspace.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "name": "Jane Smith"
}
```

**Validation Rules:**
- `email`: Must be a valid email, unique in system
- `password`: Minimum 8 characters
- `name`: 1-100 characters

**Response (201):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "newuser@example.com",
      "name": "Jane Smith",
      "avatar_url": null,
      "created_at": "2024-07-20T12:00:00.000Z",
      "updated_at": "2024-07-20T12:00:00.000Z"
    },
    "workspace": {
      "id": "uuid",
      "name": "Jane Smith's Workspace",
      "slug": "jane-smith-uuid",
      "plan": "free",
      "owner_id": "uuid",
      "branding": {},
      "settings": {},
      "created_at": "2024-07-20T12:00:00.000Z"
    }
  }
}
```

**Error Codes:** `VALIDATION_ERROR`, `409 Email already registered`

---

### POST /api/v1/auth/signin

Authenticate and receive JWT tokens.

**Request Body:**
```json
{
  "email": "alex@adnexus.ai",
  "password": "yourPassword"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "alex@adnexus.ai",
      "name": "Alex Morgan",
      "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      "created_at": "2024-04-21T10:00:00.000Z"
    },
    "workspace": {
      "id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
      "name": "Acme Marketing",
      "slug": "acme-marketing",
      "plan": "pro",
      "owner_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  }
}
```

**Error Codes:** `UNAUTHORIZED` (invalid credentials), `VALIDATION_ERROR`

---

### POST /api/v1/auth/forgot-password

Request a password reset email.

**Request Body:**
```json
{
  "email": "alex@adnexus.ai"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "If an account exists, a reset email has been sent"
  }
}
```

**Note:** In development mode, the response also includes the `reset_token` for testing.

---

### POST /api/v1/auth/reset-password

Reset password using a reset token.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "newSecurePassword123"
}
```

**Validation:** Password must be at least 8 characters.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

**Error Codes:** `UNAUTHORIZED` (invalid token), `VALIDATION_ERROR`

---

### GET /api/v1/auth/me

Get current user profile and workspace (requires authentication).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "alex@adnexus.ai",
      "name": "Alex Morgan",
      "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      "created_at": "2024-04-21T10:00:00.000Z",
      "updated_at": "2024-07-19T14:00:00.000Z"
    },
    "workspace": {
      "id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
      "name": "Acme Marketing",
      "slug": "acme-marketing",
      "plan": "pro",
      "branding": {
        "logo_url": "",
        "primary_color": "#6366F1",
        "favicon": ""
      },
      "settings": {
        "timezone": "America/New_York",
        "currency": "USD",
        "notifications": {
          "email_alerts": true,
          "morning_brief": true
        }
      }
    }
  }
}
```

---

### POST /api/v1/auth/refresh

Refresh an access token using a refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...new_access_token"
  }
}
```

---

### POST /api/v1/auth/signout

Sign out the current user (client-side token removal).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Signed out"
  }
}
```

---

## Campaigns

All campaign routes require authentication.

### GET /api/v1/campaigns

List campaigns for the current workspace with optional filters.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `platform` | string | — | Filter by platform: `meta`, `google`, `tiktok`, `snap` |
| `status` | string | — | Filter by status: `active`, `paused`, `draft`, `error`, `ended` |
| `page` | number | 1 | Page number (1-based) |
| `limit` | number | 20 | Items per page (max 100) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "c9d0e1f2-a3b4-5678-cdef-901234567890",
      "ad_account_id": "f6a7b8c9-d0e1-2345-fabc-678901234567",
      "platform_campaign_id": "1202068234567890",
      "name": "Summer Sale 2024",
      "status": "active",
      "objective": "CONVERSIONS",
      "daily_budget": 500.00,
      "budget_type": "daily",
      "spend": 12400.00,
      "impressions": 485000,
      "clicks": 8200,
      "ctr": 1.6907,
      "conversions": 340,
      "cpa": 36.47,
      "roas": 3.20,
      "frequency": 2.40,
      "reach": 202083,
      "cpm": 25.57,
      "cpc": 1.51,
      "start_date": "2024-05-15",
      "end_date": "2024-08-31",
      "platform": "meta",
      "created_at": "2024-05-13T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "total_pages": 1
  }
}
```

---

### GET /api/v1/campaigns/:id

Get a single campaign by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "c9d0e1f2-a3b4-5678-cdef-901234567890",
    "ad_account_id": "f6a7b8c9-d0e1-2345-fabc-678901234567",
    "platform": "meta",
    "platform_campaign_id": "1202068234567890",
    "name": "Summer Sale 2024",
    "status": "active",
    "objective": "CONVERSIONS",
    "daily_budget": 500.00,
    "spend": 12400.00,
    "impressions": 485000,
    "clicks": 8200,
    "ctr": 1.6907,
    "conversions": 340,
    "cpa": 36.47,
    "roas": 3.20,
    "frequency": 2.40,
    "reach": 202083,
    "cpm": 25.57,
    "cpc": 1.51,
    "start_date": "2024-05-15",
    "end_date": "2024-08-31",
    "platform_data": {
      "buying_type": "AUCTION",
      "bid_strategy": "LOWEST_COST_WITHOUT_CAP"
    }
  }
}
```

**Error Codes:** `NOT_FOUND`

---

### POST /api/v1/campaigns

Create a new campaign. **This creates a DRAFT, not a live campaign** (see [Draft-First Workflow](#draft-first-workflow)).

**Request Body:**
```json
{
  "ad_account_id": "f6a7b8c9-d0e1-2345-fabc-678901234567",
  "name": "Fall Collection Launch 2024",
  "objective": "CONVERSIONS",
  "daily_budget": 350,
  "status": "paused"
}
```

**Validation:**
- `ad_account_id`: Valid UUID referencing an `ad_accounts` record
- `name`: 1-500 characters
- `objective`: Required string
- `daily_budget`: Positive number (optional)
- `status`: `active`, `paused`, or `draft` (default: `paused`)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "draft-009-cccc-3333-000000000009",
    "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "platform": "meta",
    "draft_type": "campaign_create",
    "change_summary": "Create campaign \"Fall Collection Launch 2024\"",
    "change_detail": {
      "name": "Fall Collection Launch 2024",
      "objective": "CONVERSIONS",
      "daily_budget": 350,
      "status": "paused"
    },
    "ai_reasoning": "User-initiated campaign creation",
    "status": "pending",
    "actor_type": "user",
    "actor_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "created_at": "2024-07-20T12:00:00.000Z"
  },
  "message": "Campaign creation drafted. Review and approve to go live."
}
```

---

### PATCH /api/v1/campaigns/:id

Update a campaign. **This creates a DRAFT for the change**, not a direct update.

**Request Body:**
```json
{
  "name": "Summer Sale 2024 - Extended",
  "daily_budget": 650,
  "status": "active"
}
```

At least one field must be different from the current value.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "draft-010-cccc-3333-000000000010",
    "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "platform": "meta",
    "campaign_id": "c9d0e1f2-a3b4-5678-cdef-901234567890",
    "draft_type": "budget_change",
    "change_summary": "Update Summer Sale 2024: daily_budget",
    "change_detail": {
      "platform_campaign_id": "1202068234567890",
      "daily_budget": {
        "old": 500,
        "new": 650
      }
    },
    "status": "pending",
    "actor_type": "user",
    "actor_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "created_at": "2024-07-20T12:00:00.000Z"
  },
  "message": "Campaign update drafted. Review and approve to apply."
}
```

**Error Codes:** `NOT_FOUND`, `VALIDATION_ERROR` (no changes provided)

---

### GET /api/v1/campaigns/:id/insights

Get performance insights for a campaign over a date range.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date_start` | string | 30 days ago | Start date (YYYY-MM-DD) |
| `date_end` | string | Today | End date (YYYY-MM-DD) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "campaign_id": "c9d0e1f2-a3b4-5678-cdef-901234567890",
    "name": "Summer Sale 2024",
    "date_range": {
      "start": "2024-06-20",
      "end": "2024-07-20"
    },
    "spend": 12400.00,
    "impressions": 485000,
    "clicks": 8200,
    "ctr": 1.6907,
    "conversions": 340,
    "cpa": 36.47,
    "roas": 3.20,
    "frequency": 2.40,
    "reach": 202083
  }
}
```

---

### GET /api/v1/campaigns/summary

Get workspace campaign summary (counts by status, connected platforms).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total_campaigns": 8,
    "by_status": {
      "active": 6,
      "paused": 1,
      "draft": 0,
      "error": 0
    },
    "connected_platforms": ["meta", "google", "tiktok"]
  }
}
```

---

## Drafts

The core differentiator of AdNexus AI. All changes go through a draft-review-approve workflow.

### GET /api/v1/drafts

List drafts for the current workspace.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | — | Filter: `pending`, `approved`, `rejected`, `auto_applied`, `scheduled`, `error` |
| `platform` | string | — | Filter: `meta`, `google`, `tiktok`, `snap`, `all` |
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "draft-001-cccc-3333-000000000001",
      "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
      "platform": "meta",
      "campaign_id": "c9d0e1f2-a3b4-5678-cdef-901234567890",
      "draft_type": "budget_change",
      "change_summary": "Increase \"Summer Sale 2024\" daily budget from $500 to $650 (+30%)",
      "change_detail": {
        "field": "daily_budget",
        "old_value": 500,
        "new_value": 650
      },
      "ai_reasoning": "ROAS of 3.2x is above the 3.0x target with consistent conversion volume over the past 14 days.",
      "impact_estimate": "Estimated +25-30% increase in conversions, maintaining ROAS above 3.0x.",
      "status": "pending",
      "actor_type": "ai",
      "actor_name": "AI Agent",
      "actor_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "created_at": "2024-07-18T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 8
  }
}
```

---

### GET /api/v1/drafts/stats

Get draft statistics for the current workspace.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "pending": 3,
    "approved_today": 2,
    "rejected_today": 1,
    "auto_applied_today": 0
  }
}
```

---

### GET /api/v1/drafts/:id

Get a single draft by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "draft-001-cccc-3333-000000000001",
    "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "platform": "meta",
    "campaign_id": "c9d0e1f2-a3b4-5678-cdef-901234567890",
    "draft_type": "budget_change",
    "change_summary": "Increase \"Summer Sale 2024\" daily budget from $500 to $650 (+30%)",
    "change_detail": {
      "field": "daily_budget",
      "platform_campaign_id": "1202068234567890",
      "old_value": 500,
      "new_value": 650
    },
    "ai_reasoning": "ROAS of 3.2x is above the 3.0x target...",
    "impact_estimate": "Estimated +25-30% increase in conversions...",
    "status": "pending",
    "scheduled_at": null,
    "executed_at": null,
    "error_message": null,
    "actor_type": "ai",
    "actor_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "actor_name": "AI Agent",
    "rule_id": null,
    "approver_id": null,
    "approval_note": null,
    "created_at": "2024-07-18T10:00:00.000Z",
    "resolved_at": null
  }
}
```

**Error Codes:** `NOT_FOUND`

---

### POST /api/v1/drafts

Create a new draft manually.

**Request Body:**
```json
{
  "platform": "meta",
  "campaign_id": "c9d0e1f2-a3b4-5678-cdef-901234567890",
  "draft_type": "bid_adjustment",
  "change_summary": "Increase bid cap for Cart Abandoners adset",
  "change_detail": {
    "field": "bid_amount",
    "platform_adset_id": "as_120006",
    "old_value": 15,
    "new_value": 20
  },
  "ai_reasoning": "Manual bid adjustment based on auction insights",
  "impact_estimate": "Expected +20% increase in impressions and clicks"
}
```

**Valid `draft_type` values:** `budget_change`, `status_change`, `bid_adjustment`, `targeting_edit`, `creative_upload`, `campaign_create`, `campaign_duplicate`, `budget_reallocation`, `rule_based`, `audience_edit`

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "draft-011-cccc-3333-000000000011",
    "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "platform": "meta",
    "draft_type": "bid_adjustment",
    "change_summary": "Increase bid cap for Cart Abandoners adset",
    "change_detail": { ... },
    "ai_reasoning": "Manual bid adjustment based on auction insights",
    "status": "pending",
    "actor_type": "user",
    "actor_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "created_at": "2024-07-20T12:00:00.000Z"
  }
}
```

---

### POST /api/v1/drafts/:id/approve

Approve and apply a pending draft.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "draft-001-cccc-3333-000000000001",
    "status": "approved",
    "approver_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "executed_at": "2024-07-20T12:00:00.000Z",
    "resolved_at": "2024-07-20T12:00:00.000Z"
  },
  "message": "Draft approved and applied"
}
```

**What happens on approval:**
1. Draft status validated as `pending`
2. Change applied to live ad platform (Meta/Google/TikTok)
3. Draft marked as `approved` with `executed_at` timestamp
4. Audit log entry created

**Error Codes:** `VALIDATION_ERROR` (draft not in pending state), `PLATFORM_ERROR` (API call failed)

---

### POST /api/v1/drafts/:id/reject

Reject a pending draft.

**Request Body:**
```json
{
  "reason": "Budget increase too aggressive for this month"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "draft-001-cccc-3333-000000000001",
    "status": "rejected",
    "approver_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "approval_note": "Budget increase too aggressive for this month",
    "resolved_at": "2024-07-20T12:00:00.000Z"
  },
  "message": "Draft rejected"
}
```

---

### POST /api/v1/drafts/:id/schedule

Schedule a pending draft for future execution.

**Request Body:**
```json
{
  "execute_at": "2024-08-01T09:00:00Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "draft-001-cccc-3333-000000000001",
    "status": "scheduled",
    "scheduled_at": "2024-08-01T09:00:00Z"
  },
  "message": "Draft scheduled"
}
```

---

## Agent & Automation

### GET /api/v1/agent/rules

List all automation rules for the workspace.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "rule-001-dddd-4444-000000000001",
      "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
      "name": "Pause High CPA Campaigns",
      "description": "Automatically pause any campaign where CPA exceeds $50 for 3+ consecutive days...",
      "conditions": [
        { "metric": "cpa", "operator": "gt", "value": 50, "timeWindow": "3d" },
        { "metric": "spend", "operator": "gt", "value": 500 }
      ],
      "actions": [
        { "type": "pause_campaign", "params": { "reason": "cpa_above_threshold" } },
        { "type": "notify", "params": { "channel": "email" } }
      ],
      "platforms": ["meta", "google", "tiktok", "snap"],
      "status": "active",
      "applied_count": 3,
      "last_applied_at": "2024-07-18T10:00:00.000Z",
      "created_at": "2024-05-21T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/v1/agent/rules

Create a new automation rule.

**Request Body:**
```json
{
  "name": "Increase Budget on High ROAS Weekends",
  "description": "Scale weekend budgets for campaigns with strong Saturday/Sunday performance",
  "conditions": [
    { "metric": "roas", "operator": "gt", "value": 3.5, "timeWindow": "7d" },
    { "metric": "spend", "operator": "gt", "value": 2000 }
  ],
  "actions": [
    { "type": "increase_budget", "params": { "percentage": 25, "max_budget": 1500 } },
    { "type": "notify", "params": { "channel": "slack" } }
  ],
  "platforms": ["meta", "google"],
  "status": "active"
}
```

**Condition operators:** `gt`, `lt`, `gte`, `lte`, `eq`, `pct_change_gt`

**Action types:** `pause_campaign`, `increase_budget`, `decrease_budget`, `adjust_bid`, `create_draft`, `notify`

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "rule-004-dddd-4444-000000000004",
    "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "name": "Increase Budget on High ROAS Weekends",
    "conditions": [ ... ],
    "actions": [ ... ],
    "platforms": ["meta", "google"],
    "status": "active",
    "applied_count": 0,
    "created_at": "2024-07-20T12:00:00.000Z"
  }
}
```

---

### PATCH /api/v1/agent/rules/:id

Update an automation rule.

**Request Body (partial update):**
```json
{
  "status": "paused",
  "conditions": [
    { "metric": "cpa", "operator": "gt", "value": 60 }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ...updated rule... }
}
```

**Error Codes:** `NOT_FOUND`

---

### DELETE /api/v1/agent/rules/:id

Delete an automation rule.

**Response (200):**
```json
{
  "success": true,
  "message": "Rule deleted"
}
```

---

### GET /api/v1/agent/status

Get the AI agent status and schedule.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "is_running": true,
    "check_interval_minutes": 15,
    "last_check": "2024-07-20T11:45:00.000Z",
    "next_check": "2024-07-20T12:00:00.000Z"
  }
}
```

---

### POST /api/v1/agent/run-now

Manually trigger rule evaluation.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "triggered": 2,
    "drafts": 2,
    "evaluated": 3
  },
  "message": "Evaluated rules: 2 triggered, 2 drafts created"
}
```

---

### GET /api/v1/agent/optimizations

Get recent AI optimization actions.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "audit-005-gggg-7777-000000000005",
      "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
      "actor_type": "ai",
      "actor_name": "AI Agent",
      "action": "Rule triggered: Scale High ROAS Campaigns",
      "action_category": "agent_action",
      "platform": "meta",
      "campaign_id": "c9d0e1f2-a3b4-5678-cdef-901234567890",
      "details": { ... },
      "created_at": "2024-07-15T10:00:00.000Z"
    }
  ]
}
```

---

## Reports

### GET /api/v1/reports/cross-platform

Get cross-platform performance report.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date_start` | string | 30 days ago | Start date (YYYY-MM-DD) |
| `date_end` | string | Today | End date (YYYY-MM-DD) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "date_range": {
      "start": "2024-06-20",
      "end": "2024-07-20"
    },
    "platforms": [
      {
        "platform": "meta",
        "spend": 26200.00,
        "impressions": 1155000,
        "clicks": 15500,
        "ctr": "1.34",
        "conversions": 905,
        "roas": "3.37",
        "cpa": "28.95"
      },
      {
        "platform": "google",
        "spend": 13000.00,
        "impressions": 545000,
        "clicks": 6450,
        "ctr": "1.18",
        "conversions": 337,
        "roas": "2.35",
        "cpa": "38.58"
      },
      {
        "platform": "tiktok",
        "spend": 10400.00,
        "impressions": 475000,
        "clicks": 7000,
        "ctr": "1.47",
        "conversions": 233,
        "roas": "2.75",
        "cpa": "44.64"
      }
    ]
  }
}
```

---

### GET /api/v1/reports/funnel

Get conversion funnel data across all active campaigns.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stages": [
      { "name": "Impressions", "value": 2175000 },
      { "name": "Clicks", "value": 28950, "rate": "1.33%" },
      { "name": "Conversions", "value": 1475, "rate": "5.10%" },
      { "name": "Revenue", "value": "$166,375" }
    ]
  }
}
```

---

### GET /api/v1/reports/scheduled

List scheduled reports for the workspace.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "report-001-ffff-6666-000000000001",
      "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
      "name": "Weekly Performance Summary",
      "type": "email",
      "config": {
        "recipients": ["alex@adnexus.ai", "sam@adnexus.ai"],
        "format": "html",
        "sections": ["executive_summary", "platform_breakdown"],
        "include_charts": true
      },
      "schedule_cron": "0 8 * * MON",
      "status": "active",
      "last_run_at": "2024-07-15T08:00:00.000Z",
      "next_run_at": "2024-07-22T08:00:00.000Z",
      "created_at": "2024-05-21T00:00:00.000Z"
    }
  ]
}
```

---

## Billing & Credits

### GET /api/v1/billing/subscription

Get current subscription and credit status.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "plan": "pro",
    "plan_name": "Pro",
    "price": 9900,
    "credits_used": 847,
    "credits_limit": 2000,
    "credits_remaining": 1153,
    "month": "2024-07"
  }
}
```

---

### GET /api/v1/billing/credits

Get detailed credit usage breakdown.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `month` | string | Current month | Month in YYYY-MM format |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "balance": {
      "month": "2024-07",
      "used": 847,
      "limit": 2000,
      "remaining": 1153
    },
    "by_feature": {
      "insight_generation": 10,
      "draft_creation": 8,
      "rule_evaluation": 15,
      "report_generation": 10,
      "morning_brief": 8,
      "ab_test_analysis": 10
    },
    "log": [
      {
        "id": "cul-001-iiii-9999-000000000001",
        "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
        "feature": "insight_generation",
        "action": "Analyzed campaign performance across Meta, Google, TikTok...",
        "platform": "all",
        "credits_used": 10,
        "cost_estimate": 0.0900,
        "month": "2024-07",
        "created_at": "2024-07-18T10:00:00.000Z"
      }
    ]
  }
}
```

---

### POST /api/v1/billing/use-credits

Deduct credits for a feature usage (internal endpoint).

**Request Body:**
```json
{
  "feature": "campaign_analysis",
  "action": "Deep analysis of Summer Sale campaign performance",
  "platform": "meta"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "credits_used": 10,
    "remaining": 1143
  }
}
```

**Response (429 — Credit limit exceeded):**
```json
{
  "success": false,
  "error": {
    "code": "CREDIT_LIMIT",
    "message": "Monthly credit limit exceeded"
  }
}
```

### Credit Costs by Feature

| Feature | Credits | Est. Cost |
|---------|---------|-----------|
| `morning_brief` | 8 | $0.072 |
| `ai_chat_query` | 3 | $0.027 |
| `creative_generation` | 15 | $0.135 |
| `campaign_analysis` | 10 | $0.090 |
| `anomaly_detection` | 12 | $0.108 |
| `report_generation` | 10 | $0.090 |
| `budget_optimization` | 8 | $0.072 |
| `audience_insight` | 5 | $0.045 |
| `ab_test_analysis` | 10 | $0.090 |
| `mcp_tool_call` | 2 | $0.018 |
| `audit_run` | 15 | $0.135 |

---

## Goals

### GET /api/v1/goals

List all performance goals for the workspace.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "goal-001-eeee-5555-000000000001",
      "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
      "name": "Meta Portfolio ROAS Target",
      "goal_type": "roas",
      "platform": "meta",
      "target_value": 3.5000,
      "current_value": 3.2000,
      "baseline_value": 2.8000,
      "unit": "x",
      "start_date": "2024-04-01",
      "end_date": "2024-12-31",
      "status": "active",
      "campaign_ids": ["c9d0e1f2-a3b4-5678-cdef-901234567890", ...],
      "alert_when": "at_risk",
      "created_at": "2024-04-21T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/v1/goals

Create a new performance goal.

**Request Body:**
```json
{
  "name": "Meta Portfolio ROAS Target",
  "goal_type": "roas",
  "platform": "meta",
  "target_value": 3.5,
  "baseline_value": 2.8,
  "unit": "x",
  "start_date": "2024-04-01",
  "end_date": "2024-12-31",
  "campaign_ids": ["c9d0e1f2-a3b4-5678-cdef-901234567890"],
  "alert_when": "at_risk"
}
```

**Valid `goal_type` values:** `roas`, `cpa`, `ctr`, `spend`, `conversions`, `custom`

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "goal-004-eeee-5555-000000000004",
    "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "name": "Meta Portfolio ROAS Target",
    "goal_type": "roas",
    "target_value": 3.5000,
    "current_value": 2.8000,
    "baseline_value": 2.8000,
    "unit": "x",
    "start_date": "2024-04-01",
    "end_date": "2024-12-31",
    "status": "active",
    "campaign_ids": ["c9d0e1f2-a3b4-5678-cdef-901234567890"],
    "alert_when": "at_risk",
    "created_at": "2024-07-20T12:00:00.000Z"
  }
}
```

---

### PATCH /api/v1/goals/:id

Update a goal (partial updates supported).

**Request Body:**
```json
{
  "target_value": 4.0,
  "status": "active"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ...updated goal... }
}
```

**Error Codes:** `NOT_FOUND`

---

### DELETE /api/v1/goals/:id

Delete a goal.

**Response (200):**
```json
{
  "success": true
}
```

---

### GET /api/v1/goals/:id/progress

Get goal progress with calculated status.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "goal": { ...goal object... },
    "progress_pct": "91.4",
    "status": "at_risk"
  }
}
```

**Progress status thresholds:**
- `completed`: progress >= 100%
- `on_track`: progress >= 80%
- `at_risk`: progress >= 50%
- `off_track`: progress < 50%

---

## Audiences

### GET /api/v1/audiences

List audiences for the workspace.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Women 25-34 US",
      "type": "custom",
      "platform": "meta",
      "size": "4.2M",
      "campaigns": 3,
      "status": "active"
    },
    {
      "id": "2",
      "name": "Cart Abandoners",
      "type": "retargeting",
      "platform": "meta",
      "size": "24K",
      "campaigns": 1,
      "status": "active"
    },
    {
      "id": "3",
      "name": "In-Market Fitness",
      "type": "interest",
      "platform": "google",
      "size": "8.5M",
      "campaigns": 1,
      "status": "active"
    }
  ]
}
```

---

### POST /api/v1/audiences

Create a new audience (placeholder — full implementation coming).

**Request Body:**
```json
{
  "name": "High-Value Customers",
  "type": "custom",
  "platform": "meta",
  "targeting": {
    "age_min": 25,
    "age_max": 55,
    "custom_audiences": ["purchasers_90d"]
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "new",
    "name": "High-Value Customers",
    "type": "custom",
    "platform": "meta",
    "status": "active"
  }
}
```

---

## Settings

### GET /api/v1/settings

Get workspace settings.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "name": "Acme Marketing",
    "slug": "acme-marketing",
    "plan": "pro",
    "owner_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "branding": {
      "logo_url": "",
      "primary_color": "#6366F1",
      "favicon": ""
    },
    "settings": {
      "timezone": "America/New_York",
      "currency": "USD",
      "date_format": "MM/DD/YYYY",
      "notifications": {
        "email_alerts": true,
        "slack_webhook": false,
        "morning_brief": true
      }
    },
    "created_at": "2024-04-21T00:00:00.000Z"
  }
}
```

---

### PATCH /api/v1/settings

Update workspace settings (partial update).

**Request Body:**
```json
{
  "name": "Acme Marketing Inc.",
  "branding": {
    "primary_color": "#10B981"
  },
  "settings": {
    "notifications": {
      "morning_brief": false
    }
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ...updated workspace... }
}
```

---

### GET /api/v1/settings/team

Get workspace team members.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "d4e5f6a7-b8c9-0123-defa-456789012345",
      "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "role": "owner",
      "created_at": "2024-04-21T00:00:00.000Z",
      "users": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "email": "alex@adnexus.ai",
        "name": "Alex Morgan",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
      }
    },
    {
      "id": "e5f6a7b8-c9d0-1234-efab-567890123456",
      "workspace_id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
      "user_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "role": "admin",
      "created_at": "2024-04-26T00:00:00.000Z",
      "users": {
        "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
        "email": "sam@adnexus.ai",
        "name": "Sam Chen",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam"
      }
    }
  ]
}
```

---

### POST /api/v1/settings/team/invite

Invite a team member by email.

**Request Body:**
```json
{
  "email": "jordan@example.com",
  "role": "analyst"
}
```

**Valid roles:** `admin`, `analyst`, `viewer`

**Response (200):**
```json
{
  "success": true,
  "message": "Invitation sent"
}
```

---

### DELETE /api/v1/settings/team/:id

Remove a team member.

**Response (200):**
```json
{
  "success": true
}
```

---

### GET /api/v1/settings/integrations

Get connected integrations.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "ad_accounts": [
      {
        "platform": "meta",
        "name": "Meta Ads - Acme",
        "status": "active",
        "created_at": "2024-04-23T00:00:00.000Z"
      },
      {
        "platform": "google",
        "name": "Google Ads - Acme",
        "status": "active",
        "created_at": "2024-05-01T00:00:00.000Z"
      },
      {
        "platform": "tiktok",
        "name": "TikTok Ads - Acme",
        "status": "active",
        "created_at": "2024-05-09T00:00:00.000Z"
      }
    ],
    "slack": {
      "connected": false
    }
  }
}
```

---

## Error Reference

### Error Code Reference

| Code | HTTP Status | Description | When It Occurs |
|------|-------------|-------------|----------------|
| `UNAUTHORIZED` | 401 | Authentication required | Missing/invalid/expired JWT token |
| `FORBIDDEN` | 403 | Insufficient permissions | User lacks required workspace role |
| `NOT_FOUND` | 404 | Resource not found | Campaign, draft, rule, or goal ID doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid request data | Missing required fields, wrong types, invalid enums |
| `RATE_LIMIT` | 429 | Too many requests | Credit limit exceeded or API rate limit hit |
| `PLATFORM_ERROR` | 502 | Ad platform API error | Meta/Google/TikTok API returned an error |
| `INTERNAL_ERROR` | 500 | Server error | Unexpected server-side error |
| `CREDIT_LIMIT` | 429 | Monthly credit exceeded | AI feature usage hit the plan limit |

### Validation Rules by Endpoint

| Endpoint | Validation Rules |
|----------|-----------------|
| `POST /auth/signup` | Email unique, password >= 8 chars, name 1-100 chars |
| `POST /auth/signin` | Valid email format, password present |
| `POST /auth/reset-password` | Token present, password >= 8 chars |
| `POST /campaigns` | Valid ad_account_id UUID, name 1-500 chars, positive budget |
| `PATCH /campaigns/:id` | At least one field changed, valid status enum |
| `POST /drafts` | Valid platform enum, valid draft_type enum, change_summary present |
| `POST /drafts/:id/schedule` | Valid ISO 8601 datetime in the future |
| `POST /agent/rules` | Name present, valid conditions/actions structure |
| `POST /goals` | Valid goal_type enum, target_value > 0, valid date range |
| `POST /settings/team/invite` | Valid email, role in [admin, analyst, viewer] |

---

## Draft-First Workflow

AdNexus AI's core safety model. **All campaign changes go through drafts** — no changes are applied directly to live ad accounts without human review.

### The Flow

```
User Request / AI Detection
         |
         v
+-------------------------+
|  DRAFT CREATED (pending)|
|  - AI reasoning         |
|  - Impact estimate      |
|  - Change details       |
+-----------+-------------+
            |
    +-------+-------+
    |               |
    v               v
+--------+     +---------+
| APPROVE|     | REJECT  |
+---+----+     +----+----+
    |               |
    v               v
+--------+-+   +----------+
| Applied  |   | Archived |
| Live API |   | (rejected)|
+----------+   +----------+
```

### Draft Actor Types

| Type | Description | Example |
|------|-------------|---------|
| `ai` | Draft created by AI agent | Rule trigger, anomaly detection |
| `user` | Draft created by human user | Manual campaign edit |
| `system` | Draft created by system | Scheduled maintenance |

### Draft Status Lifecycle

```
                    +------------------+
                    |     ERROR        |
                    | (application     |
                    |  failed)         |
                    +--------+---------+
                             ^
                             |
+---------+     +---------+  |   +----------+     +-----------+
|  CREATED +---->| PENDING +--+-->| APPROVED |---->| APPLIED   |
+---------+     +----+----+      +----------+     | (live)    |
                     |                            +-----------+
                     |     +----------+
                     +---->| SCHEDULED|
                     |     +----+-----+
                     |          |
                     |          v
                     |     +----------+
                     |     | EXECUTED |
                     |     +----------+
                     |
                     |     +----------+
                     +---->| REJECTED |
                           +----------+
```

### Why Draft-First?

1. **Prevent costly mistakes** — Every change is reviewed before going live
2. **AI accountability** — AI-generated changes include reasoning and impact estimates
3. **Audit trail** — Every action is logged with who/what/when
4. **Collaboration** — Team members can review and discuss changes
5. **Compliance** — Maintains a record of all campaign modifications

---

## Credit System

AI features consume credits from your monthly allocation. Credits reset on the 1st of each month.

### Plan Limits

| Plan | Monthly Credits | Price | Ad Accounts |
|------|----------------|-------|-------------|
| Free | 100 | $0 | 1 |
| Pro | 2,000 | $99/mo | 5 |
| Premium | 10,000 | $299/mo | 20 |
| Agency | 50,000 | $499/mo | Unlimited |

### Credit Consumption by Feature

| Feature | Credits | Description |
|---------|---------|-------------|
| `morning_brief` | 8 | Daily morning performance brief |
| `ai_chat_query` | 3 | AI chat message |
| `creative_generation` | 15 | Generate ad creative (image/video) |
| `campaign_analysis` | 10 | Deep campaign performance analysis |
| `anomaly_detection` | 12 | Detect unusual performance patterns |
| `report_generation` | 10 | Generate custom reports |
| `budget_optimization` | 8 | Budget allocation recommendations |
| `audience_insight` | 5 | Audience analysis and suggestions |
| `ab_test_analysis` | 10 | Statistical A/B test analysis |
| `mcp_tool_call` | 2 | MCP tool invocation |
| `audit_run` | 15 | Full account audit |

### Credit Usage Flow

```
1. Feature request (e.g., "Analyze my campaigns")
          |
          v
2. Check credit balance
   IF credits_used + cost > limit:
      RETURN 429 CREDIT_LIMIT error
          |
          v
3. Deduct credits from ai_credits
          |
          v
4. Log usage in credit_usage_log
          |
          v
5. Execute feature
          |
          v
6. Return result with remaining credits
```

### Monitoring Credits

```bash
# Check current balance
curl http://localhost:3001/api/v1/billing/credits \
  -H "Authorization: Bearer <token>"

# Check specific month
curl "http://localhost:3001/api/v1/billing/credits?month=2024-07" \
  -H "Authorization: Bearer <token>"
```

---

*Last updated: July 2024*
