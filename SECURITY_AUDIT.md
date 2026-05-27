# Security Audit Report

> **Project:** AI-Powered Marketing Campaign Management Platform
> **Version:** 1.0.0
> **Audit Date:** 2025-01-15
> **Classification:** Internal - Restricted
> **Auditor:** Security Engineering / DevOps Team

---

## Executive Summary

This security audit evaluates the marketing campaign management platform across eight critical security domains. The assessment combines automated scanning, manual code review, penetration testing methodology, and architectural analysis. Each finding includes a severity rating (Critical/High/Medium/Low), CVSS score where applicable, exploitation scenario, and remediation recommendation.

**Overall Security Posture: B (Requires Improvement)**

| Domain | Score | Grade | Critical | High | Medium |
|--------|-------|-------|----------|------|--------|
| Authentication | 85 | B | 0 | 1 | 2 |
| Authorization | 78 | C+ | 0 | 2 | 2 |
| Input Validation | 72 | C | 1 | 2 | 3 |
| XSS Prevention | 80 | B- | 0 | 1 | 2 |
| CSRF Protection | 88 | B+ | 0 | 0 | 2 |
| SQL Injection Prevention | 92 | A- | 0 | 0 | 1 |
| Secret Management | 65 | D | 1 | 2 | 2 |
| Dependency Vulnerabilities | 82 | B | 0 | 1 | 3 |

---

## 1. Authentication Review

### 1.1 Architecture Overview

```
[Client] ←──HTTPS──→ [API Gateway] ←──mTLS──→ [Auth Service] ←──TLS──→ [PostgreSQL + Redis]
                           │
                    [JWT Token (RS256)]
                    httpOnly, Secure, SameSite=Strict
```

### 1.2 Findings

#### AUTH-001: Refresh Token Rotation Not Implemented **[SEVERITY: HIGH]**

| Attribute | Value |
|-----------|-------|
| CVSS 3.1 | 7.1 (High) |
| CWE | CWE-798 |
| Affected | `/api/v1/auth/refresh` |

**Description:** Refresh tokens are not rotated on use. A stolen refresh token can be used indefinitely until expiry (30 days), even after legitimate use.

**Exploitation Scenario:**
1. Attacker obtains refresh token via XSS or network sniffing
2. Attacker uses refresh token to obtain new access tokens indefinitely
3. Token theft cannot be detected or revoked per-session

**Current Code:**
```typescript
// BAD: No rotation - refresh token remains valid after use
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.cookies;
  const payload = await verifyRefreshToken(refreshToken);
  const newAccessToken = generateAccessToken(payload.userId);
  res.json({ accessToken: newAccessToken }); // Same refresh token still valid!
});
```

**Remediation:**
```typescript
// GOOD: Refresh token rotation with reuse detection
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.cookies;

  // Atomic: verify and invalidate in single transaction
  const result = await db.transaction(async (trx) => {
    // Check if token was already revoked (reuse detection)
    const stored = await trx('refresh_tokens')
      .where({ token_hash: hashToken(refreshToken) })
      .forUpdate() // Lock row
      .first();

    if (!stored || stored.revoked_at) {
      // Potential token reuse! Revoke entire token family
      if (stored) {
        await trx('refresh_tokens')
          .where({ token_family: stored.token_family })
          .update({ revoked_at: new Date() });
      }
      throw new TokenReuseDetectedError();
    }

    // Revoke old token
    await trx('refresh_tokens')
      .where({ id: stored.id })
      .update({ revoked_at: new Date() });

    // Issue new token pair
    const newRefreshToken = generateRefreshToken();
    await trx('refresh_tokens').insert({
      token_family: stored.token_family,
      token_hash: hashToken(newRefreshToken),
      user_id: stored.user_id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const newAccessToken = generateAccessToken(stored.user_id);
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  });

  // Set new refresh token in httpOnly cookie
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken: result.accessToken });
});
```

**Effort:** 6 hours
**Verification:** Token rotation test, reuse detection alert

---

#### AUTH-002: OAuth State Parameter Validation Gap **[SEVERITY: MEDIUM]**

| Attribute | Value |
|-----------|-------|
| CVSS 3.1 | 5.3 (Medium) |
| CWE | CWE-352 |
| Affected | `/api/v1/auth/oauth/google/callback` |

**Description:** OAuth state parameter is validated but stored in `sessionStorage`, making it vulnerable to tab-fixation attacks if the user has multiple tabs open.

**Remediation:**
```typescript
// Use PKCE + double-submit cookie pattern
const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);

// Store verifier in httpOnly cookie (not sessionStorage)
res.cookie('oauth_code_verifier', codeVerifier, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 10 * 60 * 1000, // 10 minutes
});

// State parameter with nonce
const state = generateRandomString(32);
res.cookie('oauth_state', state, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 10 * 60 * 1000,
});

// Redirect URL
const authUrl = `https://accounts.google.com/oauth/authorize?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${REDIRECT_URI}&` +
  `response_type=code&` +
  `scope=${SCOPES}&` +
  `state=${state}&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256`;
