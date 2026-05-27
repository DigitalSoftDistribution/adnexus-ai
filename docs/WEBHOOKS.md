# Webhook Integration Guide

> **Version:** 3.2.1 | **Supported Platforms:** GitHub, GitLab, Bitbucket, Slack, Discord, Custom | **Protocol:** HTTPS/JSON

---

## Table of Contents

- [Overview](#overview)
- [Platform-Specific Setup](#platform-specific-setup)
  - [GitHub](#github)
  - [GitLab](#gitlab)
  - [Bitbucket](#bitbucket)
  - [Slack](#slack)
  - [Discord](#discord)
  - [Custom Endpoints](#custom-endpoints)
- [Incoming Webhooks](#incoming-webhooks)
- [Outgoing Webhooks](#outgoing-webhooks)
- [Event Types & Payloads](#event-types--payloads)
- [Signature Verification](#signature-verification)
- [Retry Logic](#retry-logic)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

DevPlatform's webhook system supports bidirectional webhook communication:

| Direction | Purpose | Authentication |
|-----------|---------|----------------|
| **Incoming** | Receive events from Git providers (GitHub, GitLab, Bitbucket) | Token-based URL + Signature verification |
| **Outgoing** | Send DevPlatform events to your services (Slack, Discord, CI/CD) | HMAC-SHA256 signature + Custom headers |

### Webhook Architecture

```
┌─────────────────┐      Push/PR/Event      ┌─────────────────┐
│   GitHub/GitLab │ ───────────────────────►│   DevPlatform   │
│   Bitbucket     │   (Incoming Webhook)    │   API Server    │
└─────────────────┘                         └────────┬────────┘
                                                     │
                              ┌──────────────────────┼──────────────────────┐
                              │                      │                      │
                     ┌────────▼────────┐    ┌───────▼───────┐    ┌────────▼────────┐
                     │  BullMQ Queue   │    │   Project     │    │   Deployment    │
                     │  (Reliable DLQ) │    │   Handler     │    │   Trigger       │
                     └─────────────────┘    └───────────────┘    └─────────────────┘
                                                     │
                              ┌──────────────────────┼──────────────────────┐
                              │                      │                      │
                     ┌────────▼────────┐    ┌───────▼───────┐    ┌────────▼────────┐
                     │     Slack       │    │    Discord    │    │    Custom CI    │
                     │  (Notification) │    │ (Notification)│    │  /CD Pipeline   │
                     └─────────────────┘    └───────────────┘    └─────────────────┘
                              (Outgoing Webhooks)
```

---

## Platform-Specific Setup

### GitHub

#### 1. Create a GitHub App (Recommended)

**For Organizations:**

1. Navigate to **Organization Settings > Developer Settings > GitHub Apps > New GitHub App**
2. Fill in the configuration:

| Field | Value |
|-------|-------|
| **GitHub App Name** | `DevPlatform (YourOrg)` |
| **Homepage URL** | `https://app.devplatform.io` |
| **Webhook URL** | `https://api.devplatform.io/api/v3/webhooks/incoming/gh_YOUR_TOKEN` |
| **Webhook Secret** | Generate from DevPlatform Dashboard |
| **Permissions** | `Contents: Read-only`, `Metadata: Read-only`, `Pull requests: Read-only` |
| **Subscribe to events** | `Push`, `Pull request`, `Delete` |

3. Create the app, then install it on your repositories

#### 2. Or Use Repository Webhooks (Simpler)

1. Go to **Repository > Settings > Webhooks > Add webhook**
2. Configure:

```
Payload URL:    https://api.devplatform.io/api/v3/webhooks/incoming/gh_YOUR_TOKEN
Content type:   application/json
Secret:         [Generate from DevPlatform Dashboard > Integrations > GitHub > Webhook Secret]
SSL verification: Enable

Which events would you like to trigger this webhook?
  [x] Just the push event.
  [x] Pull requests
  [x] Branch or tag creation
  [x] Branch or tag deletion
```

#### 3. Verify Setup

```bash
# Push a commit to trigger the webhook
git push origin main

# Check webhook deliveries in GitHub:
# Repository > Settings > Webhooks > Recent Deliveries

# Verify in DevPlatform:
curl -s https://api.devplatform.io/api/v3/webhooks/incoming/gh_YOUR_TOKEN/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Signature Verification (GitHub)

```python
import hmac
import hashlib

def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify GitHub webhook signature.
    
    Args:
        payload: Raw request body bytes
        signature: X-Hub-Signature-256 header value (e.g., 'sha256=abc123...')
        secret: Your webhook secret
    
    Returns:
        bool: True if signature is valid
    """
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)

# Fastify middleware example
async function verifyGitHubWebhook(request, reply) {
  const signature = request.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(request.rawBody)
    .digest('hex');
  
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    reply.code(401).send({ error: 'Invalid signature' });
    return;
  }
}
```

---

### GitLab

#### 1. Create a Project-level Webhook

1. Navigate to **Project > Settings > Webhooks**
2. Configure:

```
URL:            https://api.devplatform.io/api/v3/webhooks/incoming/gl_YOUR_TOKEN
Secret Token:   [Generate from DevPlatform Dashboard]
Trigger events:
  [x] Push events
  [x] Merge request events
  [x] Tag push events
  [x] Comments
SSL Verification: [x] Enable SSL verification
```

3. Click **Add webhook**

#### 2. Or Create a Group-level Webhook (Premium)

1. Navigate to **Group > Settings > Webhooks**
2. Same configuration as above, applies to all projects in the group

#### 3. Signature Verification (GitLab)

GitLab uses `X-Gitlab-Token` for simple token verification and `X-Gitlab-Signature` for HMAC:

```python
def verify_gitlab_signature(payload: bytes, token_header: str, secret: str) -> bool:
    """Verify GitLab webhook token."""
    return hmac.compare_digest(token_header, secret)

# GitLab also supports HMAC-SHA256 with X-Gitlab-Signature
def verify_gitlab_hmac(payload: bytes, signature: str, secret: str) -> bool:
    """Verify GitLab HMAC signature."""
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
```

---

### Bitbucket

#### 1. Create a Webhook

1. Navigate to **Repository > Repository Settings > Webhooks > Add webhook**
2. Configure:

```
Title:          DevPlatform Integration
URL:            https://api.devplatform.io/api/v3/webhooks/incoming/bb_YOUR_TOKEN
Triggers:
  [x] Repository > Push
  [x] Pull Request > Created
  [x] Pull Request > Merged
  [x] Pull Request > Declined
Active:         [x] Yes
Skip certificate verification: [ ] No
```

#### 2. Signature Verification (Bitbucket)

Bitbucket uses JWT-based webhook signatures. The JWT token is sent in the `Authorization` header:

```python
import jwt

def verify_bitbucket_signature(auth_header: str, shared_secret: str) -> dict:
    """
    Verify Bitbucket webhook JWT.
    
    Returns the decoded JWT claims if valid.
    """
    token = auth_header.replace('JWT ', '')
    return jwt.decode(token, shared_secret, algorithms=['HS256'])
```

---

### Slack

#### 1. Create a Slack Incoming Webhook (for outgoing webhooks FROM DevPlatform)

1. Go to [Slack API Apps](https://api.slack.com/apps) > **Create New App** > **From scratch**
2. Navigate to **Incoming Webhooks > Activate Incoming Webhooks**
3. Click **Add New Webhook to Workspace**, select channel
4. Copy the Webhook URL (looks like: `https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN`)

#### 2. Configure in DevPlatform

```bash
curl -X POST https://api.devplatform.io/api/v3/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj_abc123",
    "name": "Slack Deployment Notifications",
    "url": "https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN",
    "events": ["deployment.success", "deployment.failed"],
    "secret": "your-signing-secret",
    "headers": {
      "Content-Type": "application/json"
    }
  }'
```

#### 3. Rich Slack Messages (Block Kit)

DevPlatform automatically formats Slack webhooks with Block Kit for rich notifications:

```json
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "Deployment Successful",
        "emoji": true
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Project:*\nAPI Gateway"
        },
        {
          "type": "mrkdwn",
          "text": "*Environment:*\nProduction"
        },
        {
          "type": "mrkdwn",
          "text": "*Commit:*\n`a1b2c3d` feat: add auth"
        },
        {
          "type": "mrkdwn",
          "text": "*Duration:*\n95s"
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Deployment"
          },
          "url": "https://app.devplatform.io/projects/proj_abc123/deployments/dep_001",
          "style": "primary"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Logs"
          },
          "url": "https://app.devplatform.io/projects/proj_abc123/deployments/dep_001/logs"
        }
      ]
    }
  ]
}
```

---

### Discord

#### 1. Create a Discord Webhook

1. In your Discord server, go to **Server Settings > Integrations > Webhooks > New Webhook**
2. Choose the channel and copy the Webhook URL
   (looks like: `https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz`)

#### 2. Configure in DevPlatform

```bash
curl -X POST https://api.devplatform.io/api/v3/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj_abc123",
    "name": "Discord Deployment Notifications",
    "url": "https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz",
    "events": ["deployment.success", "deployment.failed", "deployment.started"],
    "secret": "your-signing-secret"
  }'
```

#### 3. Discord Embed Format

DevPlatform automatically sends Discord-compatible embeds:

```json
{
  "embeds": [
    {
      "title": "Deployment Successful",
      "description": "Project **API Gateway** deployed to **Production**",
      "color": 3066993,
      "fields": [
        { "name": "Commit", "value": "`a1b2c3d` feat: add auth", "inline": true },
        { "name": "Duration", "value": "95s", "inline": true },
        { "name": "Author", "value": "Jane Developer", "inline": true }
      ],
      "timestamp": "2024-01-15T10:01:40Z",
      "footer": { "text": "DevPlatform" },
      "url": "https://app.devplatform.io/projects/proj_abc123/deployments/dep_001"
    }
  ]
}
```

Colors: `Success = 0x2ECC71 (green)`, `Failed = 0xE74C3C (red)`, `Started = 0x3498DB (blue)`

---

### Custom Endpoints

For any custom HTTP endpoint (CI/CD pipelines, internal tools, etc.):

#### 1. Configure the Webhook

```bash
curl -X POST https://api.devplatform.io/api/v3/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj_abc123",
    "name": "Jenkins CI Pipeline",
    "url": "https://jenkins.example.com/webhook/devplatform",
    "events": ["deployment.success"],
    "secret": "super-secret-signing-key",
    "headers": {
      "Authorization": "Bearer jenkins-api-token",
      "X-Source": "devplatform"
    },
    "retry_policy": {
      "max_retries": 5,
      "retry_interval_seconds": 60,
      "backoff_multiplier": 2
    }
  }'
```

#### 2. Verify Signatures on Your Endpoint

```python
import hmac
import hashlib
import json
from flask import Flask, request

app = Flask(__name__)
WEBHOOK_SECRET = "super-secret-signing-key"

@app.route('/webhook/devplatform', methods=['POST'])
def handle_webhook():
    # Get signature from header
    signature = request.headers.get('X-DevPlatform-Signature')
    timestamp = request.headers.get('X-DevPlatform-Timestamp')
    
    # Verify signature
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        request.data,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(f"sha256={expected}", signature):
        return {'error': 'Invalid signature'}, 401
    
    # Process event
    payload = request.json
    event_type = request.headers.get('X-DevPlatform-Event')
    
    match event_type:
        case 'deployment.success':
            trigger_smoke_tests(payload)
        case 'deployment.failed':
            alert_oncall(payload)
    
    return {'status': 'processed'}, 200

def trigger_smoke_tests(payload):
    deployment = payload['data']['deployment']
    print(f"Running smoke tests for {deployment['project_name']}")
    # ...

def alert_oncall(payload):
    deployment = payload['data']['deployment']
    print(f"ALERT: Deployment failed for {deployment['project_name']}")
    # ...
```

---

## Incoming Webhooks

### URL Format

```
POST https://api.devplatform.io/api/v3/webhooks/incoming/{token}
```

The `{token}` is generated when you connect a git provider in the DevPlatform Dashboard.

### Headers

| Header | Description | Example |
|--------|-------------|---------|
| `X-GitHub-Event` | GitHub event type (GitHub only) | `push`, `pull_request` |
| `X-GitHub-Delivery` | Unique delivery ID (GitHub only) | `72d3162e-cc78-11e3-81ab-4c9367dc0958` |
| `X-GitHub-Hook-ID` | Webhook configuration ID (GitHub only) | `12345678` |
| `X-Gitlab-Event` | GitLab event type (GitLab only) | `Push Hook`, `Merge Request Hook` |
| `X-Gitlab-Token` | GitLab webhook secret (GitLab only) | `your-secret-token` |
| `X-Event-Key` | Bitbucket event type (Bitbucket only) | `repo:push`, `pullrequest:created` |
| `X-Hub-Signature-256` | GitHub HMAC signature (GitHub only) | `sha256=abc123...` |
| `X-Request-ID` | Unique request ID for tracing | `req_abc123def456` |

### Response Codes

| Code | Meaning | Body |
|------|---------|------|
| `202` | Event accepted and queued | `{"received": true, "event_id": "evt_abc123"}` |
| `400` | Invalid payload | `{"error": "Invalid payload format"}` |
| `401` | Invalid token or signature | `{"error": "Unauthorized"}` |
| `404` | Unknown token | `{"error": "Webhook endpoint not found"}` |
| `409` | Duplicate event | `{"error": "Event already processed", "event_id": "evt_abc123"}` |
| `422` | Event type not supported | `{"error": "Event type 'wiki_page' not supported"}` |
| `429` | Rate limit exceeded | `{"error": "Rate limit exceeded", "retry_after": 60}` |

### Event Processing Flow

```
Incoming Request
    │
    ▼
[Token Validation] ──Fail──► 401 Unauthorized
    │
    ▼
[Signature Verification] ──Fail──► 401 Unauthorized
    │
    ▼
[Deduplication Check] ──Duplicate──► 409 Conflict
    │
    ▼
[Event Parsing]
    │
    ▼
[Queue to BullMQ]
    │
    ▼
[Background Worker Processing]
    │
    ├──► Push → Trigger deployment (if auto-deploy enabled)
    ├──► Pull Request → Create preview deployment
    ├──► Delete → Clean up preview environments
    └──► Other → Log and ignore
    │
    ▼
[Acknowledge with 202]
```

### Supported Git Events

| Event | GitHub | GitLab | Bitbucket | Action |
|-------|--------|--------|-----------|--------|
| `push` | Yes | Yes | Yes | Trigger deployment |
| `pull_request` (opened/synchronized) | Yes | Yes | Yes | Create preview deployment |
| `pull_request` (closed/merged) | Yes | Yes | Yes | Clean up preview |
| `delete` (branch) | Yes | Yes | Yes | Clean up environment |
| `release` (published) | Yes | No | No | Deploy to production |
| `workflow_run` (completed) | Yes | No | No | Trigger on CI completion |

---

## Outgoing Webhooks

### URL Format

```
POST https://your-service.com/webhook
```

DevPlatform sends events to your configured URLs with:

### Request Headers

| Header | Description | Example |
|--------|-------------|---------|
| `Content-Type` | Always `application/json` | `application/json` |
| `User-Agent` | DevPlatform webhook agent | `DevPlatform-Webhook/3.2.1` |
| `X-DevPlatform-Signature` | HMAC-SHA256 signature | `sha256=abc123...` |
| `X-DevPlatform-Timestamp` | Event timestamp (Unix) | `1705315200` |
| `X-DevPlatform-Event` | Event type | `deployment.success` |
| `X-DevPlatform-Webhook-ID` | Webhook configuration ID | `wh_abc123` |
| `X-DevPlatform-Delivery-ID` | Unique delivery attempt ID | `whd_001` |
| `X-DevPlatform-Attempt` | Retry attempt number | `1` |

### Request Body Structure

```json
{
  "event_id": "evt_abc123",
  "event_type": "deployment.success",
  "timestamp": "2024-01-15T10:01:40Z",
  "webhook_id": "wh_abc123",
  "data": {
    "deployment": {
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
      "commit_author_email": "jane@example.com",
      "duration_seconds": 95,
      "preview_url": "https://api-gateway-git-main.devplatform.app",
      "production_url": "https://api-gateway.devplatform.app",
      "started_at": "2024-01-15T10:00:05Z",
      "finished_at": "2024-01-15T10:01:40Z"
    }
  }
}
```

### Expected Response

Your endpoint should respond quickly:

| Response | Meaning | Action |
|----------|---------|--------|
| `2xx` | Success | Mark as delivered |
| `3xx` | Redirect | Follow redirect (max 5) |
| `4xx` | Client error | Retry with backoff |
| `5xx` | Server error | Retry with backoff |
| Timeout (>30s) | No response | Retry with backoff |

**Response body is ignored** unless testing via the dashboard.

---

## Event Types & Payloads

### Deployment Events

#### `deployment.started`

```json
{
  "event_id": "evt_001",
  "event_type": "deployment.started",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "deployment": {
      "id": "dep_abc123",
      "project_id": "proj_abc123",
      "project_name": "API Gateway",
      "environment_id": "env_prod001",
      "environment_name": "Production",
      "status": "building",
      "git_ref": "main",
      "commit_sha": "a1b2c3d4e5f6",
      "commit_message": "feat: add user authentication",
      "commit_author": "Jane Developer",
      "started_at": "2024-01-15T10:00:00Z",
      "queued_at": "2024-01-15T09:59:55Z"
    }
  }
}
```

#### `deployment.success`

```json
{
  "event_id": "evt_002",
  "event_type": "deployment.success",
  "timestamp": "2024-01-15T10:01:40Z",
  "data": {
    "deployment": {
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
      "commit_author_email": "jane@example.com",
      "duration_seconds": 95,
      "build_metrics": {
        "install_time_ms": 15000,
        "build_time_ms": 65000,
        "deploy_time_ms": 15000
      },
      "preview_url": "https://api-gateway-git-main.devplatform.app",
      "production_url": "https://api-gateway.devplatform.app",
      "started_at": "2024-01-15T10:00:05Z",
      "finished_at": "2024-01-15T10:01:40Z"
    }
  }
}
```

#### `deployment.failed`

```json
{
  "event_id": "evt_003",
  "event_type": "deployment.failed",
  "timestamp": "2024-01-15T10:02:30Z",
  "data": {
    "deployment": {
      "id": "dep_def456",
      "project_id": "proj_abc123",
      "project_name": "API Gateway",
      "environment_id": "env_prod001",
      "environment_name": "Production",
      "status": "failed",
      "git_ref": "main",
      "commit_sha": "b2c3d4e5f6g7",
      "commit_message": "feat: add new feature",
      "commit_author": "John Engineer",
      "error": {
        "message": "Build failed: Module not found './components/NewFeature'",
        "exit_code": 1,
        "failed_step": "build",
        "log_url": "https://api.devplatform.io/api/v3/deployments/dep_def456/logs"
      },
      "duration_seconds": 45,
      "started_at": "2024-01-15T10:00:00Z",
      "finished_at": "2024-01-15T10:00:45Z"
    }
  }
}
```

#### `deployment.cancelled`

```json
{
  "event_id": "evt_004",
  "event_type": "deployment.cancelled",
  "timestamp": "2024-01-15T10:00:30Z",
  "data": {
    "deployment": {
      "id": "dep_ghi789",
      "project_id": "proj_abc123",
      "project_name": "API Gateway",
      "environment_id": "env_stg001",
      "environment_name": "Staging",
      "status": "cancelled",
      "git_ref": "feature/new-ui",
      "cancelled_by": {
        "id": "usr_abc123",
        "email": "jane@example.com",
        "name": "Jane Developer"
      },
      "cancelled_at": "2024-01-15T10:00:30Z",
      "reason": "Cancelled by user"
    }
  }
}
```

### Domain Events

#### `domain.verified`

```json
{
  "event_id": "evt_005",
  "event_type": "domain.verified",
  "timestamp": "2024-01-15T10:05:00Z",
  "data": {
    "domain": {
      "id": "dom_abc123",
      "project_id": "proj_abc123",
      "domain": "api.example.com",
      "status": "active",
      "verification": {
        "verified": true,
        "verified_at": "2024-01-15T10:05:00Z",
        "method": "dns"
      }
    }
  }
}
```

#### `domain.ssl.renewed`

```json
{
  "event_id": "evt_006",
  "event_type": "domain.ssl.renewed",
  "timestamp": "2024-01-15T02:00:00Z",
  "data": {
    "domain": {
      "id": "dom_abc123",
      "project_id": "proj_abc123",
      "domain": "api.example.com",
      "ssl_status": "active",
      "ssl_expires_at": "2024-04-15T00:00:00Z",
      "auto_renewed": true
    }
  }
}
```

### Project Events

#### `project.created`

```json
{
  "event_id": "evt_007",
  "event_type": "project.created",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "project": {
      "id": "proj_new123",
      "name": "New Project",
      "slug": "new-project",
      "team_id": "team_xyz789",
      "framework": "nextjs",
      "created_by": {
        "id": "usr_abc123",
        "email": "jane@example.com",
        "name": "Jane Developer"
      },
      "created_at": "2024-01-15T10:00:00Z"
    }
  }
}
```

#### `project.updated`

```json
{
  "event_id": "evt_008",
  "event_type": "project.updated",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "project": {
      "id": "proj_abc123",
      "name": "Updated Project Name",
      "slug": "updated-project",
      "changes": {
        "name": {
          "from": "Old Name",
          "to": "Updated Project Name"
        },
        "build_command": {
          "from": "npm run build",
          "to": "npm run build:production"
        }
      },
      "updated_at": "2024-01-15T10:00:00Z"
    }
  }
}
```

### Team Events

#### `team.member.invited`

```json
{
  "event_id": "evt_009",
  "event_type": "team.member.invited",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "invitation": {
      "id": "inv_abc123",
      "team_id": "team_xyz789",
      "team_name": "Platform Team",
      "email": "newmember@example.com",
      "role": "member",
      "invited_by": {
        "id": "usr_abc123",
        "email": "jane@example.com",
        "name": "Jane Developer"
      },
      "expires_at": "2024-01-22T10:00:00Z"
    }
  }
}
```

#### `team.member.joined`

```json
{
  "event_id": "evt_010",
  "event_type": "team.member.joined",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "member": {
      "id": "usr_new456",
      "email": "newmember@example.com",
      "name": "New Member",
      "team_id": "team_xyz789",
      "team_name": "Platform Team",
      "role": "member",
      "joined_at": "2024-01-15T10:00:00Z"
    }
  }
}
```

### Security Events

#### `security.alert`

```json
{
  "event_id": "evt_011",
  "event_type": "security.alert",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "alert": {
      "id": "sec_001",
      "severity": "high",
      "type": "suspicious_login",
      "description": "Login from unusual location detected",
      "details": {
        "ip_address": "198.51.100.1",
        "location": "Unknown (VPN)",
        "user_agent": "Mozilla/5.0...",
        "user_id": "usr_abc123",
        "user_email": "jane@example.com"
      },
      "created_at": "2024-01-15T10:00:00Z"
    }
  }
}
```

---

## Signature Verification

### Outgoing Webhook Signature

DevPlatform signs all outgoing webhook payloads using HMAC-SHA256.

#### Signature Format

```
X-DevPlatform-Signature: sha256=<hex-encoded-hmac-sha256>
```

#### Verification Algorithm

```
signature = HMAC-SHA256(webhook_secret, request_body)
expected_header = "sha256=" + hex(signature)
# Compare expected_header with X-DevPlatform-Signature header
```

### Verification Examples

#### Node.js / Fastify

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expected)
  );
}

// Fastify hook
fastify.addHook('preHandler', async (request, reply) => {
  if (request.routerPath === '/webhook/devplatform') {
    const signature = request.headers['x-devplatform-signature'] as string;
    const secret = process.env.DEVP_WEBHOOK_SECRET;
    
    if (!verifyWebhookSignature(request.body as string, signature, secret)) {
      reply.code(401).send({ error: 'Invalid signature' });
    }
  }
});
```

#### Python / Flask

```python
import hmac
import hashlib
from flask import Flask, request

app = Flask(__name__)

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify DevPlatform webhook signature.
    
    Args:
        payload: Raw request body
        signature: X-DevPlatform-Signature header value
        secret: Your webhook signing secret
    
    Returns:
        bool: True if signature is valid
    """
    expected = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    # Extract hash from 'sha256=...' format
    provided = signature.replace('sha256=', '')
    
    return hmac.compare_digest(expected, provided)

@app.route('/webhook/devplatform', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-DevPlatform-Signature', '')
    secret = os.environ['DEVP_WEBHOOK_SECRET']
    
    if not verify_webhook_signature(request.data, signature, secret):
        return {'error': 'Invalid signature'}, 401
    
    # Process webhook...
    return {'status': 'ok'}, 200
```

#### Go

```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "net/http"
)

func verifyWebhookSignature(payload []byte, signature string, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expected := hex.EncodeToString(mac.Sum(nil))
    
    // Remove 'sha256=' prefix
    if len(signature) > 7 && signature[:7] == "sha256=" {
        signature = signature[7:]
    }
    
    return hmac.Equal([]byte(expected), []byte(signature))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    signature := r.Header.Get("X-DevPlatform-Signature")
    secret := os.Getenv("DEVP_WEBHOOK_SECRET")
    
    body, _ := io.ReadAll(r.Body)
    
    if !verifyWebhookSignature(body, signature, secret) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }
    
    // Process webhook...
    w.WriteHeader(http.StatusOK)
}
```

#### Ruby on Rails

```ruby
class WebhooksController < ApplicationController
  skip_before_action :verify_authenticity_token

  def devplatform
    payload = request.body.read
    signature = request.headers['X-DevPlatform-Signature']
    secret = ENV['DEVP_WEBHOOK_SECRET']

    unless verify_signature(payload, signature, secret)
      render json: { error: 'Invalid signature' }, status: :unauthorized
      return
    end

    event = JSON.parse(payload)
    handle_event(event)
    
    head :ok
  end

  private

  def verify_signature(payload, signature, secret)
    expected = OpenSSL::HMAC.hexdigest(
      OpenSSL::Digest.new('sha256'),
      secret,
      payload
    )
    
    provided = signature.to_s.sub('sha256=', '')
    ActiveSupport::SecurityUtils.secure_compare(expected, provided)
  end

  def handle_event(event)
    case event['event_type']
    when 'deployment.success'
      DeploymentSuccessJob.perform_later(event['data'])
    when 'deployment.failed'
      DeploymentFailedJob.perform_later(event['data'])
    end
  end
end
```

### Timestamp Verification (Optional but Recommended)

To prevent replay attacks, verify the timestamp is within a reasonable window:

```typescript
function verifyTimestamp(timestamp: string, toleranceSeconds: number = 300): boolean {
  const now = Math.floor(Date.now() / 1000);
  const eventTime = parseInt(timestamp, 10);
  
  return Math.abs(now - eventTime) <= toleranceSeconds;
}

// Usage
const timestamp = request.headers['x-devplatform-timestamp'] as string;
if (!verifyTimestamp(timestamp)) {
  reply.code(401).send({ error: 'Timestamp too old' });
  return;
}
```

---

## Retry Logic

### Delivery Behavior

DevPlatform uses **at-least-once delivery** with exponential backoff for outgoing webhooks.

### Retry Schedule

| Attempt | Delay After Previous | Total Delay |
|---------|---------------------|-------------|
| 1 (initial) | 0s | 0s |
| 2 | 30s | 30s |
| 3 | 60s | 90s |
| 4 | 120s | 210s (3.5 min) |
| 5 | 240s | 450s (7.5 min) |
| 6 | 480s | 930s (15.5 min) |
| 7 (max) | 960s | 1890s (31.5 min) |

### Retry Configuration

Configure per-webhook via the API:

```bash
curl -X PATCH https://api.devplatform.io/api/v3/webhooks/wh_abc123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "retry_policy": {
      "max_retries": 5,
      "retry_interval_seconds": 30,
      "backoff_multiplier": 2,
      "max_retry_interval_seconds": 600
    }
  }'
```

### Retry Signals

Retry is triggered on:
- HTTP 5xx responses
- HTTP 429 (rate limited) — with respect to `Retry-After` header
- Network timeouts (>30s)
- DNS resolution failures
- TLS/SSL errors
- Connection refused

No retry on:
- HTTP 2xx responses
- HTTP 4xx responses (except 429)
- Payloads exceeding 1MB

### Delivery Status Tracking

```bash
# Check delivery status
curl https://api.devplatform.io/api/v3/webhooks/wh_abc123/deliveries \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# Redeliver a failed event
curl -X POST https://api.devplatform.io/api/v3/webhooks/wh_abc123/redeliver \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"delivery_id": "whd_002"}'
```

### Dead Letter Queue (DLQ)

After max retries, failed deliveries go to the Dead Letter Queue:

```bash
# List DLQ entries
curl https://api.devplatform.io/api/v3/webhooks/wh_abc123/dlq \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# Retry from DLQ
curl -X POST https://api.devplatform.io/api/v3/webhooks/wh_abc123/dlq/retry \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"delivery_ids": ["whd_002", "whd_003"]}'

# Purge DLQ
curl -X DELETE https://api.devplatform.io/api/v3/webhooks/wh_abc123/dlq \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Idempotency

All webhook events include a unique `event_id`. Your endpoint should handle duplicate events gracefully:

```python
processed_events = set()  # Use Redis or database in production

def handle_webhook(payload):
    event_id = payload['event_id']
    
    if event_id in processed_events:
        return {'status': 'already_processed'}, 200
    
    # Process event
    match payload['event_type']:
        case 'deployment.success':
            handle_deployment_success(payload['data'])
    
    processed_events.add(event_id)
    return {'status': 'processed'}, 200
```

---

## Security Best Practices

### 1. HTTPS Only

All webhook URLs must use HTTPS. HTTP URLs are rejected.

### 2. Signature Verification

Always verify webhook signatures. Never trust the payload without verification.

### 3. Secret Management

- Store webhook secrets in environment variables or secret managers
- Rotate secrets quarterly
- Use different secrets for different environments
- Never commit secrets to version control

### 4. IP Allowlisting

DevPlatform webhook source IPs (allow these in your firewall):

```
# Production
203.0.113.0/24
198.51.100.0/24

# Staging
192.0.2.0/24
```

### 5. Rate Limiting

Implement rate limiting on your webhook endpoints:

```python
from flask_limiter import Limiter

limiter = Limiter(
    app,
    key_func=lambda: request.headers.get('X-DevPlatform-Webhook-ID'),
    default_limits=["100/minute"]
)

@app.route('/webhook/devplatform', methods=['POST'])
@limiter.limit("60/minute")
def handle_webhook():
    # ...
```

### 6. Request Validation

Validate payload size and structure:

```python
MAX_PAYLOAD_SIZE = 1024 * 1024  # 1MB

def validate_webhook_request(request):
    content_length = int(request.headers.get('Content-Length', 0))
    if content_length > MAX_PAYLOAD_SIZE:
        return False, 'Payload too large'
    
    payload = request.get_json()
    if not payload or 'event_type' not in payload:
        return False, 'Invalid payload'
    
    if payload['event_type'] not in ALLOWED_EVENT_TYPES:
        return False, 'Unsupported event type'
    
    return True, None
```

### 7. Async Processing

Process webhooks asynchronously to avoid timeouts:

```python
from celery import Celery

celery = Celery('webhooks')

@app.route('/webhook/devplatform', methods=['POST'])
def handle_webhook():
    # Verify signature immediately
    if not verify_signature(...):
        return {'error': 'Invalid'}, 401
    
    # Queue for processing
    process_webhook.delay(request.get_json())
    
    return {'status': 'queued'}, 202

@celery.task
def process_webhook(payload):
    # Long-running processing here
    ...
```

---

## Troubleshooting

### Common Issues

#### Webhooks Not Firing

| Symptom | Cause | Solution |
|---------|-------|----------|
| No webhook calls | Webhook is disabled | Check `active: true` in configuration |
| No webhook calls | Wrong event types | Verify event subscriptions match triggered events |
| No webhook calls | Project filter mismatch | Ensure webhook is attached to correct project |
| 401 errors | Invalid signature | Verify signing secret matches |
| 429 errors | Rate limiting | Implement backoff on receiver side |
| Timeout errors | Slow receiver | Process async, respond within 30s |

#### Debug Webhook Deliveries

```bash
# List recent deliveries
curl https://api.devplatform.io/api/v3/webhooks/wh_abc123/deliveries?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# Get delivery details
curl https://api.devplatform.io/api/v3/webhooks/deliveries/whd_001 \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# Test webhook manually
curl -X POST https://api.devplatform.io/api/v3/webhooks/wh_abc123/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Verify Signature Locally

```bash
# Get the raw payload
curl -s -o /tmp/webhook_payload.json https://api.devplatform.io/api/v3/webhooks/deliveries/whd_001/payload \
  -H "Authorization: Bearer YOUR_TOKEN"

# Calculate signature
WEBHOOK_SECRET="your-secret"
EXPECTED_SIG=$(cat /tmp/webhook_payload.json | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')
echo "Expected: sha256=$EXPECTED_SIG"

# Compare with actual header
echo "Actual:   $(curl -s -I https://api.devplatform.io/api/v3/webhooks/deliveries/whd_001 \
  -H "Authorization: Bearer YOUR_TOKEN" | grep -i x-devplatform-signature)"
```

### Diagnostic Checklist

- [ ] Webhook URL is accessible from the internet (not localhost)
- [ ] HTTPS is enabled with a valid certificate
- [ ] Firewall allows traffic from DevPlatform IPs
- [ ] Webhook secret matches on both sides
- [ ] Event types are correctly subscribed
- [ ] Response returned within 30 seconds
- [ ] Response body is < 100KB
- [ ] No redirects (or fewer than 5)
- [ ] Signature verification code uses constant-time comparison

### Getting Help

```bash
# Check webhook health
devp webhooks health --webhook-id wh_abc123

# View recent delivery logs
devp webhooks logs --webhook-id wh_abc123 --tail 50

# Run diagnostics
devp webhooks diagnose --webhook-id wh_abc123
```

For persistent issues, contact support with your webhook ID and a delivery ID of a failed attempt.
