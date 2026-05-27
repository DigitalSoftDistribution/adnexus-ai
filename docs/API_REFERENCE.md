# API Reference

> **Base URL:** `https://api.devplatform.io` | **Current Version:** `v3`
> **Protocol:** HTTPS only | **Format:** JSON | **Charset:** UTF-8

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Codes](#error-codes)
- [Pagination](#pagination)
- [Versioning](#versioning)
- [Endpoints](#endpoints)
  - [Auth (8 endpoints)](#auth)
  - [Users (10 endpoints)](#users)
  - [Teams (8 endpoints)](#teams)
  - [Projects (12 endpoints)](#projects)
  - [Deployments (10 endpoints)](#deployments)
  - [Environments (8 endpoints)](#environments)
  - [Domains (6 endpoints)](#domains)
  - [Webhooks (10 endpoints)](#webhooks-api)
  - [Billing (12 endpoints)](#billing)
  - [Integrations (8 endpoints)](#integrations)
  - [Monitoring (6 endpoints)](#monitoring)
  - [Admin (8 endpoints)](#admin)
- [WebSocket Events](#websocket-events)

---

## Authentication

DevPlatform uses **OAuth 2.0 + JWT** for authentication. Three authentication methods are supported:

### 1. Client Credentials (Machine-to-Machine)

```http
POST /api/v3/auth/token
Content-Type: application/json
```

```json
{
  "client_id": "dp_live_xxxxxxxxxxxx",
  "client_secret": "dp_sk_xxxxxxxxxxxxxxxxxxxx",
  "grant_type": "client_credentials",
  "scope": "projects:read deployments:write"
}
```

Response:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "projects:read deployments:write"
}
```

### 2. Authorization Code (User-facing Apps)

**Step 1** — Redirect user to authorization URL:

```
https://api.devplatform.io/api/v3/auth/authorize
  ?client_id=dp_live_xxxxxxxxxxxx
  &redirect_uri=https://your-app.com/callback
  &response_type=code
  &scope=projects:read+user:read
  &state=random-state-string
```

**Step 2** — Exchange code for token:

```http
POST /api/v3/auth/token
Content-Type: application/json
```

```json
{
  "client_id": "dp_live_xxxxxxxxxxxx",
  "client_secret": "dp_sk_xxxxxxxxxxxxxxxxxxxx",
  "code": "authz_code_from_callback",
  "grant_type": "authorization_code",
  "redirect_uri": "https://your-app.com/callback"
}
```

### 3. Personal Access Token (PAT)

Used for CLI tools and scripts. Generate from Dashboard > Settings > API Tokens.

```http
GET /api/v3/user/me
Authorization: Bearer dp_pat_xxxxxxxxxxxxxxxxxxxx
```

### Scopes Reference

| Scope | Description | Access Level |
|-------|-------------|--------------|
| `user:read` | Read user profile | Read |
| `user:write` | Update user profile | Write |
| `team:read` | Read team information | Read |
| `team:write` | Manage team settings | Write |
| `team:admin` | Full team administration | Admin |
| `projects:read` | Read projects | Read |
| `projects:write` | Create/update projects | Write |
| `projects:admin` | Delete projects, manage secrets | Admin |
| `deployments:read` | Read deployments | Read |
| `deployments:write` | Create deployments | Write |
| `domains:read` | Read domain configuration | Read |
| `domains:write` | Manage custom domains | Write |
| `webhooks:read` | Read webhook configurations | Read |
| `webhooks:write` | Configure webhooks | Write |
| `billing:read` | Read billing information | Read |
| `billing:write` | Manage subscriptions & payments | Write |
| `admin:read` | Read admin data | Admin |
| `admin:write` | Admin operations | Admin |
| `monitoring:read` | Read logs and metrics | Read |

### Token Validation

```http
POST /api/v3/auth/introspect
Authorization: Bearer <token>
```

Response:

```json
{
  "active": true,
  "sub": "usr_abc123",
  "scope": "projects:read deployments:write",
  "client_id": "dp_live_xxxxxxxxxxxx",
  "exp": 1705315200,
  "iat": 1705311600,
  "iss": "devplatform",
  "aud": "api.devplatform.io"
}
```

---

## Rate Limiting

Rate limits are applied per API key / access token. Limits vary by plan:

| Plan | Requests/Min | Burst | Concurrent |
|------|-------------|-------|------------|
| Free | 60 | 10 | 5 |
| Pro | 1,000 | 100 | 50 |
| Team | 5,000 | 500 | 200 |
| Enterprise | Custom | Custom | Custom |

### Rate Limit Headers

Every API response includes these headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705315200
X-RateLimit-Retry-After: 60
```

### Exceeding Limits

When rate limited, the API returns `429 Too Many Requests`:

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Retry after 60 seconds.",
    "retry_after": 60,
    "limit": 1000,
    "window": "1m"
  }
}
```

### WebSocket Rate Limits

| Event Type | Limit |
|------------|-------|
| Connection attempts | 10/min per IP |
| Messages sent | 100/min per connection |
| Presence updates | 30/min per connection |

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | When Returned |
|------|---------|---------------|
| `200` | OK | Successful GET, PUT, PATCH |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Invalid request body, missing fields |
| `401` | Unauthorized | Missing or invalid authentication |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource already exists, state conflict |
| `422` | Unprocessable Entity | Validation errors |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server error |
| `502` | Bad Gateway | Upstream service error |
| `503` | Service Unavailable | Maintenance or overload |

### Error Response Format

```json
{
  "error": {
    "code": "validation_failed",
    "message": "The request body contains validation errors.",
    "request_id": "req_abc123def456",
    "details": [
      {
        "field": "email",
        "code": "invalid_email",
        "message": "Must be a valid email address."
      },
      {
        "field": "name",
        "code": "too_short",
        "message": "Must be at least 3 characters."
      }
    ],
    "documentation_url": "https://docs.devplatform.io/errors/validation_failed"
  }
}
```

### Common Error Codes

| Error Code | HTTP Status | Description | Resolution |
|------------|-------------|-------------|------------|
| `invalid_credentials` | 401 | Authentication failed | Check client_id and client_secret |
| `token_expired` | 401 | JWT token has expired | Refresh or obtain new token |
| `insufficient_scope` | 403 | Token lacks required scope | Request token with broader scope |
| `resource_not_found` | 404 | Requested resource not found | Check resource ID |
| `resource_conflict` | 409 | Resource already exists | Use a different identifier |
| `validation_failed` | 422 | Request validation failed | Check error details |
| `rate_limit_exceeded` | 429 | Too many requests | Wait and retry with backoff |
| `service_unavailable` | 503 | Service temporarily unavailable | Retry with exponential backoff |
| `mfa_required` | 403 | Multi-factor auth required | Complete MFA challenge |
| `org_suspended` | 403 | Organization account suspended | Contact support |

---

## Pagination

List endpoints use cursor-based pagination with optional offset fallback.

### Request Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | integer | 20 | 100 | Items per page |
| `cursor` | string | - | - | Opaque cursor from previous response |
| `offset` | integer | 0 | 10,000 | Offset (fallback, slower) |
| `order` | string | `desc` | - | `asc` or `desc` |
| `order_by` | string | `created_at` | - | Field to sort by |

### Response Format

```json
{
  "data": [...],
  "pagination": {
    "total_count": 145,
    "returned_count": 20,
    "has_more": true,
    "next_cursor": "cursor_string_for_next_page",
    "prev_cursor": "cursor_string_for_prev_page",
    "current_page": 1,
    "total_pages": 8
  }
}
```

### Example

```http
GET /api/v3/projects?limit=10&order_by=name&order=asc
Authorization: Bearer <token>
```

---

## Versioning

The API version is included in the URL path: `/api/v3/...`

| Version | Status | Sunset Date |
|---------|--------|-------------|
| v1 | Deprecated | 2025-06-01 |
| v2 | Legacy | 2026-06-01 |
| **v3** | **Current** | - |
| v4 | Beta | - |

Specify version in `Accept` header for content negotiation:

```http
Accept: application/json; version=3.2
```

---

## Endpoints

---

### Auth

**Base:** `/api/v3/auth`

#### 1. POST `/auth/token` — Obtain Access Token

Exchange credentials for a JWT access token.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | None (uses client credentials in body) |
| Rate Limit | 20/min per IP |

**Request Body:**

```json
{
  "client_id": "dp_live_xxxxxxxxxxxx",
  "client_secret": "dp_sk_xxxxxxxxxxxxxxxxxxxx",
  "grant_type": "client_credentials",
  "scope": "projects:read deployments:write",
  "expires_in": 3600
}
```

**Response (201):**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "projects:read deployments:write",
  "refresh_token": "dp_rt_xxxxxxxxxxxxxxxxxxxx"
}
```

**Errors:** `400`, `401`, `429`

---

#### 2. POST `/auth/refresh` — Refresh Access Token

Refresh an expiring access token using a refresh token.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer refresh_token |
| Rate Limit | 30/min per token |

**Request Body:**

```json
{
  "refresh_token": "dp_rt_xxxxxxxxxxxxxxxxxxxx",
  "grant_type": "refresh_token",
  "scope": "projects:read deployments:write"
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "projects:read deployments:write",
  "refresh_token": "dp_rt_yyyyyyyyyyyyyyyyyyyy"
}
```

**Errors:** `400`, `401`, `429`

---

#### 3. POST `/auth/revoke` — Revoke Token

Revoke an access or refresh token.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |

**Request Body:**

```json
{
  "token": "dp_rt_xxxxxxxxxxxxxxxxxxxx",
  "token_type_hint": "refresh_token"
}
```

**Response (204):** No content

**Errors:** `400`, `401`

---

#### 4. POST `/auth/introspect` — Introspect Token

Check if a token is active and get its metadata.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token or Basic client credentials |

**Request Body:**

```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**

```json
{
  "active": true,
  "sub": "usr_abc123",
  "scope": "projects:read deployments:write",
  "client_id": "dp_live_xxxxxxxxxxxx",
  "username": "jane@example.com",
  "token_type": "Bearer",
  "exp": 1705315200,
  "iat": 1705311600,
  "iss": "devplatform",
  "aud": "api.devplatform.io"
}
```

**Errors:** `400`, `401`

---

#### 5. GET `/auth/providers` — List Auth Providers

List configured identity providers (OAuth, SAML, OIDC).

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | None |

**Response (200):**

```json
{
  "data": [
    {
      "id": "google",
      "name": "Google",
      "type": "oidc",
      "icon_url": "https://cdn.devplatform.io/icons/google.svg",
      "authorize_url": "https://api.devplatform.io/api/v3/auth/authorize/google"
    },
    {
      "id": "github",
      "name": "GitHub",
      "type": "oauth2",
      "icon_url": "https://cdn.devplatform.io/icons/github.svg",
      "authorize_url": "https://api.devplatform.io/api/v3/auth/authorize/github"
    },
    {
      "id": "saml_okta",
      "name": "Okta SSO",
      "type": "saml",
      "icon_url": "https://cdn.devplatform.io/icons/okta.svg",
      "authorize_url": "https://api.devplatform.io/api/v3/auth/saml/okta"
    }
  ]
}
```

---

#### 6. POST `/auth/mfa/challenge` — Initiate MFA Challenge

Trigger a multi-factor authentication challenge.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token (pre-MFA) |

**Request Body:**

```json
{
  "method": "totp",
  "factor_id": "mfa_fac_abc123"
}
```

**Response (200):**

```json
{
  "challenge_id": "mfa_chl_def456",
  "expires_in": 300,
  "method": "totp"
}
```

**Errors:** `400`, `401`, `403`

---

#### 7. POST `/auth/mfa/verify` — Verify MFA Challenge

Verify an MFA challenge response.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token (pre-MFA) |

**Request Body:**

```json
{
  "challenge_id": "mfa_chl_def456",
  "code": "123456"
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "projects:read deployments:write"
}
```

**Errors:** `400`, `401`, `403`

---

#### 8. POST `/auth/password/reset` — Request Password Reset

Initiate password reset flow.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | None |
| Rate Limit | 5/min per IP |

**Request Body:**

```json
{
  "email": "user@example.com",
  "redirect_url": "https://app.devplatform.io/reset-password"
}
```

**Response (202):**

```json
{
  "message": "If the email exists, a reset link has been sent.",
  "expires_in": 3600
}
```

**Errors:** `400`, `429`

---

### Users

**Base:** `/api/v3/user`

#### 9. GET `/user/me` — Get Current User

Retrieve the authenticated user's profile.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `user:read` |

**Response (200):**

```json
{
  "id": "usr_abc123",
  "email": "jane@example.com",
  "name": "Jane Developer",
  "avatar_url": "https://cdn.devplatform.io/avatars/usr_abc123.png",
  "timezone": "America/New_York",
  "locale": "en-US",
  "email_verified": true,
  "mfa_enabled": true,
  "created_at": "2023-08-15T10:30:00Z",
  "updated_at": "2024-01-10T14:22:00Z",
  "last_login_at": "2024-01-15T09:00:00Z",
  "plan": {
    "tier": "team",
    "name": "Team",
    "expires_at": "2025-08-15T00:00:00Z"
  },
  "teams": [
    {
      "id": "team_xyz789",
      "name": "Platform Team",
      "role": "admin"
    }
  ],
  "quota": {
    "projects_used": 12,
    "projects_limit": 50,
    "deployments_used": 145,
    "deployments_limit": 1000,
    "bandwidth_used_gb": 234.5,
    "bandwidth_limit_gb": 500
  }
}
```

---

#### 10. PATCH `/user/me` — Update Current User

Update the authenticated user's profile.

| Attribute | Value |
|-----------|-------|
| Method | `PATCH` |
| Auth | Bearer token |
| Scopes | `user:write` |

**Request Body:**

```json
{
  "name": "Jane Developer",
  "timezone": "America/Los_Angeles",
  "locale": "en-US",
  "avatar_url": "https://example.com/new-avatar.png"
}
```

**Response (200):** Updated user object (same as GET /user/me)

**Errors:** `400`, `401`, `403`, `422`

---

#### 11. DELETE `/user/me` — Delete Account

Permanently delete the authenticated user's account.

| Attribute | Value |
|-----------|-------|
| Method | `DELETE` |
| Auth | Bearer token |
| Scopes | `user:write` |

**Request Body:**

```json
{
  "password": "current_password",
  "confirmation": "DELETE MY ACCOUNT"
}
```

**Response (204):** No content

**Errors:** `400`, `401`, `403`, `409`

---

#### 12. GET `/user/me/sessions` — List Active Sessions

List all active sessions for the current user.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `user:read` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "sess_001",
      "ip_address": "203.0.113.1",
      "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "location": "San Francisco, CA",
      "created_at": "2024-01-15T09:00:00Z",
      "last_active_at": "2024-01-15T14:30:00Z",
      "current": true
    },
    {
      "id": "sess_002",
      "ip_address": "198.51.100.2",
      "user_agent": "DevPlatform CLI/3.2.1",
      "location": "AWS us-east-1",
      "created_at": "2024-01-14T10:00:00Z",
      "last_active_at": "2024-01-15T12:00:00Z",
      "current": false
    }
  ],
  "pagination": {
    "total_count": 2,
    "returned_count": 2,
    "has_more": false
  }
}
```

---

#### 13. DELETE `/user/me/sessions/:id` — Revoke Session

Revoke a specific session.

| Attribute | Value |
|-----------|-------|
| Method | `DELETE` |
| Auth | Bearer token |
| Scopes | `user:write` |

**Response (204):** No content

**Errors:** `401`, `403`, `404`

---

#### 14. DELETE `/user/me/sessions` — Revoke All Sessions

Revoke all sessions except the current one.

| Attribute | Value |
|-----------|-------|
| Method | `DELETE` |
| Auth | Bearer token |
| Scopes | `user:write` |

**Response (200):**

```json
{
  "revoked_count": 3
}
```

---

#### 15. GET `/user/me/api-keys` — List API Keys

List personal access tokens / API keys.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `user:read` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "key_abc123",
      "name": "Production CI/CD",
      "prefix": "dp_pat_prod_",
      "scopes": ["deployments:write", "projects:read"],
      "last_used_at": "2024-01-15T08:00:00Z",
      "expires_at": "2025-01-15T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### 16. POST `/user/me/api-keys` — Create API Key

Create a new personal access token.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `user:write` |

**Request Body:**

```json
{
  "name": "Staging Deploy",
  "scopes": ["deployments:write", "projects:read"],
  "expires_in_days": 90
}
```

**Response (201):**

```json
{
  "id": "key_def456",
  "name": "Staging Deploy",
  "token": "dp_pat_staging_xxxxxxxxxxxxxxxxxxxx",
  "prefix": "dp_pat_staging_",
  "scopes": ["deployments:write", "projects:read"],
  "expires_at": "2024-04-15T00:00:00Z",
  "created_at": "2024-01-15T10:00:00Z"
}
```

**Note:** The full token is only returned once at creation.

**Errors:** `400`, `401`, `403`, `422`

---

#### 17. DELETE `/user/me/api-keys/:id` — Delete API Key

Revoke and delete an API key.

| Attribute | Value |
|-----------|-------|
| Method | `DELETE` |
| Auth | Bearer token |
| Scopes | `user:write` |

**Response (204):** No content

**Errors:** `401`, `403`, `404`

---

#### 18. GET `/user/me/notifications` — List Notifications

Get user notifications.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `user:read` |
| Query | `?read=false&limit=20` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "notif_001",
      "type": "deployment_success",
      "title": "Deployment Successful",
      "message": "Project 'api-gateway' deployed to production.",
      "read": false,
      "data": {
        "project_id": "proj_xyz",
        "deployment_id": "dep_abc",
        "url": "https://api-gateway.devplatform.app"
      },
      "created_at": "2024-01-15T10:05:00Z"
    }
  ]
}
```

---

### Teams

**Base:** `/api/v3/teams`

#### 19. GET `/teams` — List Teams

List teams the user is a member of.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `team:read` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "team_xyz789",
      "name": "Platform Team",
      "slug": "platform-team",
      "description": "Core platform engineering team",
      "avatar_url": "https://cdn.devplatform.io/avatars/team_xyz789.png",
      "role": "admin",
      "member_count": 12,
      "plan": "team",
      "created_at": "2023-06-01T00:00:00Z",
      "updated_at": "2024-01-10T00:00:00Z"
    }
  ],
  "pagination": {
    "total_count": 3,
    "has_more": false
  }
}
```

---

#### 20. POST `/teams` — Create Team

Create a new team/organization.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `team:write` |

**Request Body:**

```json
{
  "name": "New Team",
  "slug": "new-team",
  "description": "A new engineering team",
  "plan": "pro"
}
```

**Response (201):**

```json
{
  "id": "team_new123",
  "name": "New Team",
  "slug": "new-team",
  "description": "A new engineering team",
  "avatar_url": null,
  "role": "admin",
  "member_count": 1,
  "plan": "pro",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Errors:** `400`, `401`, `403`, `409`, `422`

---

#### 21. GET `/teams/:id` — Get Team

Get a specific team's details.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `team:read` |

**Response (200):**

```json
{
  "id": "team_xyz789",
  "name": "Platform Team",
  "slug": "platform-team",
  "description": "Core platform engineering team",
  "avatar_url": "https://cdn.devplatform.io/avatars/team_xyz789.png",
  "role": "admin",
  "member_count": 12,
  "plan": "team",
  "settings": {
    "default_project_visibility": "private",
    "require_2fa": true,
    "allowed_email_domains": ["devplatform.io"],
    "sso_enabled": true
  },
  "quota": {
    "projects_used": 8,
    "projects_limit": 50,
    "members_used": 12,
    "members_limit": 50,
    "bandwidth_used_gb": 1200.5,
    "bandwidth_limit_gb": 2000
  },
  "created_at": "2023-06-01T00:00:00Z",
  "updated_at": "2024-01-10T00:00:00Z"
}
```

**Errors:** `401`, `403`, `404`

---

#### 22. PATCH `/teams/:id` — Update Team

Update team settings.

| Attribute | Value |
|-----------|-------|
| Method | `PATCH` |
| Auth | Bearer token |
| Scopes | `team:admin` |

**Request Body:**

```json
{
  "name": "Platform Engineering",
  "description": "Updated description",
  "settings": {
    "require_2fa": true,
    "allowed_email_domains": ["devplatform.io", "example.com"]
  }
}
```

**Response (200):** Updated team object

**Errors:** `400`, `401`, `403`, `404`, `422`

---

#### 23. DELETE `/teams/:id` — Delete Team

Delete a team and all associated resources.

| Attribute | Value |
|-----------|-------|
| Method | `DELETE` |
| Auth | Bearer token |
| Scopes | `team:admin` |

**Request Body:**

```json
{
  "confirmation": "DELETE platform-team"
}
```

**Response (204):** No content

**Errors:** `400`, `401`, `403`, `404`, `409`

---

#### 24. GET `/teams/:id/members` — List Members

List team members.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `team:read` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "usr_abc123",
      "email": "jane@example.com",
      "name": "Jane Developer",
      "role": "admin",
      "joined_at": "2023-06-01T00:00:00Z"
    },
    {
      "id": "usr_def456",
      "email": "john@example.com",
      "name": "John Engineer",
      "role": "member",
      "joined_at": "2023-08-15T00:00:00Z"
    }
  ]
}
```

---

#### 25. POST `/teams/:id/members` — Invite Member

Invite a user to the team.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `team:admin` |

**Request Body:**

```json
{
  "email": "newmember@example.com",
  "role": "member",
  "send_email": true
}
```

**Response (201):**

```json
{
  "id": "inv_abc123",
  "email": "newmember@example.com",
  "role": "member",
  "status": "pending",
  "expires_at": "2024-01-22T10:00:00Z",
  "created_at": "2024-01-15T10:00:00Z"
}
```

**Errors:** `400`, `401`, `403`, `409`, `422`

---

#### 26. PATCH `/teams/:id/members/:userId` — Update Member Role

Change a team member's role.

| Attribute | Value |
|-----------|-------|
| Method | `PATCH` |
| Auth | Bearer token |
| Scopes | `team:admin` |

**Request Body:**

```json
{
  "role": "admin"
}
```

**Response (200):** Updated member object

**Errors:** `400`, `401`, `403`, `404`, `422`

---

#### 27. DELETE `/teams/:id/members/:userId` — Remove Member

Remove a member from the team.

| Attribute | Value |
|-----------|-------|
| Method | `DELETE` |
| Auth | Bearer token |
| Scopes | `team:admin` |

**Response (204):** No content

**Errors:** `401`, `403`, `404`

---

### Projects

**Base:** `/api/v3/projects`

#### 28. GET `/projects` — List Projects

List projects accessible to the authenticated user.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `projects:read` |
| Query | `?team_id=team_xyz&status=active&limit=20` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "proj_abc123",
      "name": "API Gateway",
      "slug": "api-gateway",
      "description": "Main API gateway service",
      "status": "active",
      "visibility": "private",
      "team_id": "team_xyz789",
      "owner_id": "usr_abc123",
      "framework": "nextjs",
      "git_repository": {
        "provider": "github",
        "owner": "devplatform",
        "repo": "api-gateway",
        "branch": "main"
      },
      "default_environment_id": "env_prod001",
      "url": "https://api-gateway.devplatform.app",
      "created_at": "2023-08-15T10:30:00Z",
      "updated_at": "2024-01-10T14:22:00Z"
    }
  ],
  "pagination": {
    "total_count": 12,
    "has_more": true,
    "next_cursor": "cursor_string"
  }
}
```

---

#### 29. POST `/projects` — Create Project

Create a new project.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `projects:write` |

**Request Body:**

```json
{
  "name": "New Project",
  "slug": "new-project",
  "description": "A brand new project",
  "team_id": "team_xyz789",
  "visibility": "private",
  "framework": "nextjs",
  "git_repository": {
    "provider": "github",
    "owner": "myorg",
    "repo": "new-project",
    "branch": "main"
  },
  "build_command": "npm run build",
  "output_directory": "dist",
  "install_command": "npm ci",
  "environment_variables": {
    "NODE_ENV": "production",
    "API_URL": "https://api.example.com"
  }
}
```

**Response (201):**

```json
{
  "id": "proj_new123",
  "name": "New Project",
  "slug": "new-project",
  "description": "A brand new project",
  "status": "initializing",
  "visibility": "private",
  "team_id": "team_xyz789",
  "owner_id": "usr_abc123",
  "framework": "nextjs",
  "git_repository": {
    "provider": "github",
    "owner": "myorg",
    "repo": "new-project",
    "branch": "main"
  },
  "build_command": "npm run build",
  "output_directory": "dist",
  "install_command": "npm ci",
  "url": "https://new-project.devplatform.app",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Errors:** `400`, `401`, `403`, `409`, `422`

---

#### 30. GET `/projects/:id` — Get Project

Get project details.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `projects:read` |

**Response (200):** Full project object with additional fields:

```json
{
  "id": "proj_abc123",
  "name": "API Gateway",
  ...,
  "environments": [
    {
      "id": "env_prod001",
      "name": "Production",
      "slug": "production",
      "url": "https://api-gateway.devplatform.app",
      "status": "ready"
    },
    {
      "id": "env_stg001",
      "name": "Staging",
      "slug": "staging",
      "url": "https://api-gateway-staging.devplatform.app",
      "status": "ready"
    }
  ],
  "latest_deployment": {
    "id": "dep_latest",
    "status": "success",
    "commit_sha": "a1b2c3d",
    "created_at": "2024-01-15T09:00:00Z"
  },
  "analytics": {
    "total_requests_24h": 450230,
    "avg_response_time_ms": 45,
    "error_rate": 0.0012,
    "bandwidth_gb_24h": 12.5
  }
}
```

---

#### 31. PATCH `/projects/:id` — Update Project

Update project configuration.

| Attribute | Value |
|-----------|-------|
| Method | `PATCH` |
| Auth | Bearer token |
| Scopes | `projects:write` |

**Request Body:**

```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "build_command": "npm run build:prod",
  "environment_variables": {
    "NEW_VAR": "value"
  }
}
```

**Response (200):** Updated project object

**Errors:** `400`, `401`, `403`, `404`, `422`

---

#### 32. DELETE `/projects/:id` — Delete Project

Delete a project and all associated resources.

| Attribute | Value |
|-----------|-------|
| Method | `DELETE` |
| Auth | Bearer token |
| Scopes | `projects:admin` |

**Request Body:**

```json
{
  "confirmation": "DELETE api-gateway"
}
```

**Response (204):** No content

**Errors:** `400`, `401`, `403`, `404`

---

#### 33. POST `/projects/:id/deploy` — Trigger Deployment

Manually trigger a deployment.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `deployments:write` |

**Request Body:**

```json
{
  "environment_id": "env_prod001",
  "git_ref": "main",
  "commit_sha": "optional-specific-sha",
  "build_settings": {
    "build_command": "npm run build",
    "env": {
      "FEATURE_FLAG": "true"
    }
  }
}
```

**Response (202):**

```json
{
  "deployment_id": "dep_abc123",
  "status": "queued",
  "environment_id": "env_prod001",
  "queued_at": "2024-01-15T10:00:00Z",
  "estimated_duration_seconds": 120
}
```

**Errors:** `400`, `401`, `403`, `404`, `422`

---

#### 34. GET `/projects/:id/deployments` — List Deployments

List all deployments for a project.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `deployments:read` |
| Query | `?environment=production&status=success&limit=20` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "dep_abc123",
      "project_id": "proj_abc123",
      "environment_id": "env_prod001",
      "status": "success",
      "git_ref": "main",
      "commit_sha": "a1b2c3d4e5f6",
      "commit_message": "feat: add user authentication",
      "commit_author": "Jane Developer",
      "build_logs_url": "https://api.devplatform.io/api/v3/deployments/dep_abc123/logs",
      "preview_url": "https://api-gateway-git-main.devplatform.app",
      "duration_seconds": 95,
      "created_at": "2024-01-15T10:00:00Z",
      "started_at": "2024-01-15T10:00:05Z",
      "finished_at": "2024-01-15T10:01:40Z"
    }
  ],
  "pagination": {
    "total_count": 145,
    "has_more": true
  }
}
```

---

#### 35. GET `/projects/:id/env` — List Environment Variables

List all environment variables for a project.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `projects:read` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "envvar_001",
      "key": "DATABASE_URL",
      "value": "postgresql://...",  // Only visible to projects:admin
      "encrypted": true,
      "environment_ids": ["env_prod001", "env_stg001"],
      "created_at": "2023-08-15T10:30:00Z",
      "updated_at": "2024-01-10T14:22:00Z"
    }
  ]
}
```

---

#### 36. POST `/projects/:id/env` — Set Environment Variable

Create or update an environment variable.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `projects:admin` |

**Request Body:**

```json
{
  "key": "API_SECRET",
  "value": "super-secret-value",
  "environment_ids": ["env_prod001"]
}
```

**Response (201):**

```json
{
  "id": "envvar_002",
  "key": "API_SECRET",
  "encrypted": true,
  "environment_ids": ["env_prod001"],
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Errors:** `400`, `401`, `403`, `404`, `422`

---

#### 37. DELETE `/projects/:id/env/:key` — Delete Environment Variable

Delete an environment variable.

| Attribute | Value |
|-----------|-------|
| Method | `DELETE` |
| Auth | Bearer token |
| Scopes | `projects:admin` |

**Response (204):** No content

**Errors:** `401`, `403`, `404`

---

#### 38. GET `/projects/:id/analytics` — Project Analytics

Get project usage analytics.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `projects:read` |
| Query | `?from=2024-01-01&to=2024-01-15&granularity=1h` |

**Response (200):**

```json
{
  "period": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-01-15T23:59:59Z",
    "granularity": "1h"
  },
  "summary": {
    "total_requests": 12500000,
    "total_bandwidth_gb": 450.2,
    "avg_response_time_ms": 42,
    "p95_response_time_ms": 120,
    "p99_response_time_ms": 280,
    "error_rate": 0.0015,
    "unique_visitors": 125000
  },
  "timeseries": [
    {
      "timestamp": "2024-01-15T00:00:00Z",
      "requests": 52000,
      "bandwidth_mb": 1800,
      "response_time_ms": 40,
      "errors": 52,
      "unique_visitors": 5200
    }
  ],
  "top_paths": [
    { "path": "/api/v3/users", "requests": 2500000, "avg_latency_ms": 35 },
    { "path": "/api/v3/projects", "requests": 1800000, "avg_latency_ms": 28 }
  ],
  "top_referrers": [
    { "referrer": "https://app.devplatform.io", "visitors": 85000 }
  ],
  "top_countries": [
    { "country": "US", "requests": 5200000, "bandwidth_gb": 187.5 }
  ]
}
```

---

#### 39. POST `/projects/:id/transfer` — Transfer Project

Transfer project ownership to another team or user.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `projects:admin` |

**Request Body:**

```json
{
  "target_team_id": "team_new456",
  "confirmation": "TRANSFER api-gateway TO Platform Team 2"
}
```

**Response (200):**

```json
{
  "id": "proj_abc123",
  "team_id": "team_new456",
  "transferred_at": "2024-01-15T10:00:00Z"
}
```

**Errors:** `400`, `401`, `403`, `404`, `409`

---

### Deployments

**Base:** `/api/v3/deployments`

#### 40. GET `/deployments/:id` — Get Deployment

Get deployment details.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `deployments:read` |

**Response (200):**

```json
{
  "id": "dep_abc123",
  "project_id": "proj_abc123",
  "project_name": "API Gateway",
  "environment_id": "env_prod001",
  "environment_name": "Production",
  "status": "success",
  "git_ref": "main",
  "commit_sha": "a1b2c3d4e5f6",
  "commit_message": "feat: add user authentication",
  "commit_author": "Jane Developer",
  "commit_author_avatar": "https://avatars.githubusercontent.com/u/12345",
  "build": {
    "command": "npm run build",
    "output_directory": ".next",
    "install_command": "npm ci",
    "env_count": 12
  },
  "build_logs_url": "https://api.devplatform.io/api/v3/deployments/dep_abc123/logs",
  "preview_url": "https://api-gateway-git-main.devplatform.app",
  "production_url": "https://api-gateway.devplatform.app",
  "duration_seconds": 95,
  "build_metrics": {
    "install_time_ms": 15000,
    "build_time_ms": 65000,
    "deploy_time_ms": 15000,
    "total_time_ms": 95000
  },
  "rollback_available": true,
  "previous_deployment_id": "dep_prev789",
  "created_at": "2024-01-15T10:00:00Z",
  "started_at": "2024-01-15T10:00:05Z",
  "finished_at": "2024-01-15T10:01:40Z"
}
```

**Errors:** `401`, `403`, `404`

---

#### 41. GET `/deployments/:id/logs` — Get Build Logs

Get streaming build logs for a deployment.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `deployments:read` |
| Query | `?format=json&from_line=0` |

**Response (200):**

```json
{
  "deployment_id": "dep_abc123",
  "status": "success",
  "total_lines": 245,
  "lines": [
    {
      "line_number": 1,
      "timestamp": "2024-01-15T10:00:05.123Z",
      "level": "info",
      "message": "Cloning repository..."
    },
    {
      "line_number": 2,
      "timestamp": "2024-01-15T10:00:06.456Z",
      "level": "info",
      "message": "Installing dependencies..."
    },
    {
      "line_number": 245,
      "timestamp": "2024-01-15T10:01:40.789Z",
      "level": "success",
      "message": "Deployment successful!"
    }
  ]
}
```

---

#### 42. GET `/deployments/:id/logs/stream` — Stream Build Logs

Stream build logs in real-time using Server-Sent Events.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `deployments:read` |
| Headers | `Accept: text/event-stream` |

**Response:** Server-Sent Events stream

```
event: log
data: {"line_number":246,"timestamp":"2024-01-15T10:01:41.000Z","level":"info","message":"Cleaning up..."}

event: status
data: {"status":"success","finished_at":"2024-01-15T10:01:42.000Z"}

event: done
data: {}
```

---

#### 43. POST `/deployments/:id/cancel` — Cancel Deployment

Cancel a running or queued deployment.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `deployments:write` |

**Response (200):**

```json
{
  "id": "dep_abc123",
  "status": "cancelled",
  "cancelled_at": "2024-01-15T10:00:30Z"
}
```

**Errors:** `400`, `401`, `403`, `404`, `409`

---

#### 44. POST `/deployments/:id/rollback` — Rollback Deployment

Rollback to a previous deployment.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `deployments:write` |

**Request Body:**

```json
{
  "reason": "Critical bug in latest deployment",
  "immediate": true
}
```

**Response (202):**

```json
{
  "rollback_deployment_id": "dep_roll456",
  "target_deployment_id": "dep_prev789",
  "status": "in_progress",
  "reason": "Critical bug in latest deployment",
  "estimated_duration_seconds": 30
}
```

**Errors:** `400`, `401`, `403`, `404`, `409`

---

#### 45. GET `/deployments/:id/files` — List Deployment Files

List files in a deployment.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `deployments:read` |

**Response (200):**

```json
{
  "deployment_id": "dep_abc123",
  "files": [
    {
      "path": "/index.html",
      "size": 4523,
      "content_type": "text/html",
      "sha256": "abc123..."
    },
    {
      "path": "/static/js/main.js",
      "size": 125000,
      "content_type": "application/javascript",
      "sha256": "def456..."
    }
  ],
  "total_files": 45,
  "total_size_bytes": 1520345
}
```

---

#### 46. GET `/deployments/:id/files/*` — Get File Content

Get the content of a specific file in a deployment.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `deployments:read` |

**Response (200):** Raw file content with appropriate `Content-Type`

---

#### 47. GET `/deployments/:id/artifacts` — List Build Artifacts

List build artifacts for a deployment.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `deployments:read` |

**Response (200):**

```json
{
  "deployment_id": "dep_abc123",
  "artifacts": [
    {
      "id": "art_001",
      "name": "build-output.zip",
      "size": 1520345,
      "content_type": "application/zip",
      "download_url": "https://storage.devplatform.io/artifacts/art_001",
      "expires_at": "2024-02-15T00:00:00Z",
      "created_at": "2024-01-15T10:01:40Z"
    }
  ]
}
```

---

#### 48. POST `/deployments/:id/promote` — Promote Deployment

Promote a deployment to another environment.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `deployments:write` |

**Request Body:**

```json
{
  "target_environment_id": "env_prod001",
  "skip_tests": false
}
```

**Response (202):**

```json
{
  "promotion_deployment_id": "dep_promo789",
  "source_deployment_id": "dep_abc123",
  "target_environment_id": "env_prod001",
  "status": "queued",
  "queued_at": "2024-01-15T10:00:00Z"
}
```

**Errors:** `400`, `401`, `403`, `404`, `409`

---

#### 49. DELETE `/deployments/:id` — Delete Deployment

Delete a deployment (only failed/cancelled deployments).

| Attribute | Value |
|-----------|-------|
| Method | `DELETE` |
| Auth | Bearer token |
| Scopes | `deployments:write` |

**Response (204):** No content

**Errors:** `400`, `401`, `403`, `404`, `409`

---

### Environments

**Base:** `/api/v3/environments`

#### 50. GET `/environments` — List Environments

List environments for a project.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `projects:read` |
| Query | `?project_id=proj_abc123` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "env_prod001",
      "project_id": "proj_abc123",
      "name": "Production",
      "slug": "production",
      "type": "production",
      "url": "https://api-gateway.devplatform.app",
      "status": "ready",
      "auto_deploy": true,
      "git_branch": "main",
      "env_vars_count": 15,
      "last_deployment_id": "dep_abc123",
      "created_at": "2023-08-15T10:30:00Z",
      "updated_at": "2024-01-10T14:22:00Z"
    },
    {
      "id": "env_stg001",
      "project_id": "proj_abc123",
      "name": "Staging",
      "slug": "staging",
      "type": "preview",
      "url": "https://api-gateway-staging.devplatform.app",
      "status": "ready",
      "auto_deploy": true,
      "git_branch": "develop",
      "env_vars_count": 10,
      "last_deployment_id": "dep_stg456",
      "created_at": "2023-08-15T10:30:00Z",
      "updated_at": "2024-01-10T14:22:00Z"
    }
  ]
}
```

---

#### 51. POST `/environments` — Create Environment

Create a new environment.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `projects:write` |

**Request Body:**

```json
{
  "project_id": "proj_abc123",
  "name": "QA",
  "slug": "qa",
  "type": "preview",
  "git_branch": "qa",
  "auto_deploy": true,
  "env_vars": {
    "NODE_ENV": "qa",
    "DEBUG": "true"
  }
}
```

**Response (201):**

```json
{
  "id": "env_qa001",
  "project_id": "proj_abc123",
  "name": "QA",
  "slug": "qa",
  "type": "preview",
  "url": "https://api-gateway-qa.devplatform.app",
  "status": "provisioning",
  "auto_deploy": true,
  "git_branch": "qa",
  "env_vars_count": 2,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Errors:** `400`, `401`, `403`, `404`, `409`, `422`

---

#### 52. GET `/environments/:id` — Get Environment

Get environment details.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `projects:read` |

**Response (200):** Full environment object

---

#### 53. PATCH `/environments/:id` — Update Environment

Update environment configuration.

| Attribute | Value |
|-----------|-------|
| Method | `PATCH` |
| Auth | Bearer token |
| Scopes | `projects:write` |

**Request Body:**

```json
{
  "name": "QA Environment",
  "auto_deploy": false,
  "git_branch": "qa-branch"
}
```

**Response (200):** Updated environment object

**Errors:** `400`, `401`, `403`, `404`, `422`

---

#### 54. DELETE `/environments/:id` — Delete Environment

Delete an environment.

| Attribute | Value |
|-----------|-------|
| Method | `DELETE` |
| Auth | Bearer token |
| Scopes | `projects:admin` |

**Response (204):** No content

**Errors:** `401`, `403`, `404`, `409`

---

#### 55. POST `/environments/:id/deploy` — Deploy to Environment

Trigger a deployment to a specific environment.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `deployments:write` |

**Request Body:**

```json
{
  "git_ref": "main",
  "commit_sha": "optional-sha"
}
```

**Response (202):**

```json
{
  "deployment_id": "dep_env789",
  "environment_id": "env_prod001",
  "status": "queued",
  "queued_at": "2024-01-15T10:00:00Z"
}
```

**Errors:** `400`, `401`, `403`, `404`

---

#### 56. GET `/environments/:id/variables` — List Environment Variables

List environment-specific variables.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `projects:read` |

**Response (200):**

```json
{
  "environment_id": "env_prod001",
  "data": [
    {
      "key": "DATABASE_URL",
      "value": "***encrypted***",
      "encrypted": true
    },
    {
      "key": "API_URL",
      "value": "https://api.example.com",
      "encrypted": false
    }
  ]
}
```

---

#### 57. POST `/environments/:id/variables` — Set Environment Variable

Set an environment-specific variable.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `projects:admin` |

**Request Body:**

```json
{
  "key": "FEATURE_FLAG",
  "value": "enabled",
  "encrypted": false
}
```

**Response (201):** Variable object

**Errors:** `400`, `401`, `403`, `404`, `422`

---

### Domains

**Base:** `/api/v3/domains`

#### 58. GET `/domains` — List Domains

List custom domains for a project.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `domains:read` |
| Query | `?project_id=proj_abc123` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "dom_abc123",
      "project_id": "proj_abc123",
      "domain": "api.example.com",
      "status": "active",
      "ssl_status": "active",
      "ssl_expires_at": "2024-07-15T00:00:00Z",
      "auto_ssl": true,
      "redirect": {
        "enabled": false,
        "target": null
      },
      "verification": {
        "type": "dns",
        "record_type": "CNAME",
        "record_name": "api.example.com",
        "record_value": "cname.devplatform.app",
        "verified": true
      },
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

#### 59. POST `/domains` — Add Domain

Add a custom domain to a project.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `domains:write` |

**Request Body:**

```json
{
  "project_id": "proj_abc123",
  "domain": "api.example.com",
  "auto_ssl": true,
  "environment_id": "env_prod001"
}
```

**Response (201):**

```json
{
  "id": "dom_new456",
  "project_id": "proj_abc123",
  "domain": "api.example.com",
  "status": "pending_verification",
  "ssl_status": "pending",
  "auto_ssl": true,
  "verification": {
    "type": "dns",
    "record_type": "CNAME",
    "record_name": "api.example.com",
    "record_value": "cname.devplatform.app",
    "verified": false,
    "instructions": "Add a CNAME record for 'api.example.com' pointing to 'cname.devplatform.app'"
  },
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Errors:** `400`, `401`, `403`, `404`, `409`, `422`

---

#### 60. GET `/domains/:id` — Get Domain

Get domain details and status.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `domains:read` |

**Response (200):** Full domain object

**Errors:** `401`, `403`, `404`

---

#### 61. POST `/domains/:id/verify` — Verify Domain

Trigger domain verification.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `domains:write` |

**Response (200):**

```json
{
  "id": "dom_abc123",
  "domain": "api.example.com",
  "status": "active",
  "verification": {
    "verified": true,
    "verified_at": "2024-01-15T10:05:00Z"
  },
  "ssl_status": "active"
}
```

**Errors:** `400`, `401`, `403`, `404`

---

#### 62. POST `/domains/:id/ssl` — Request SSL Certificate

Manually trigger SSL certificate provisioning.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `domains:write` |

**Response (202):**

```json
{
  "id": "dom_abc123",
  "ssl_status": "provisioning",
  "message": "SSL certificate provisioning started. This may take a few minutes."
}
```

**Errors:** `400`, `401`, `403`, `404`

---

#### 63. DELETE `/domains/:id` — Remove Domain

Remove a custom domain from a project.

| Attribute | Value |
|-----------|-------|
| Method | `DELETE` |
| Auth | Bearer token |
| Scopes | `domains:write` |

**Response (204):** No content

**Errors:** `401`, `403`, `404`

---

### Webhooks API

**Base:** `/api/v3/webhooks`

#### 64. GET `/webhooks` — List Webhooks

List configured outgoing webhooks.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `webhooks:read` |
| Query | `?project_id=proj_abc123&event_type=deployment.success` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "wh_abc123",
      "project_id": "proj_abc123",
      "name": "Slack Notifications",
      "url": "https://hooks.slack.com/services/T000/B000/XXXX",
      "events": ["deployment.success", "deployment.failed"],
      "active": true,
      "secret": "whsec_xxxxxxxxxxxx",
      "headers": {
        "X-Custom-Header": "value"
      },
      "retry_policy": {
        "max_retries": 3,
        "retry_interval_seconds": 60
      },
      "last_triggered_at": "2024-01-15T09:00:00Z",
      "last_status": "success",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-10T00:00:00Z"
    }
  ],
  "pagination": {
    "total_count": 5,
    "has_more": false
  }
}
```

---

#### 65. POST `/webhooks` — Create Webhook

Create a new outgoing webhook.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `webhooks:write` |

**Request Body:**

```json
{
  "project_id": "proj_abc123",
  "name": "CI/CD Pipeline",
  "url": "https://ci.example.com/webhook",
  "events": ["deployment.success", "deployment.failed"],
  "active": true,
  "secret": "my-webhook-secret",
  "headers": {
    "Authorization": "Bearer ci-token"
  },
  "retry_policy": {
    "max_retries": 5,
    "retry_interval_seconds": 30
  }
}
```

**Response (201):**

```json
{
  "id": "wh_new456",
  "project_id": "proj_abc123",
  "name": "CI/CD Pipeline",
  "url": "https://ci.example.com/webhook",
  "events": ["deployment.success", "deployment.failed"],
  "active": true,
  "secret": "whsec_xxxxxxxxxxxx",
  "headers": {
    "Authorization": "Bearer ci-token"
  },
  "retry_policy": {
    "max_retries": 5,
    "retry_interval_seconds": 30
  },
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Errors:** `400`, `401`, `403`, `404`, `422`

---

#### 66. GET `/webhooks/:id` — Get Webhook

Get webhook configuration.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `webhooks:read` |

**Response (200):** Full webhook object (secret redacted)

**Errors:** `401`, `403`, `404`

---

#### 67. PATCH `/webhooks/:id` — Update Webhook

Update webhook configuration.

| Attribute | Value |
|-----------|-------|
| Method | `PATCH` |
| Auth | Bearer token |
| Scopes | `webhooks:write` |

**Request Body:**

```json
{
  "name": "Updated Name",
  "url": "https://new-ci.example.com/webhook",
  "events": ["deployment.success"],
  "active": false
}
```

**Response (200):** Updated webhook object

**Errors:** `400`, `401`, `403`, `404`, `422`

---

#### 68. DELETE `/webhooks/:id` — Delete Webhook

Delete a webhook.

| Attribute | Value |
|-----------|-------|
| Method | `DELETE` |
| Auth | Bearer token |
| Scopes | `webhooks:write` |

**Response (204):** No content

**Errors:** `401`, `403`, `404`

---

#### 69. POST `/webhooks/:id/test` — Test Webhook

Send a test payload to a webhook.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `webhooks:write` |

**Response (200):**

```json
{
  "success": true,
  "status_code": 200,
  "response_body": "ok",
  "response_time_ms": 245,
  "timestamp": "2024-01-15T10:00:00Z"
}
```

**Errors:** `400`, `401`, `403`, `404`

---

#### 70. GET `/webhooks/:id/deliveries` — List Deliveries

List webhook delivery attempts.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `webhooks:read` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "whd_001",
      "webhook_id": "wh_abc123",
      "event_type": "deployment.success",
      "event_id": "evt_001",
      "status": "delivered",
      "http_status_code": 200,
      "response_body": "ok",
      "response_time_ms": 245,
      "attempt": 1,
      "created_at": "2024-01-15T09:00:00Z",
      "completed_at": "2024-01-15T09:00:01Z"
    },
    {
      "id": "whd_002",
      "webhook_id": "wh_abc123",
      "event_type": "deployment.failed",
      "event_id": "evt_002",
      "status": "failed",
      "http_status_code": 500,
      "response_body": "Internal Server Error",
      "response_time_ms": 5000,
      "attempt": 3,
      "created_at": "2024-01-15T08:00:00Z",
      "completed_at": "2024-01-15T08:02:30Z",
      "error": "Max retries exceeded"
    }
  ]
}
```

---

#### 71. POST `/webhooks/:id/redeliver` — Redeliver Event

Redeliver a failed webhook event.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `webhooks:write` |

**Request Body:**

```json
{
  "delivery_id": "whd_002"
}
```

**Response (202):**

```json
{
  "new_delivery_id": "whd_003",
  "status": "queued"
}
```

**Errors:** `400`, `401`, `403`, `404`

---

#### 72. GET `/webhooks/events` — List Event Types

List all available webhook event types.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `webhooks:read` |

**Response (200):**

```json
{
  "events": [
    {
      "type": "deployment.success",
      "description": "Triggered when a deployment completes successfully",
      "category": "deployments",
      "payload_schema": "https://docs.devplatform.io/schemas/webhooks/deployment.success"
    },
    {
      "type": "deployment.failed",
      "description": "Triggered when a deployment fails",
      "category": "deployments",
      "payload_schema": "https://docs.devplatform.io/schemas/webhooks/deployment.failed"
    },
    {
      "type": "deployment.cancelled",
      "description": "Triggered when a deployment is cancelled",
      "category": "deployments"
    },
    {
      "type": "deployment.started",
      "description": "Triggered when a deployment starts",
      "category": "deployments"
    },
    {
      "type": "domain.verified",
      "description": "Triggered when a domain is verified",
      "category": "domains"
    },
    {
      "type": "domain.ssl.renewed",
      "description": "Triggered when an SSL certificate is renewed",
      "category": "domains"
    },
    {
      "type": "project.created",
      "description": "Triggered when a project is created",
      "category": "projects"
    },
    {
      "type": "project.updated",
      "description": "Triggered when a project is updated",
      "category": "projects"
    },
    {
      "type": "team.member.invited",
      "description": "Triggered when a team member is invited",
      "category": "teams"
    },
    {
      "type": "team.member.joined",
      "description": "Triggered when a team member accepts an invitation",
      "category": "teams"
    }
  ]
}
```

---

#### 73. POST `/webhooks/incoming/:token` — Receive Incoming Webhook

Receive incoming webhooks from external platforms (GitHub, GitLab, etc.).

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Token in URL path |
| Rate Limit | 100/min per token |

**Request Headers:**

```http
X-GitHub-Event: push
X-GitHub-Delivery: 72d3162e-cc78-11e3-81ab-4c9367dc0958
X-Hub-Signature-256: sha256=xxxxxxx
```

**Response (202):**

```json
{
  "received": true,
  "event_id": "evt_abc123",
  "processed": true
}
```

**Errors:** `400`, `401`, `404`

---

### Billing

**Base:** `/api/v3/billing`

#### 74. GET `/billing` — Get Billing Info

Get billing information for the current team.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `billing:read` |
| Query | `?team_id=team_xyz789` |

**Response (200):**

```json
{
  "team_id": "team_xyz789",
  "plan": {
    "id": "team",
    "name": "Team",
    "price_monthly": 79,
    "price_yearly": 790,
    "features": [
      "Unlimited projects",
      "50 team members",
      "2 TB bandwidth",
      "Priority support"
    ]
  },
  "billing_cycle": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z",
    "interval": "monthly"
  },
  "payment_method": {
    "type": "card",
    "brand": "visa",
    "last_four": "4242",
    "exp_month": 12,
    "exp_year": 2026
  },
  "balance": {
    "currency": "usd",
    "available": 0.00,
    "pending": 0.00
  },
  "usage": {
    "projects": { "used": 8, "limit": 50, "overage": 0 },
    "members": { "used": 12, "limit": 50, "overage": 0 },
    "bandwidth_gb": { "used": 1200.5, "limit": 2048, "overage": 0 },
    "build_minutes": { "used": 4500, "limit": 10000, "overage": 0 }
  },
  "invoice_settings": {
    "email": "billing@example.com",
    "automatic_tax": true,
    "default_payment_method": "card"
  }
}
```

---

#### 75. GET `/billing/invoices` — List Invoices

List billing invoices.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `billing:read` |
| Query | `?team_id=team_xyz789&status=paid&limit=20` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "inv_abc123",
      "team_id": "team_xyz789",
      "number": "INV-2024-0012",
      "status": "paid",
      "currency": "usd",
      "subtotal": 79.00,
      "tax": 6.32,
      "total": 85.32,
      "amount_paid": 85.32,
      "amount_due": 0.00,
      "period_start": "2024-01-01T00:00:00Z",
      "period_end": "2024-01-31T23:59:59Z",
      "pdf_url": "https://billing.devplatform.io/invoices/inv_abc123.pdf",
      "line_items": [
        {
          "description": "Team Plan - Monthly",
          "quantity": 1,
          "unit_price": 79.00,
          "amount": 79.00
        }
      ],
      "created_at": "2024-02-01T00:00:00Z",
      "paid_at": "2024-02-01T00:01:00Z"
    }
  ],
  "pagination": {
    "total_count": 12,
    "has_more": false
  }
}
```

---

#### 76. GET `/billing/invoices/:id` — Get Invoice

Get a specific invoice.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `billing:read` |

**Response (200):** Full invoice object with line items

**Errors:** `401`, `403`, `404`

---

#### 77. GET `/billing/invoices/:id/pdf` — Download Invoice PDF

Download invoice as PDF.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `billing:read` |
| Response | `Content-Type: application/pdf` |

**Errors:** `401`, `403`, `404`

---

#### 78. POST `/billing/payment-methods` — Add Payment Method

Add a new payment method.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `billing:write` |

**Request Body:**

```json
{
  "team_id": "team_xyz789",
  "type": "card",
  "payment_method_id": "pm_stripe_xxxxxx",
  "set_default": true
}
```

**Response (201):**

```json
{
  "id": "pm_abc123",
  "type": "card",
  "brand": "visa",
  "last_four": "4242",
  "exp_month": 12,
  "exp_year": 2026,
  "is_default": true,
  "created_at": "2024-01-15T10:00:00Z"
}
```

**Errors:** `400`, `401`, `403`, `422`

---

#### 79. DELETE `/billing/payment-methods/:id` — Remove Payment Method

Remove a payment method.

| Attribute | Value |
|-----------|-------|
| Method | `DELETE` |
| Auth | Bearer token |
| Scopes | `billing:write` |

**Response (204):** No content

**Errors:** `401`, `403`, `404`, `409`

---

#### 80. POST `/billing/plan/change` — Change Plan

Change the team's subscription plan.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `billing:write` |

**Request Body:**

```json
{
  "team_id": "team_xyz789",
  "plan_id": "enterprise",
  "interval": "yearly",
  "proration_behavior": "create_prorations"
}
```

**Response (200):**

```json
{
  "team_id": "team_xyz789",
  "plan": {
    "id": "enterprise",
    "name": "Enterprise",
    "price_monthly": 299,
    "price_yearly": 2990
  },
  "effective_date": "2024-01-15T10:00:00Z",
  "proration": {
    "amount": 146.67,
    "currency": "usd",
    "invoice_id": "inv_prorated123"
  }
}
```

**Errors:** `400`, `401`, `403`, `404`, `422`

---

#### 81. POST `/billing/cancel` — Cancel Subscription

Cancel the team's subscription.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `billing:write` |

**Request Body:**

```json
{
  "team_id": "team_xyz789",
  "at_period_end": true,
  "reason": "Switching to self-hosted"
}
```

**Response (200):**

```json
{
  "status": "cancelled",
  "effective_at": "2024-01-31T23:59:59Z",
  "reason": "Switching to self-hosted"
}
```

**Errors:** `400`, `401`, `403`, `404`

---

#### 82. POST `/billing/reactivate` — Reactivate Subscription

Reactivate a cancelled subscription.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `billing:write` |

**Response (200):**

```json
{
  "status": "active",
  "current_period_end": "2024-02-29T23:59:59Z"
}
```

**Errors:** `401`, `403`, `404`, `409`

---

#### 83. GET `/billing/usage` — Get Usage

Get detailed usage metrics for the billing period.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `billing:read` |
| Query | `?team_id=team_xyz789&granularity=1d` |

**Response (200):**

```json
{
  "team_id": "team_xyz789",
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "summary": {
    "bandwidth_gb": 1200.5,
    "build_minutes": 4500,
    "deployments": 145,
    "requests": 12500000
  },
  "daily": [
    {
      "date": "2024-01-15T00:00:00Z",
      "bandwidth_gb": 45.2,
      "build_minutes": 180,
      "deployments": 8,
      "requests": 450000
    }
  ]
}
```

---

#### 84. GET `/billing/plans` — List Available Plans

List all available subscription plans.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |

**Response (200):**

```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "description": "For personal projects and experimentation",
      "price_monthly": 0,
      "price_yearly": 0,
      "features": [
        "3 projects",
        "1 team member",
        "10 GB bandwidth",
        "Community support"
      ],
      "limits": {
        "projects": 3,
        "members": 1,
        "bandwidth_gb": 10,
        "build_minutes": 100
      }
    },
    {
      "id": "pro",
      "name": "Pro",
      "description": "For professional developers",
      "price_monthly": 29,
      "price_yearly": 290,
      "features": [
        "20 projects",
        "10 team members",
        "500 GB bandwidth",
        "Email support"
      ],
      "limits": {
        "projects": 20,
        "members": 10,
        "bandwidth_gb": 500,
        "build_minutes": 2500
      }
    },
    {
      "id": "team",
      "name": "Team",
      "description": "For growing teams",
      "price_monthly": 79,
      "price_yearly": 790,
      "features": [
        "Unlimited projects",
        "50 team members",
        "2 TB bandwidth",
        "Priority support"
      ]
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "description": "For large organizations",
      "price_monthly": null,
      "price_yearly": null,
      "contact_sales": true,
      "features": [
        "Unlimited everything",
        "SSO & SAML",
        "Custom contracts",
        "Dedicated support",
        "SLA guarantee"
      ]
    }
  ]
}
```

---

#### 85. POST `/billing/checkout` — Create Checkout Session

Create a Stripe Checkout session for plan upgrade.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `billing:write` |

**Request Body:**

```json
{
  "team_id": "team_xyz789",
  "plan_id": "team",
  "interval": "yearly",
  "success_url": "https://app.devplatform.io/billing/success",
  "cancel_url": "https://app.devplatform.io/billing/cancel"
}
```

**Response (200):**

```json
{
  "session_id": "cs_live_xxxxxx",
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_live_xxxxxx",
  "expires_at": 1705315200
}
```

**Errors:** `400`, `401`, `403`, `404`

---

### Integrations

**Base:** `/api/v3/integrations`

#### 86. GET `/integrations` — List Integrations

List available third-party integrations.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |

**Response (200):**

```json
{
  "data": [
    {
      "id": "github",
      "name": "GitHub",
      "description": "Connect your GitHub repositories",
      "icon_url": "https://cdn.devplatform.io/icons/github.svg",
      "category": "source_control",
      "connected": true,
      "installed_at": "2023-08-15T10:30:00Z"
    },
    {
      "id": "slack",
      "name": "Slack",
      "description": "Send notifications to Slack channels",
      "icon_url": "https://cdn.devplatform.io/icons/slack.svg",
      "category": "notifications",
      "connected": false
    }
  ]
}
```

---

#### 87. GET `/integrations/:id` — Get Integration

Get integration details and configuration.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |

**Response (200):**

```json
{
  "id": "github",
  "name": "GitHub",
  "connected": true,
  "connection": {
    "account": "devplatform",
    "avatar_url": "https://avatars.githubusercontent.com/u/12345",
    "repositories": [
      {
        "id": 123456,
        "name": "api-gateway",
        "full_name": "devplatform/api-gateway",
        "private": true,
        "default_branch": "main",
        "permissions": {
          "admin": true,
          "push": true,
          "pull": true
        }
      }
    ]
  },
  "webhook_secret": "ghp_xxxxxxxxxxxx"
}
```

**Errors:** `401`, `403`, `404`

---

#### 88. POST `/integrations/:id/connect` — Connect Integration

Connect a third-party integration.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |

**Request Body:**

```json
{
  "code": "oauth-code-from-provider",
  "redirect_uri": "https://app.devplatform.io/integrations/github/callback"
}
```

**Response (201):**

```json
{
  "id": "github",
  "connected": true,
  "account": "devplatform"
}
```

**Errors:** `400`, `401`, `403`, `404`

---

#### 89. DELETE `/integrations/:id` — Disconnect Integration

Disconnect a third-party integration.

| Attribute | Value |
|-----------|-------|
| Method | `DELETE` |
| Auth | Bearer token |

**Response (204):** No content

**Errors:** `401`, `403`, `404`

---

#### 90. GET `/integrations/:id/repos` — List Repositories

List repositories from a connected integration.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Query | `?search=api&page=1` |

**Response (200):**

```json
{
  "data": [
    {
      "id": 123456,
      "name": "api-gateway",
      "full_name": "devplatform/api-gateway",
      "description": "Main API gateway",
      "private": true,
      "url": "https://github.com/devplatform/api-gateway",
      "default_branch": "main",
      "language": "TypeScript",
      "stars": 45,
      "permissions": {
        "admin": true,
        "push": true,
        "pull": true
      }
    }
  ],
  "pagination": {
    "total_count": 25,
    "has_more": true
  }
}
```

---

#### 91. POST `/integrations/:id/sync` — Sync Integration

Trigger a manual sync of integration data.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |

**Response (202):**

```json
{
  "sync_id": "sync_abc123",
  "status": "in_progress",
  "started_at": "2024-01-15T10:00:00Z"
}
```

**Errors:** `401`, `403`, `404`

---

#### 92. GET `/integrations/:id/sync/:syncId` — Get Sync Status

Check the status of an integration sync.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |

**Response (200):**

```json
{
  "sync_id": "sync_abc123",
  "status": "completed",
  "started_at": "2024-01-15T10:00:00Z",
  "completed_at": "2024-01-15T10:00:30Z",
  "stats": {
    "repositories_synced": 25,
    "pull_requests_synced": 150,
    "issues_synced": 320
  }
}
```

**Errors:** `401`, `403`, `404`

---

#### 93. GET `/integrations/:id/webhooks` — List Integration Webhooks

List webhooks configured for an integration.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |

**Response (200):**

```json
{
  "data": [
    {
      "id": "ihw_001",
      "integration_id": "github",
      "repository": "devplatform/api-gateway",
      "events": ["push", "pull_request"],
      "active": true,
      "url": "https://api.devplatform.io/api/v3/webhooks/incoming/gh_xxxx",
      "created_at": "2023-08-15T10:30:00Z"
    }
  ]
}
```

---

### Monitoring

**Base:** `/api/v3/monitoring`

#### 94. GET `/monitoring/health` — Health Check

Check API health status.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | None |

**Response (200):**

```json
{
  "status": "healthy",
  "version": "3.2.1",
  "timestamp": "2024-01-15T10:00:00Z",
  "services": {
    "api": "healthy",
    "database": "healthy",
    "redis": "healthy",
    "queue": "healthy",
    "storage": "healthy"
  },
  "uptime_seconds": 86400,
  "request_count_24h": 1250000
}
```

---

#### 95. GET `/monitoring/metrics` — Get Metrics

Get Prometheus-compatible metrics.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `monitoring:read` |
| Headers | `Accept: text/plain` or `Accept: application/json` |

**Response (200) — JSON format:**

```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "metrics": {
    "http_requests_total": 12500000,
    "http_request_duration_ms": {
      "count": 12500000,
      "sum": 525000000,
      "avg": 42,
      "p50": 30,
      "p95": 120,
      "p99": 280
    },
    "active_connections": 2345,
    "queue_depth": 12,
    "database_connections_active": 45,
    "cache_hit_rate": 0.94
  }
}
```

---

#### 96. GET `/monitoring/logs` — Query Logs

Query application logs.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `monitoring:read` |
| Query | `?project_id=proj_abc&level=error&from=2024-01-15T00:00:00Z&limit=100` |

**Response (200):**

```json
{
  "data": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "level": "error",
      "message": "Database connection timeout",
      "source": "api",
      "service": "projects",
      "trace_id": "trace_abc123",
      "span_id": "span_def456",
      "metadata": {
        "duration_ms": 5000,
        "query": "SELECT * FROM projects WHERE id = $1"
      }
    }
  ],
  "pagination": {
    "total_count": 523,
    "has_more": true
  }
}
```

---

#### 97. GET `/monitoring/traces/:traceId` — Get Trace

Get distributed trace details.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `monitoring:read` |

**Response (200):**

```json
{
  "trace_id": "trace_abc123",
  "duration_ms": 245,
  "spans": [
    {
      "span_id": "span_001",
      "parent_span_id": null,
      "name": "GET /api/v3/projects/proj_abc123",
      "service": "api",
      "start_time": "2024-01-15T10:00:00.000Z",
      "end_time": "2024-01-15T10:00:00.245Z",
      "duration_ms": 245,
      "status": "ok",
      "attributes": {
        "http.method": "GET",
        "http.path": "/api/v3/projects/proj_abc123",
        "http.status_code": 200
      }
    },
    {
      "span_id": "span_002",
      "parent_span_id": "span_001",
      "name": "db.query",
      "service": "database",
      "start_time": "2024-01-15T10:00:00.010Z",
      "end_time": "2024-01-15T10:00:00.045Z",
      "duration_ms": 35,
      "status": "ok",
      "attributes": {
        "db.statement": "SELECT * FROM projects WHERE id = $1",
        "db.rows": 1
      }
    }
  ]
}
```

---

#### 98. GET `/monitoring/alerts` — List Alerts

List configured monitoring alerts.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `monitoring:read` |
| Query | `?project_id=proj_abc&status=firing` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "alert_001",
      "name": "High Error Rate",
      "description": "Error rate exceeds 1% for 5 minutes",
      "severity": "critical",
      "condition": {
        "metric": "http_error_rate",
        "operator": "gt",
        "threshold": 0.01,
        "duration": "5m"
      },
      "status": "firing",
      "fired_at": "2024-01-15T09:55:00Z",
      "resolved_at": null,
      "notifications": [
        {
          "channel": "email",
          "destination": "oncall@example.com"
        },
        {
          "channel": "slack",
          "destination": "#alerts"
        }
      ]
    }
  ]
}
```

---

#### 99. POST `/monitoring/alerts` — Create Alert

Create a new monitoring alert.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `monitoring:read` |

**Request Body:**

```json
{
  "project_id": "proj_abc123",
  "name": "High Latency",
  "description": "P95 latency exceeds 500ms for 10 minutes",
  "severity": "warning",
  "condition": {
    "metric": "http_request_duration_p95",
    "operator": "gt",
    "threshold": 500,
    "duration": "10m"
  },
  "notifications": [
    {
      "channel": "slack",
      "destination": "#performance"
    }
  ]
}
```

**Response (201):**

```json
{
  "id": "alert_new456",
  "name": "High Latency",
  "status": "pending",
  "created_at": "2024-01-15T10:00:00Z"
}
```

**Errors:** `400`, `401`, `403`, `422`

---

### Admin

**Base:** `/api/v3/admin`

#### 100. GET `/admin/users` — List All Users

List all users (admin only).

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `admin:read` |
| Query | `?search=john&status=active&limit=50` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "usr_abc123",
      "email": "jane@example.com",
      "name": "Jane Developer",
      "status": "active",
      "plan": "team",
      "teams_count": 3,
      "projects_count": 12,
      "created_at": "2023-08-15T10:30:00Z",
      "last_login_at": "2024-01-15T09:00:00Z"
    }
  ],
  "pagination": {
    "total_count": 15420,
    "has_more": true
  }
}
```

**Errors:** `401`, `403`

---

#### 101. GET `/admin/users/:id` — Get User Details

Get detailed user information (admin only).

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `admin:read` |

**Response (200):** Full user object with admin-only fields

```json
{
  "id": "usr_abc123",
  "email": "jane@example.com",
  "name": "Jane Developer",
  "status": "active",
  ...,
  "admin_fields": {
    "ip_addresses": ["203.0.113.1", "203.0.113.2"],
    "suspicious_activity": false,
    "support_tickets": 3,
    "total_spend_usd": 948.00,
    "notes": "Enterprise prospect"
  }
}
```

**Errors:** `401`, `403`, `404`

---

#### 102. PATCH `/admin/users/:id` — Update User (Admin)

Update user as admin (suspend, change plan, etc.).

| Attribute | Value |
|-----------|-------|
| Method | `PATCH` |
| Auth | Bearer token |
| Scopes | `admin:write` |

**Request Body:**

```json
{
  "status": "suspended",
  "reason": "Violation of terms of service",
  "plan": "free"
}
```

**Response (200):** Updated user object

**Errors:** `400`, `401`, `403`, `404`, `422`

---

#### 103. GET `/admin/teams` — List All Teams

List all teams (admin only).

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `admin:read` |
| Query | `?search=platform&plan=enterprise&limit=50` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "team_xyz789",
      "name": "Platform Team",
      "slug": "platform-team",
      "plan": "enterprise",
      "member_count": 12,
      "project_count": 8,
      "total_deployments": 1450,
      "monthly_spend_usd": 299.00,
      "status": "active",
      "created_at": "2023-06-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total_count": 5230,
    "has_more": true
  }
}
```

**Errors:** `401`, `403`

---

#### 104. GET `/admin/metrics` — System Metrics

Get system-wide metrics (admin only).

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `admin:read` |

**Response (200):**

```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "users": {
    "total": 15420,
    "active_24h": 5230,
    "active_7d": 8900,
    "new_24h": 145
  },
  "teams": {
    "total": 5230,
    "active": 4800
  },
  "projects": {
    "total": 18450,
    "deployed_24h": 3200
  },
  "deployments": {
    "total": 1250000,
    "success_rate": 0.97,
    "avg_duration_seconds": 85
  },
  "infrastructure": {
    "active_nodes": 45,
    "cpu_utilization": 0.45,
    "memory_utilization": 0.62,
    "storage_utilization_tb": 12.5
  },
  "revenue": {
    "mrr_usd": 285000,
    "arr_usd": 3420000,
    "trial_conversions_30d": 0.23
  }
}
```

**Errors:** `401`, `403`

---

#### 105. GET `/admin/audit-log` — Audit Log

View admin audit log.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `admin:read` |
| Query | `?action=user.suspend&from=2024-01-01&limit=100` |

**Response (200):**

```json
{
  "data": [
    {
      "id": "audit_001",
      "timestamp": "2024-01-15T10:00:00Z",
      "actor": {
        "id": "usr_admin001",
        "email": "admin@devplatform.io",
        "ip_address": "203.0.113.10"
      },
      "action": "user.suspend",
      "resource": {
        "type": "user",
        "id": "usr_abc123"
      },
      "details": {
        "previous_status": "active",
        "new_status": "suspended",
        "reason": "Violation of terms"
      },
      "user_agent": "Mozilla/5.0..."
    }
  ],
  "pagination": {
    "total_count": 45230,
    "has_more": true
  }
}
```

---

#### 106. POST `/admin/maintenance` — Toggle Maintenance Mode

Enable or disable global maintenance mode.

| Attribute | Value |
|-----------|-------|
| Method | `POST` |
| Auth | Bearer token |
| Scopes | `admin:write` |

**Request Body:**

```json
{
  "enabled": true,
  "message": "Scheduled maintenance in progress. Expected completion: 30 minutes.",
  "allowed_ips": ["203.0.113.10"],
  "estimated_duration_minutes": 30
}
```

**Response (200):**

```json
{
  "enabled": true,
  "message": "Scheduled maintenance in progress. Expected completion: 30 minutes.",
  "started_at": "2024-01-15T10:00:00Z",
  "estimated_end_at": "2024-01-15T10:30:00Z"
}
```

**Errors:** `400`, `401`, `403`, `422`

---

#### 107. GET `/admin/maintenance` — Get Maintenance Status

Get current maintenance mode status.

| Attribute | Value |
|-----------|-------|
| Method | `GET` |
| Auth | Bearer token |
| Scopes | `admin:read` |

**Response (200):**

```json
{
  "enabled": false,
  "last_maintenance": {
    "started_at": "2024-01-10T02:00:00Z",
    "ended_at": "2024-01-10T02:15:00Z",
    "duration_minutes": 15,
    "performed_by": "usr_admin001"
  }
}
```

**Errors:** `401`, `403`

---

## WebSocket Events

Connect to the real-time gateway at:

```
wss://ws.devplatform.io/?token=<access_token>&project_id=<project_id>
```

### Connection Lifecycle

```javascript
const socket = io('wss://ws.devplatform.io', {
  auth: { token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...' },
  query: { project_id: 'proj_abc123' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('deployment.update', (data) => {
  console.log('Deployment update:', data);
});

socket.on('error', (error) => {
  console.error('WS Error:', error);
});
```

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `project.subscribe` | `{ project_id }` | Subscribe to project events |
| `project.unsubscribe` | `{ project_id }` | Unsubscribe from project |
| `presence.join` | `{ room, cursor? }` | Join a presence room |
| `presence.leave` | `{ room }` | Leave a presence room |
| `presence.update` | `{ room, cursor, activity? }` | Update presence state |
| `collab.edit` | `{ document_id, operations[] }` | Send collaborative edit |
| `ping` | `{}` | Keep-alive ping |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `deployment.update` | `{ deployment_id, status, progress? }` | Deployment status change |
| `deployment.log` | `{ deployment_id, line, level }` | New build log line |
| `presence.state` | `{ room, users[] }` | Presence state snapshot |
| `presence.join` | `{ room, user }` | User joined room |
| `presence.leave` | `{ room, user }` | User left room |
| `collab.update` | `{ document_id, operations[], user_id }` | Remote edit received |
| `notification` | `{ type, title, message, data? }` | User notification |
| `pong` | `{ timestamp }` | Keep-alive response |
| `error` | `{ code, message }` | Error notification |

### Presence Room Events

```javascript
// Join a room
socket.emit('presence.join', {
  room: 'project:proj_abc123:editor',
  cursor: { line: 45, column: 12, file: '/src/App.tsx' }
});

// Receive presence updates
socket.on('presence.state', ({ room, users }) => {
  console.log('Users in room:', users);
  // [{ user_id: 'usr_001', name: 'Jane', cursor: { ... }, last_active: '...' }, ...]
});

// Update your cursor
socket.emit('presence.update', {
  room: 'project:proj_abc123:editor',
  cursor: { line: 46, column: 5, file: '/src/App.tsx' },
  activity: 'typing'
});
```

### Error Codes (WebSocket)

| Code | Description | Action |
|------|-------------|--------|
| `auth_failed` | Authentication failed | Reconnect with valid token |
| `auth_expired` | Token expired | Refresh token and reconnect |
| `rate_limited` | Too many messages | Reduce message frequency |
| `invalid_room` | Room doesn't exist | Check room identifier |
| `not_permitted` | Insufficient permissions | Request appropriate scope |
| `room_full` | Room has reached capacity | Try again later |
| `connection_lost` | Server-side disconnect | Reconnect with backoff |

---

## SDK Examples

### Node.js SDK

```bash
npm install @devplatform/sdk
```

```typescript
import { DevPlatformClient } from '@devplatform/sdk';

const client = new DevPlatformClient({
  apiKey: 'dp_pat_xxxxxxxxxxxxxxxxxxxx',
  baseUrl: 'https://api.devplatform.io'
});

// List projects
const projects = await client.projects.list({
  limit: 10,
  status: 'active'
});

// Create deployment
const deployment = await client.deployments.create({
  projectId: 'proj_abc123',
  environmentId: 'env_prod001',
  gitRef: 'main'
});

// Stream build logs
for await (const line of client.deployments.streamLogs('dep_abc123')) {
  console.log(`[${line.level}] ${line.message}`);
}
```

### Python SDK

```bash
pip install devplatform-sdk
```

```python
from devplatform import DevPlatformClient

client = DevPlatformClient(
    api_key="dp_pat_xxxxxxxxxxxxxxxxxxxx",
    base_url="https://api.devplatform.io"
)

# Get project
project = client.projects.get("proj_abc123")
print(project.name, project.url)

# List deployments with pagination
for deployment in client.deployments.list(
    project_id="proj_abc123",
    status="success",
    auto_paginate=True
):
    print(deployment.commit_message)

# Set environment variable
client.projects.set_env_var(
    project_id="proj_abc123",
    key="API_SECRET",
    value="super-secret",
    environment_ids=["env_prod001"]
)
```

### cURL Examples

```bash
# Get current user
curl -s https://api.devplatform.io/api/v3/user/me \
  -H "Authorization: Bearer dp_pat_xxxxxxxx" | jq

# Create project
curl -s -X POST https://api.devplatform.io/api/v3/projects \
  -H "Authorization: Bearer dp_pat_xxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API",
    "slug": "my-api",
    "team_id": "team_xyz789",
    "framework": "fastify"
  }' | jq

# Deploy
curl -s -X POST https://api.devplatform.io/api/v3/projects/proj_abc123/deploy \
  -H "Authorization: Bearer dp_pat_xxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"environment_id": "env_prod001", "git_ref": "main"}' | jq

# Get build logs
curl -s https://api.devplatform.io/api/v3/deployments/dep_abc123/logs \
  -H "Authorization: Bearer dp_pat_xxxxxxxx" | jq '.lines[]'
```

---

## Changelog

### v3.2.1 (2026-01-15)
- Added `PATCH /admin/users/:id` endpoint for admin user management
- Added WebSocket `collab.edit` and `collab.update` events
- Improved rate limit headers with `X-RateLimit-Retry-After`

### v3.2.0 (2025-12-01)
- Added `/billing/checkout` for Stripe Checkout integration
- Added `/monitoring/alerts` CRUD endpoints
- Added `POST /domains/:id/ssl` for manual SSL provisioning

### v3.1.0 (2025-10-15)
- Added 8 Admin endpoints
- Added `/monitoring/traces/:traceId` distributed tracing
- Added WebSocket presence rooms

### v3.0.0 (2025-08-01)
- Initial v3 release with 95+ endpoints
- New OAuth 2.0 + JWT authentication
- Cursor-based pagination
- WebSocket real-time gateway