```

**Effort:** 4 hours

---

#### AUTH-003: Password Reset Token Entropy **[SEVERITY: MEDIUM]**

| Attribute | Value |
|-----------|-------|
| CVSS 3.1 | 4.3 (Medium) |
| CWE | CWE-340 |

**Description:** Password reset tokens use `Math.random()` which is not cryptographically secure. Tokens may be predictable.

**Current:**
```typescript
// BAD: Predictable random
const token = Math.random().toString(36).substring(2);
```

**Remediation:**
```typescript
import { randomBytes, timingSafeEqual } from 'crypto';

// GOOD: Cryptographically secure random
const generateSecureToken = (length = 32): string => {
  return randomBytes(length).toString('base64url');
};

// Token storage: hash before storing
token_hash: createHash('sha256').update(token).digest('hex'),
token_expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour

// Verification: timing-safe comparison
const isValidToken = (provided: string, stored: string): boolean => {
  const providedHash = createHash('sha256').update(provided).digest();
  const storedHash = Buffer.from(stored, 'hex');
  return timingSafeEqual(providedHash, storedHash);
};
```

**Effort:** 2 hours

---

#### AUTH-004: Missing Account Lockout **[SEVERITY: LOW]**

**Description:** No progressive account lockout after repeated failed login attempts beyond rate limiting.

**Remediation:**
```typescript
// Progressive lockout after rate limit
const lockoutPolicy = {
  attempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  progressiveMultiplier: 2, // Double each time
};

// After 5 failures: lock 15 minutes
// After next 5: lock 30 minutes
// After next 5: lock 60 minutes
// Eventually requires admin unlock or CAPTCHA
```

**Effort:** 4 hours

---

### 1.3 Authentication Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Passwords hashed with bcrypt (cost >= 12) | Pass | Verified in `src/services/auth.ts:45` |
| 2 | JWT uses RS256 (asymmetric signing) | Pass | Private key server-side only |
| 3 | JWT expiry <= 15 minutes | Pass | `exp` set to 900 seconds |
| 4 | Tokens transmitted via httpOnly cookies | Pass | `Set-Cookie: httpOnly; Secure; SameSite=Strict` |
| 5 | CORS properly configured | Pass | Whitelist-only origin validation |
| 6 | Rate limiting on login endpoint | Pass | 5 attempts / 15 minutes / IP |
| 7 | Secure password reset flow | Warning | Token entropy issue (AUTH-003) |
| 8 | Session invalidation on password change | Pass | All refresh tokens revoked |
| 9 | OAuth state parameter validation | Warning | Storage location issue (AUTH-002) |
| 10 | Refresh token rotation | Fail | Not implemented (AUTH-001) |

---

## 2. Authorization Checks

### 2.1 RBAC Architecture

```
User → Organization → Role → Permissions → Resources
      (multi-tenant)   (Admin/Editor/Viewer)  (CRUD matrix)
```

### 2.2 Findings

#### AUTHZ-001: Missing Ownership Validation on Campaign Edit **[SEVERITY: HIGH]**

| Attribute | Value |
|-----------|-------|
| CVSS 3.1 | 8.1 (High) |
| CWE | CWE-639 (Authorization Bypass) |
| Affected | `PUT /api/v1/campaigns/:id` |

**Description:** API endpoint does not verify that the requesting user owns or has access to the campaign before allowing edits. This enables Insecure Direct Object Reference (IDOR).

**Vulnerable Code:**
```typescript
// BAD: No ownership check
router.put('/campaigns/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const campaign = await db('campaigns')
    .where({ id })
    .update(updates) // Updates ANY campaign by ID!
    .returning('*');
  res.json(campaign);
});
```

**Remediation:**
```typescript
// GOOD: Ownership + permission verification
router.put('/campaigns/:id',
  authenticate,
  requirePermission('campaign:edit'),
  async (req, res) => {
    const { id } = req.params;
    const { organizationId } = req.user; // Set by authenticate middleware

    // Verify ownership within organization
    const campaign = await db('campaigns')
      .where({
        id,
        organization_id: organizationId, // Tenant isolation
      })
      .first();

    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found',
        // Same message for non-existent and unauthorized to prevent enumeration
      });
    }

    // Additional RBAC check
    if (campaign.owner_id !== req.user.id && req.user.role !== 'admin') {
      await auditLog({
        action: 'campaign.edit.denied',
        userId: req.user.id,
        campaignId: id,
        reason: 'Not owner or admin',
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updates = sanitizeCampaignInput(req.body);
    const updated = await db('campaigns')
      .where({ id })
      .update({ ...updates, updated_at: new Date() })
      .returning('*');

    await auditLog({
      action: 'campaign.edit',
      userId: req.user.id,
      campaignId: id,
      changes: updates,
    });

    res.json(updated[0]);
  }
);
```

**Effort:** 8 hours (all endpoints)
**Verification:** BURP Suite IDOR scan

---

#### AUTHZ-002: Role Promotion Vulnerability **[SEVERITY: HIGH]**

| Attribute | Value |
|-----------|-------|
| CVSS 3.1 | 8.8 (High) |
| CWE | CWE-269 |

**Description:** Team member invitation endpoint allows specifying any role, including 'admin', without server-side validation of the inviter's authorization to grant that role.

**Remediation:**
```typescript
const ROLE_HIERARCHY = {
  'owner': ['owner', 'admin', 'editor', 'viewer'],
  'admin': ['admin', 'editor', 'viewer'],
  'editor': ['editor', 'viewer'],
  'viewer': [],
};

router.post('/team/invite', authenticate, async (req, res) => {
  const { email, role } = req.body;

  // Server-side role validation
  const allowedRoles = ROLE_HIERARCHY[req.user.role];
  if (!allowedRoles?.includes(role)) {
    await auditLog({
      action: 'role.promotion_attempt',
      userId: req.user.id,
      attemptedRole: role,
      userRole: req.user.role,
    });
    return res.status(403).json({ error: 'Cannot assign this role' });
  }

  // Continue with invitation...
});
```

**Effort:** 3 hours

---

#### AUTHZ-003: Missing Tenant Isolation on Shared Resources **[SEVERITY: MEDIUM]**

**Description:** Several queries on shared resources (templates, reports) do not include `organization_id` filters, potentially allowing cross-tenant data access.

**Remediation:** Apply Row-Level Security (RLS) at the database level as a defense-in-depth measure:

```sql
-- PostgreSQL Row-Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_tenant_isolation ON campaigns
  USING (organization_id = current_setting('app.current_org_id')::UUID);

-- Set org context per request
BEGIN;
SET LOCAL app.current_org_id = 'org-uuid-here';
-- queries automatically filtered
COMMIT;
```

**Effort:** 6 hours

---

#### AUTHZ-004: API Endpoint Missing Authorization Middleware **[SEVERITY: MEDIUM]**

**Description:** The following endpoints lack authorization checks:
- `GET /api/v1/templates` — returns all templates, not scoped to org
- `GET /api/v1/integrations/status` — leaks other orgs' integration configs
- `DELETE /api/v1/notifications/:id` — can delete other users' notifications

**Remediation:** Centralized authorization middleware with route-level decorators:

```typescript
// Decorator approach
@Route('/api/v1/templates')
@RequireAuth()
@RequireOrganization() // Injects org filter automatically
export class TemplateController {
  @Get('/')
  @RequirePermission('template:read')
  async listTemplates(@OrgScope() orgId: string) {
    return db('templates').where({ organization_id: orgId });
  }
}
```

**Effort:** 12 hours (full audit + fix)

---

## 3. Input Validation

### 3.1 Validation Architecture

```
Client-side (UX) → API Gateway (format) → Service Layer (business rules) → DB (constraints)
        ↓                    ↓                       ↓                      ↓
   React Hook Form      Zod/Joi schema        Domain validation        RLS + constraints
```

### 3.2 Findings

#### INPUT-001: Server-Side Validation Bypass on Campaign Creation **[SEVERITY: CRITICAL]**

| Attribute | Value |
|-----------|-------|
| CVSS 3.1 | 9.1 (Critical) |
| CWE | CWE-20 (Improper Input Validation) |
| Affected | `POST /api/v1/campaigns` |

**Description:** Campaign creation endpoint trusts client-provided `budget_spent` and `status` fields, allowing direct manipulation of financial data and workflow state.

**Vulnerable Code:**
```typescript
// BAD: No server-side validation of business-critical fields
router.post('/campaigns', authenticate, async (req, res) => {
  const campaign = await db('campaigns').insert(req.body).returning('*');
  // Client can set budget_spent: 9999999, status: 'approved'
  res.json(campaign);
});
```

**Remediation:**
```typescript
import { z } from 'zod';

// Strict schema with explicit allowed fields
const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  channel: z.enum(['email', 'social', 'search', 'display', 'video']),
  budget_total: z.number().min(0).max(100_000_000), // Sanity bounds
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  target_audience: z.object({
    age_min: z.number().min(13).max(120),
    age_max: z.number().min(13).max(120),
    locations: z.array(z.string()).max(100),
    interests: z.array(z.string()).max(50),
  }).optional(),
  // Explicitly reject these - they are server-managed
  // budget_spent: FORBIDDEN
  // status: FORBIDDEN (always starts as 'draft')
  // created_by: FORBIDDEN (set from auth context)
  // approval_status: FORBIDDEN
}).strict(); // Reject unknown properties

router.post('/campaigns', authenticate, async (req, res) => {
  const validation = CreateCampaignSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: validation.error.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  const data = validation.data;

  // Business rule validation
  if (new Date(data.end_date) <= new Date(data.start_date)) {
    return res.status(400).json({
      error: 'end_date must be after start_date',
    });
  }

  if (data.target_audience && data.target_audience.age_max < data.target_audience.age_min) {
    return res.status(400).json({
      error: 'age_max must be >= age_min',
    });
  }

  // Server-controlled fields only
  const campaign = await db('campaigns').insert({
    ...data,
    organization_id: req.user.organizationId,
    created_by: req.user.id,
    status: 'draft', // Server-enforced
    budget_spent: 0, // Server-enforced
    approval_status: 'pending', // Server-enforced
  }).returning('*');

  res.status(201).json(campaign);
});
```

**Effort:** 8 hours (all endpoints)

---

#### INPUT-002: File Upload Extension Bypass **[SEVERITY: HIGH]**

| Attribute | Value |
|-----------|-------|
| CVSS 3.1 | 7.5 (High) |
| CWE | CWE-434 (Unrestricted Upload) |

**Description:** File upload validates extension but not MIME type or file content, allowing polyglot files and extension spoofing.

**Remediation:**
```typescript
import { fileTypeFromBuffer } from 'file-type';
import { createHash } from 'crypto';
import sanitize from 'sanitize-filename';
import path from 'path';

const ALLOWED_TYPES = new Map([
  ['image/jpeg', { ext: ['.jpg', '.jpeg'], maxSize: 5 * 1024 * 1024 }],
  ['image/png', { ext: ['.png'], maxSize: 5 * 1024 * 1024 }],
  ['image/webp', { ext: ['.webp'], maxSize: 5 * 1024 * 1024 }],
  ['image/avif', { ext: ['.avif'], maxSize: 5 * 1024 * 1024 }],
]);

const UPLOAD_DIR = '/var/uploads';
// Ensure upload dir is outside web root and non-executable

router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const buffer = req.file.buffer;

  // 1. Validate actual file content (magic bytes)
  const fileType = await fileTypeFromBuffer(buffer);
  if (!fileType || !ALLOWED_TYPES.has(fileType.mime)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }

  const config = ALLOWED_TYPES.get(fileType.mime)!;

  // 2. Validate file size
  if (buffer.length > config.maxSize) {
    return res.status(400).json({
      error: `File too large. Max: ${config.maxSize / 1024 / 1024}MB`,
    });
  }

  // 3. Generate safe filename (not user-provided)
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  const ext = config.ext[0];
  const safeName = `${hash}${ext}`;

  // 4. Store with randomized path to prevent traversal
  const subDir = safeName.slice(0, 2);
  const destPath = path.join(UPLOAD_DIR, subDir, safeName);

  // 5. Ensure path is within upload directory
  if (!destPath.startsWith(UPLOAD_DIR)) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, buffer);

  // 6. Optional: Virus scan (ClamAV)
  const scanResult = await clamav.scanBuffer(buffer);
  if (!scanResult.clean) {
    await fs.unlink(destPath);
    return res.status(400).json({ error: 'File failed security scan' });
  }

  // 7. Strip metadata (EXIF) from images
  if (fileType.mime.startsWith('image/')) {
    await stripExifMetadata(destPath);
  }

  res.json({
    url: `/uploads/${subDir}/${safeName}`, // CDN URL, not filesystem path
    size: buffer.length,
    type: fileType.mime,
  });
});
```

**Effort:** 6 hours

---

#### INPUT-003: Mass Assignment on User Profile Update **[SEVERITY: MEDIUM]**

**Description:** User profile update accepts arbitrary fields including `role` and `organizationId`.

**Remediation:**
```typescript
const UpdateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  timezone: z.string().max(50).optional(),
  language: z.string().length(2).optional(),
  notification_preferences: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
  }).optional(),
}).strict();
// role, organizationId, id are NOT in the schema
```

**Effort:** 2 hours

---

#### INPUT-004: CSV Injection in Export Feature **[SEVERITY: MEDIUM]**

**Description:** Report exports in CSV format do not sanitize formula injection payloads like `=cmd|' /C calc'!A0`.

**Remediation:**
```typescript
function sanitizeCSVField(value: string): string {
  // Prefix with tab to neutralize formulas
  if (/^[=+\-@\t\r]/.test(value)) {
    return `\t${value}`;
  }
  // Quote and escape if contains special characters
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Set MIME type to prevent auto-execution
res.setHeader('Content-Type', 'text/csv; charset=utf-8');
res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
// Add BOM for Excel UTF-8 support without formula execution
res.write('\uFEFF');
```

**Effort:** 2 hours

---

## 4. XSS Prevention

### 4.1 Defense Strategy

```
Layer 1: Content Security Policy (CSP)          → Block execution
Layer 2: Output Encoding (React default)         → Prevent injection
Layer 3: Input Sanitization (DOMPurify)          → Clean HTML
Layer 4: HTTP-only Cookies                       → Prevent token theft
```

### 4.2 Findings

#### XSS-001: CSP Policy Too Permissive **[SEVERITY: HIGH]**

| Attribute | Value |
|-----------|-------|
| CVSS 3.1 | 6.1 (Medium) |
| CWE | CWE-693 |

**Description:** Current CSP allows `unsafe-inline` and `unsafe-eval`, defeating the primary XSS protection mechanism.

**Current:**
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.openai.com;
```

**Remediation:**
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM}' https://cdn.jsdelivr.net;
  style-src 'self' 'nonce-{RANDOM}' https://fonts.googleapis.com;
  img-src 'self' data: https://cdn.example.com https://*.googleusercontent.com;
  connect-src 'self' https://api.example.com wss://realtime.example.com;
  font-src 'self' https://fonts.gstatic.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
  block-all-mixed-content;
```

**Nonce generation (server-side):**
```typescript
app.use((req, res, next) => {
  res.locals.cspNonce = randomBytes(16).toString('base64');
  res.setHeader('Content-Security-Policy',
    cspPolicy.replace(/{NONCE}/g, res.locals.cspNonce)
  );
  next();
});
```

**Effort:** 4 hours

---

#### XSS-002: Dangerous HTML in Campaign Descriptions **[SEVERITY: MEDIUM]**

**Description:** Rich text editor content is rendered with `dangerouslySetInnerHTML` without sufficient sanitization.

**Remediation:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3',
  'ul', 'ol', 'li', 'a', 'blockquote',
];
const ALLOWED_ATTRS = {
  'a': ['href'],
};

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

// Server-side sanitization (on save)
function sanitizeRichText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    // Force all links to open in new tab with noopener
    FORBID_ATTR: ['onclick', 'onerror', 'onload'],
    // Hook to add rel="noopener noreferrer" to all links
    uponSanitizeElement: (node) => {
      if (node.tagName === 'A') {
        const href = node.getAttribute('href') || '';
        try {
          const url = new URL(href, 'http://localhost');
          if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
            node.removeAttribute('href');
          }
        } catch {
          node.removeAttribute('href');
        }
        node.setAttribute('rel', 'noopener noreferrer');
        node.setAttribute('target', '_blank');
      }
    },
  });
}

// Client-side sanitization (belt and suspenders)
function SafeHTML({ content }: { content: string }) {
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

**Effort:** 3 hours

---

#### XSS-003: Missing XSS Protection on AI Agent Output **[SEVERITY: MEDIUM]**

**Description:** AI-generated content is rendered in the chat interface without sanitization. LLM output could contain HTML/JS payloads.

**Remediation:**
```typescript
// AI responses should be treated as untrusted user input
function AIChatMessage({ message }: { message: AIMessage }) {
  if (message.type === 'structured') {
    // Render structured data with explicit React components
    return <StructuredCampaignCard data={message.data} />;
  }

  // Plain text - always escape
  return (
    <div className="ai-message">
      {message.content.split('\n').map((line, i) => (
        <p key={i}>{line}</p> // React auto-escapes
      ))}
    </div>
  );
}

// Never use dangerouslySetInnerHTML for AI output
```

**Effort:** 1 hour

---

## 5. CSRF Protection

### 5.1 Current Implementation

The application uses a combination of:
1. `SameSite=Strict` cookies (primary defense)
2. Custom `X-CSRF-Token` header verification (secondary)
3. Origin header validation

### 5.2 Findings

#### CSRF-001: State-Changing GET Requests **[SEVERITY: MEDIUM]**

**Description:** Several endpoints use GET for state-changing operations, bypassing CSRF protections.

**Affected Endpoints:**
- `GET /api/v1/campaigns/:id/pause` — Pauses a campaign
- `GET /api/v1/notifications/:id/dismiss` — Dismisses notification
- `GET /api/v1/approvals/:id/approve` — Approves a request

**Remediation:**
```typescript
// All state-changing operations MUST use POST/PUT/PATCH/DELETE
router.post('/campaigns/:id/pause', authenticate, csrfProtection, async (req, res) => {
  // ...
});

// Add linting rule to enforce
// eslint-plugin-no-get-state-change
```

**Effort:** 4 hours (refactor + client update)

---

#### CSRF-002: Token Not Required for API Key Authentication **[SEVERITY: LOW]**

**Description:** When using API key authentication, CSRF token is not required. This is acceptable since API keys should only be used server-to-server, but needs explicit documentation.

**Remediation:**
```typescript
const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for API key auth (intentional)
  if (req.headers['x-api-key']) {
    return next();
  }

  // Enforce for cookie-based auth
  const token = req.headers['x-csrf-token'];
  if (!token || token !== req.cookies['csrf_token']) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
};

// Document this behavior
/**
 * @security API Key authentication bypasses CSRF protection.
 * API keys MUST only be used in server-to-server contexts.
 * Never expose API keys in client-side code or browsers.
 */
```

---

## 6. SQL Injection Prevention

### 6.1 Current Implementation

The application uses Knex.js query builder with parameterized queries as the primary defense.

### 6.2 Findings

#### SQL-001: Raw Query in Search Endpoint **[SEVERITY: MEDIUM]**

| Attribute | Value |
|-----------|-------|
| CVSS 3.1 | 6.5 (Medium) |
| CWE | CWE-89 |

**Description:** Campaign search uses raw SQL for full-text search with improper parameterization.

**Current:**
```typescript
// BAD: String concatenation in SQL
router.get('/campaigns/search', authenticate, async (req, res) => {
  const { q } = req.query;
  const campaigns = await db.raw(`
    SELECT * FROM campaigns
    WHERE name ILIKE '%${q}%'
    OR description ILIKE '%${q}%'
  `); // SQL INJECTION VULNERABILITY
  res.json(campaigns);
});
```

**Remediation:**
```typescript
// GOOD: Parameterized query with validation
router.get('/campaigns/search', authenticate, async (req, res) => {
  const { q } = req.query;

  // Validate and sanitize search input
  const searchTerm = typeof q === 'string' ? q.trim() : '';
  if (!searchTerm || searchTerm.length > 100) {
    return res.status(400).json({ error: 'Invalid search term' });
  }

  // Use parameterized query
  const campaigns = await db('campaigns')
    .where({ organization_id: req.user.organizationId })
    .andWhere(builder => {
      builder
        .whereILike('name', `%${searchTerm}%`) // Knex auto-parameterizes
        .orWhereILike('description', `%${searchTerm}%`);
    })
    .whereNull('deleted_at')
    .limit(100) // Prevent result set exhaustion
    .select('*');

  res.json(campaigns);
});
```

**Effort:** 2 hours

---

#### SQL-002: Sort Parameter Not Validated **[SEVERITY: LOW]**

**Description:** The `sort` query parameter is passed directly to ORDER BY without validation, allowing arbitrary column sorting and potential information disclosure.

**Remediation:**
```typescript
const ALLOWED_SORT_COLUMNS = new Set([
  'name', 'created_at', 'updated_at', 'budget_total',
  'start_date', 'end_date', 'status',
]);

router.get('/campaigns', authenticate, async (req, res) => {
  const {
    sort = 'created_at',
    order = 'desc',
    page = 1,
    limit = 20,
  } = req.query;

  // Validate sort column against allowlist
  const sortColumn = ALLOWED_SORT_COLUMNS.has(String(sort))
    ? String(sort)
    : 'created_at';

  // Validate order direction
  const sortOrder = order === 'asc' ? 'asc' : 'desc';

  // Validate pagination bounds
  const pageNum = Math.min(Math.max(Number(page) || 1, 1), 1000);
  const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const campaigns = await db('campaigns')
    .where({ organization_id: req.user.organizationId })
    .whereNull('deleted_at')
    .orderBy(sortColumn, sortOrder)
    .offset((pageNum - 1) * limitNum)
    .limit(limitNum);

  res.json(campaigns);
});
```

**Effort:** 2 hours

---

### 6.3 SQL Injection Prevention Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | All queries use parameterized statements | Warning | 2 raw queries found (SQL-001) |
| 2 | No string concatenation in SQL | Warning | Search endpoint (SQL-001) |
| 3 | ORM/query builder used consistently | Pass | Knex.js throughout |
| 4 | User input never in ORDER BY without validation | Warning | Sort param (SQL-002) |
| 5 | User input never in table/column names | Pass | Allowlist approach |
| 6 | Connection uses least-privilege DB user | Pass | `app_user` role, no DDL |
| 7 | Database query logging (no secrets) | Pass | PII redacted |
| 8 | Prepared statements enabled | Pass | PostgreSQL prepare |

---

## 7. Secret Management

### 7.1 Current State

| Secret | Location | Rotation | Risk |
|--------|----------|----------|------|
| Database password | `.env` file | Manual | High |
| JWT private key | `.env` file | Never | Critical |
| OpenAI API key | `.env` file | Never | High |
| Redis password | `.env` file | Manual | Medium |
| AWS credentials | `.env` file | Manual | High |
| OAuth client secrets | `.env` file | Never | Medium |
| Encryption keys | `.env` file | Never | Critical |

### 7.2 Findings

#### SEC-001: JWT Private Key in Environment Variable **[SEVERITY: CRITICAL]**

| Attribute | Value |
|-----------|-------|
| CVSS 3.1 | 9.2 (Critical) |
| CWE | CWE-798 |

**Description:** RSA private key for JWT signing is stored in the `JWT_PRIVATE_KEY` environment variable. Key has never been rotated and may be exposed in process listings, logs, or backups.

**Remediation:**
```typescript
// Use AWS Secrets Manager (or HashiCorp Vault)
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

async function getJWTPrivateKey(): Promise<string> {
  const command = new GetSecretValueCommand({
    SecretId: 'prod/campaign-platform/jwt-signing-key',
  });
  const response = await secretsClient.send(command);
  return response.SecretString!;
}

// Key rotation strategy (automated)
// 1. Generate new key pair
// 2. Store new private key in Secrets Manager with version
// 3. Update JWKS endpoint to include BOTH public keys
// 4. After 24 hours (all old tokens expired), remove old public key
// 5. Mark old private key as deprecated

// JWKS endpoint for token verification
app.get('/.well-known/jwks.json', async (req, res) => {
  const keys = await getActivePublicKeys(); // Multiple keys for rotation period
  res.json({ keys: keys.map(k => ({ ...k, use: 'sig', alg: 'RS256' })) });
});
```

**Effort:** 8 hours

---

#### SEC-002: Database Credentials in `.env` File **[SEVERITY: HIGH]**

**Description:** Database connection string with credentials stored in plaintext `.env` file on application servers.

**Remediation:**
```yaml
# ECS Task Definition - Use secrets injection
{
  "containerDefinitions": [
    {
      "name": "api",
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:account:secret:prod/db-credentials"
        },
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:account:secret:prod/openai-key"
        },
        {
          "name": "JWT_PRIVATE_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:account:secret:prod/jwt-key"
        }
      ],
      // ...
    }
  ]
}
```

**Effort:** 4 hours

---

#### SEC-003: API Keys Logged in Plaintext **[SEVERITY: HIGH]**

**Description:** API request logging includes `Authorization` headers and query parameters containing API keys.

**Remediation:**
```typescript
import { createLogger, format } from 'winston';

const SENSITIVE_FIELDS = new Set([
  'password', 'token', 'secret', 'key', 'authorization',
  'cookie', 'credit_card', 'ssn', 'api_key',
]);

function sanitizeLog(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj as Record<string, unknown> };

  for (const [key, value] of Object.entries(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLog(value);
    }
  }

  return sanitized;
}

const logger = createLogger({
  format: format.combine(
    format((info) => sanitizeLog(info))(),
    format.json()
  ),
  // ...
});
```

**Effort:** 2 hours

---

#### SEC-004: Secret Rotation Not Automated **[SEVERITY: MEDIUM]**

**Description:** No automated secret rotation is configured for any service credentials.

**Remediation:**
```typescript
// Automated rotation with AWS Secrets Manager
// Rotation Lambda function
export const handler = async (event: SecretsManagerRotationEvent) => {
  const { SecretId, ClientRequestToken, Step } = event;

  switch (Step) {
    case 'createSecret':
      // Generate new credentials
      const newPassword = generateSecurePassword(32);
      await secretsManager.putSecretValue({
        SecretId,
        ClientRequestToken,
        SecretString: JSON.stringify({ password: newPassword }),
        VersionStages: ['AWSPENDING'],
      });
      break;

    case 'setSecret':
      // Update database with new credentials
      const secret = await secretsManager.getSecretValue({
        SecretId,
        VersionStage: 'AWSPENDING',
      });
      const { password } = JSON.parse(secret.SecretString!);
      await updateDatabasePassword(password);
      break;

    case 'testSecret':
      // Verify new credentials work
      await testDatabaseConnection(SecretId, 'AWSPENDING');
      break;

    case 'finishSecret':
      // Promote new version
      await secretsManager.updateSecretVersionStage({
        SecretId,
        VersionStage: 'AWSCURRENT',
        MoveToVersionId: ClientRequestToken,
        RemoveFromVersionId: await getCurrentVersion(SecretId),
      });
      break;
  }
};

// Rotation schedule: 90 days for all secrets
// aws secretsmanager rotate-secret --secret-id prod/db-credentials --rotation-lambda-arn arn:... --automatically-after-days 90
```

**Effort:** 16 hours

---

## 8. Dependency Vulnerabilities

### 8.1 Scan Results

```bash
$ npm audit --production
# npm audit report

jsonwebtoken  <=8.5.1
Severity: high
JWT algorithm confusion - https://github.com/advisories/GHSA-hjrf-2m68-5959
fix available via `npm audit fix`

lodash  <4.17.21
Severity: high
Command Injection - https://github.com/advisories/GHSA-35jh-r3h4-6jhm
fix available via `npm audit fix`

axios  0.8.1 - 1.5.1
Severity: moderate
Axios Cross-Site Request Forgery - https://github.com/advisories/GHSA-wf5p-g6vw-rnxx
dependency of @ai-sdk/openai

semver  <=5.7.2 || 6.0.0 - 6.3.0 || 7.0.0 - 7.5.1
Severity: moderate
Regular Expression Denial of Service - https://github.com/advisories/GHSA-c2qf-rxjj-qqwg

dottie  <2.0.4
Severity: moderate
Prototype Pollution - https://github.com/advisories/GHSA-4rjr-3gg8-5pqr
```

### 8.2 Remediation Plan

| Package | Current | Fix Version | Severity | Action |
|---------|---------|-------------|----------|--------|
| jsonwebtoken | 8.5.1 | 9.0.2 | High | `npm update jsonwebtoken` |
| lodash | 4.17.20 | 4.17.21 | High | `npm update lodash` |
| axios | 1.5.0 | 1.6.0 | Moderate | `npm update axios` |
| semver | 7.5.1 | 7.5.4 | Moderate | `npm update semver` |
| dottie | 2.0.3 | 2.0.6 | Moderate | `npm update dottie` |

### 8.3 Ongoing Dependency Security

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm audit --audit-level=moderate
      - run: npx better-npm-audit audit --exclude 1234,5678 # Known acceptable risks

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/owasp-top-ten
            p/cwe-top-25
            p/xss
            p/injection

  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD

  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anchore/sbom-action@v0
        with:
          format: spdx-json
          output-file: sbom.spdx.json
      - uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.spdx.json
```

---

## 9. Additional Security Measures

### 9.1 Rate Limiting

```typescript
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

// Strict limits for auth endpoints
const authLimiter = rateLimit({
  store: new RedisStore({ sendCommand: redis.sendCommand.bind(redis) }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip!, // Per-IP
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many attempts',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// General API limiting
const apiLimiter = rateLimit({
  store: new RedisStore({ sendCommand: redis.sendCommand.bind(redis) }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req) => req.user?.id || req.ip!,
});

// AI endpoint - stricter (cost control)
const aiLimiter = rateLimit({
  store: new RedisStore({ sendCommand: redis.sendCommand.bind(redis) }),
  windowMs: 60 * 1000,
  max: 10, // 10 AI requests per minute
});

app.use('/api/v1/auth/', authLimiter);
app.use('/api/v1/', apiLimiter);
app.use('/api/v1/ai/', aiLimiter);
```

### 9.2 Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://cdn.example.com'],
      connectSrc: ["'self'", 'https://api.example.com', 'wss://realtime.example.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedded resources
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: false, // Deprecated; CSP is sufficient
}));
```

### 9.3 Request Signing for Webhooks

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Timing-safe comparison
  try {
    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

// Usage
app.post('/webhooks/integration', (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;

  if (!verifyWebhookSignature(JSON.stringify(req.body), signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook...
});
```

---

## 10. Remediation Summary

| ID | Finding | Severity | Effort | Status |
|----|---------|----------|--------|--------|
| AUTH-001 | Refresh token rotation missing | High | 6h | Open |
| AUTH-002 | OAuth state param validation gap | Medium | 4h | Open |
| AUTH-003 | Password reset token entropy | Medium | 2h | Open |
| AUTHZ-001 | Missing ownership validation (IDOR) | High | 8h | Open |
| AUTHZ-002 | Role promotion vulnerability | High | 3h | Open |
| AUTHZ-003 | Missing tenant isolation | Medium | 6h | Open |
| AUTHZ-004 | API endpoints missing auth | Medium | 12h | Open |
| INPUT-001 | Mass assignment on campaign creation | Critical | 8h | Open |
| INPUT-002 | File upload extension bypass | High | 6h | Open |
| INPUT-003 | Mass assignment on profile | Medium | 2h | Open |
| INPUT-004 | CSV injection in exports | Medium | 2h | Open |
| XSS-001 | CSP policy too permissive | High | 4h | Open |
| XSS-002 | Dangerous HTML in descriptions | Medium | 3h | Open |
| XSS-003 | AI output not sanitized | Medium | 1h | Open |
| CSRF-001 | State-changing GET requests | Medium | 4h | Open |
| SQL-001 | Raw SQL in search | Medium | 2h | Open |
| SQL-002 | Unvalidated sort parameter | Low | 2h | Open |
| SEC-001 | JWT key in env var | Critical | 8h | Open |
| SEC-002 | DB credentials in .env | High | 4h | Open |
| SEC-003 | API keys in logs | High | 2h | Open |
| SEC-004 | No secret rotation | Medium | 16h | Open |
| DEP-001 | jsonwebtoken vulnerability | High | 1h | Open |
| DEP-002 | lodash vulnerability | High | 1h | Open |
| DEP-003-005 | Moderate severity packages | Moderate | 2h | Open |

**Total effort to remediate: 110 hours (~14 person-days)**

**Priority order:**
1. P0 (Critical): INPUT-001, SEC-001 — Block release
2. P1 (High): AUTH-001, AUTHZ-001, AUTHZ-002, XSS-001, SEC-002, SEC-003, DEP-001, DEP-002
3. P2 (Medium): All remaining Medium severity items
4. P3 (Low): SQL-002, documentation items

---

## 11. Security Monitoring

### 11.1 SIEM Alert Rules

```yaml
# Datadog security monitoring rules
rules:
  - name: "Multiple Failed Logins"
    query: "source:auth status:failed @auth.attempts:>5"
    threshold: 10
    window: 15m
    severity: high

  - name: "Token Reuse Detected"
    query: "source:auth @auth.event:token_reuse"
    threshold: 1
    severity: critical

  - name: "IDOR Attempt"
    query: "source:api @http.status_code:404 @api.potential_idor:true"
    threshold: 20
    window: 5m
    severity: medium

  - name: "Privilege Escalation Attempt"
    query: "source:api @auth.event:role.promotion_attempt"
    threshold: 1
    severity: high

  - name: "Mass Data Export"
    query: "source:api @api.endpoint:*/export* @http.status_code:200"
    threshold: 50
    window: 10m
    severity: medium

  - name: "SQL Injection Pattern"
    query: "source:waf @waf.rule:sqi-* @waf.action:blocked"
    threshold: 5
    window: 5m
    severity: high
```

### 11.2 Audit Logging Schema

```typescript
interface AuditLogEntry {
  id: string;                    // UUID
  timestamp: string;             // ISO 8601
  event_type: string;            // 'campaign.create' | 'auth.login' | etc.
  severity: 'info' | 'warning' | 'critical';
  actor: {
    user_id: string;
    email: string;
    ip_address: string;
    user_agent: string;
    session_id: string;
  };
  resource: {
    type: string;               // 'campaign' | 'user' | 'report'
    id: string;
    organization_id: string;
  };
  action: {
    type: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'reject';
    details: Record<string, unknown>;
  };
  result: 'success' | 'failure' | 'denied';
  metadata: {
    request_id: string;
    changes?: Record<string, { old: unknown; new: unknown }>;
    reason?: string;             // For denials
  };
}
```

---

## Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Security Lead | | | |
| DevOps Lead | | | |
| Engineering Lead | | | |
| Product Owner | | | |
