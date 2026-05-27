# Quality Assurance Checklist

> **Project:** AI-Powered Marketing Campaign Management Platform
> **Version:** 1.0.0
> **Environment:** Production Staging (pre-release)
> **Date:** 2025-01-15
> **Status:** Pending Review

---

## Legend

| Symbol | Meaning |
|--------|---------|
| [ ] | Not Tested |
| [x] | Passed |
| [-] | Failed |
| [~] | Blocked / Skipped |
| [P] | In Progress |

**Severity:**
- **P0 (Critical)** — Blocks release, data loss or security risk
- **P1 (High)** — Core functionality impaired
- **P2 (Medium)** — Degraded experience, workaround available
- **P3 (Low)** — Cosmetic, documentation

---

## 1. Authentication Flows (10 Test Cases)

### 1.1 Login Flow

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 1.1.1 | **Valid credential login** | 1. Navigate to `/login`<br>2. Enter valid email/password<br>3. Click "Sign In" | User authenticated, redirected to dashboard, JWT token stored in `httpOnly` cookie | P0 | [ ] | Verify `Set-Cookie` header present |
| 1.1.2 | **Invalid credential rejection** | 1. Enter invalid email/password<br>2. Click "Sign In" | Error message displayed: "Invalid credentials". No token issued. Rate limit counter incremented. | P0 | [ ] | Verify 401 response |
| 1.1.3 | **Rate limiting after 5 failures** | 1. Attempt login 5 times with wrong password<br>2. Attempt 6th time | 6th attempt blocked with "Too many attempts. Try again in 15 minutes." | P0 | [ ] | Check `429` status, `Retry-After` header |
| 1.1.4 | **Session expiry handling** | 1. Log in successfully<br>2. Wait for token expiry (or manipulate token)<br>3. Refresh page | User redirected to login page with toast: "Session expired. Please sign in again." | P0 | [ ] | Verify refresh token rotation |
| 1.1.5 | **Multi-tab session sync** | 1. Log in on Tab A<br>2. Open app in Tab B<br>3. Logout from Tab A<br>4. Interact with Tab B | Tab B detects session termination via `storage` event, redirects to login | P1 | [ ] | BroadcastChannel/localStorage sync |

### 1.2 Registration Flow

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 1.2.1 | **New user registration** | 1. Navigate to `/register`<br>2. Fill valid form (email, password, confirm, org name)<br>3. Submit | Account created, verification email sent, redirected to "Check your email" page | P0 | [ ] | Verify email queue entry |
| 1.2.2 | **Duplicate email prevention** | 1. Register with email `user@example.com`<br>2. Attempt second registration with same email | Error: "An account with this email already exists." No DB duplication. | P0 | [ ] | 409 Conflict response |
| 1.2.3 | **Password strength validation** | 1. Enter weak passwords: "123", "password", "abc"<br>2. Submit each | Inline validation rejects passwords < 12 chars or missing complexity. Strength meter updates. | P1 | [ ] | Check zxcvbn integration |

### 1.3 Logout & Recovery

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 1.3.1 | **Logout clears all session data** | 1. Log in<br>2. Navigate to multiple pages<br>3. Click Logout | JWT cookie cleared, `localStorage` purged, redirected to `/login`. Back button to dashboard triggers auth check. | P0 | [ ] | Verify cookie `Max-Age=0` |
| 1.3.2 | **Password reset flow** | 1. Click "Forgot password"<br>2. Enter registered email<br>3. Click reset link<br>4. Set new password | Reset token single-use, expires in 1hr. New password hashes with bcrypt(12). Old sessions invalidated. | P0 | [ ] | Verify token UUID format |
| 1.3.3 | **OAuth (Google) login** | 1. Click "Sign in with Google"<br>2. Complete Google consent<br>3. Return to app | Account linked/created, profile populated, JWT issued. Existing email account merges correctly. | P1 | [ ] | Verify state param CSRF check |

**Authentication Section Status:** 0/10 passed | 0 failed | 0 blocked

---

## 2. Campaign Management (15 Test Cases)

### 2.1 Campaign CRUD

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 2.1.1 | **Create campaign with all fields** | 1. Click "New Campaign"<br>2. Fill name, description, channels, schedule, budget, audience<br>3. Save | Campaign persisted to DB with UUID. Appears in list with "Draft" status. Audit log entry created. | P0 | [ ] | Verify optimistic UI update |
| 2.1.2 | **Campaign form validation** | 1. Submit empty form<br>2. Enter invalid dates (end < start)<br>3. Negative budget | Inline errors for each field. Submit blocked. No API call until valid. | P0 | [ ] | Check React Hook Form errors |
| 2.1.3 | **Campaign edit preserves history** | 1. Open existing campaign<br>2. Modify description and budget<br>3. Save | Changes persisted. Previous version saved in `campaign_history` table. Diff visible in audit trail. | P1 | [ ] | Verify history table entry |
| 2.1.4 | **Campaign soft delete** | 1. Select campaign<br>2. Click "Delete"<br>3. Confirm dialog | Campaign marked `deleted_at`. Removed from active list. Restorable from "Archived" view. | P1 | [ ] | No hard delete; cascade check |
| 2.1.5 | **Duplicate campaign** | 1. Click "Duplicate" on existing campaign<br>2. Confirm | New campaign created with "(Copy)" suffix. All settings cloned except status resets to Draft. | P2 | [ ] | Deep clone all relations |

### 2.2 Campaign Listing & Filtering

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 2.2.1 | **Pagination with 100+ campaigns** | 1. Navigate to campaigns list<br>2. Scroll to bottom / click next page | Page 2 loads with correct offset. URL query param `?page=2`. Browser back restores page 1. | P1 | [ ] | Test cursor vs offset pagination |
| 2.2.2 | **Filter by status, date, channel** | 1. Select status "Active"<br>2. Select date range<br>3. Select channel "Email" | Results filtered in real-time. Filter pills shown. "Clear all" resets. Query reflected in URL. | P1 | [ ] | Debounce at 300ms |
| 2.2.3 | **Search by campaign name** | 1. Type "Summer Sale" in search box<br>2. Press Enter | Results filtered. Partial match works. Case insensitive. Empty state shown if no match. | P1 | [ ] | Full-text index on name |
| 2.2.4 | **Sort by budget, date, name** | 1. Click column headers<br>2. Verify ascending/descending | Sort indicator shows direction. URL param updated. Works with filters combined. | P2 | [ ] | Server-side sort |

### 2.3 Campaign Scheduling

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 2.3.1 | **Schedule future campaign** | 1. Set start date to tomorrow<br>2. Set status to "Scheduled"<br>3. Save | Campaign appears in "Scheduled" tab. Job queued in task scheduler. Owner receives confirmation. | P0 | [ ] | Verify cron job entry |
| 2.3.2 | **Schedule conflict detection** | 1. Schedule Campaign A: Jan 15-20<br>2. Try scheduling Campaign B: Jan 18-25 on same channel | Warning displayed: "Channel overlap detected." User can force continue or adjust. | P2 | [ ] | Conflict matrix check |
| 2.3.3 | **Timezone handling** | 1. Set campaign schedule in EST<br>2. View from PST timezone<br>3. Verify execution time | Display shows in user's local timezone. Execution uses configured timezone. No UTC drift. | P1 | [ ] | Moment-timezone or date-fns-tz |
| 2.3.4 | **Campaign auto-launch** | 1. Schedule campaign 2 minutes from now<br>2. Wait | At scheduled time, status changes "Active". WebSocket push to connected clients. Email notification sent. | P0 | [ ] | Event-driven, not poll |
| 2.3.5 | **Campaign auto-pause on budget exhaustion** | 1. Set budget cap of $100<br>2. Let campaign spend reach $100 | Campaign status changes to "Budget Exceeded". All ads paused. Alert email dispatched. | P0 | [ ] | Real-time budget tracking |
| 2.3.6 | **Bulk campaign operations** | 1. Select 10 campaigns via checkboxes<br>2. Choose "Pause" from bulk actions<br>3. Confirm | All selected campaigns paused. Batch API call. Progress indicator shown. Partial failure handled. | P2 | [ ] | Atomic transactions |

**Campaign Management Section Status:** 0/15 passed | 0 failed | 0 blocked

---

## 3. Draft Approval Workflow (12 Test Cases)

### 3.1 Submission Flow

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 3.1.1 | **Submit draft for approval** | 1. Open draft campaign<br>2. Click "Submit for Approval"<br>3. Select approver from dropdown<br>4. Add notes<br>5. Submit | Status changes to "Pending Approval". Approver receives email + in-app notification. Submission logged. | P0 | [ ] | Verify notification trigger |
| 3.1.2 | **Cannot edit pending draft** | 1. Submit draft for approval<br>2. Attempt to edit any field | All form fields disabled. "Withdraw" button available. Toast: "This draft is pending approval." | P1 | [ ] | UI state + API guard |
| 3.1.3 | **Withdraw submission** | 1. Submit for approval<br>2. Click "Withdraw"<br>3. Confirm withdrawal | Status reverts to "Draft". Approver notification cancelled if unread. Withdrawal logged in audit trail. | P1 | [ ] | Idempotent withdrawal |
| 3.1.4 | **Resubmit after changes** | 1. Withdraw pending draft<br>2. Make edits<br>3. Resubmit | New approval request created. Previous approval thread archived. Approver sees latest version. | P1 | [ ] | Version increment check |

### 3.2 Approval Flow

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 3.2.1 | **Approver approves draft** | 1. Login as approver<br>2. View pending approvals<br>3. Click "Approve"<br>4. Add optional comments | Status changes to "Approved". Campaign becomes launchable. Submitter notified. Approval audit trail updated. | P0 | [ ] | Role-based access check |
| 3.2.2 | **Approver rejects with feedback** | 1. Login as approver<br>2. View pending approval<br>3. Click "Reject"<br>4. Enter required rejection reason | Status changes to "Rejected". Submitter receives notification with feedback. Draft editable again. | P0 | [ ] | Rejection reason mandatory |
| 3.2.3 | **Multi-level approval (serial)** | 1. Submit draft → Manager approval<br>2. Manager approves → Director approval<br>3. Director approves | Status progression: Draft → Pending Manager → Pending Director → Approved. Each level notified sequentially. | P0 | [ ] | Workflow engine state machine |
| 3.2.4 | **Multi-level approval (parallel)** | 1. Configure parallel approval (Manager + Legal)<br>2. Submit draft<br>3. Both approve | Status changes to Approved only when ALL parallel approvers approve. Any rejection blocks. | P0 | [ ] | AND logic for parallel |
| 3.2.5 | **Approval delegation** | 1. Approver A sets out-of-office with delegate B<br>2. Submit draft to A<br>3. B receives and approves | Approval credited to B on behalf of A. Audit trail reflects delegation chain. | P2 | [ ] | Delegation chain validation |

### 3.3 Notifications & Escalation

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 3.3.1 | **Approval reminder notifications** | 1. Submit draft for approval<br>2. Do not action for 24 hours | Reminder email sent at 24hr. Escalation at 48hr. Configurable intervals. | P2 | [ ] | Cron-based reminder job |
| 3.3.2 | **Approval deadline with auto-escalation** | 1. Set approval SLA to 4 hours<br>2. Submit draft<br>3. Wait 4 hours without action | Auto-escalated to next level manager. Original approver notified of escalation. | P2 | [ ] | SLA timer in workflow engine |
| 3.3.3 | **In-app notification bell** | 1. Receive approval request<br>2. Check notification bell icon | Red badge with count. Click opens dropdown with approval requests. Mark-as-read functionality. | P1 | [ ] | Real-time via WebSocket |

**Draft Approval Section Status:** 0/12 passed | 0 failed | 0 blocked

---

## 4. AI Agent (10 Test Cases)

### 4.1 Chat Interface

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 4.1.1 | **Send message and receive response** | 1. Open AI Agent panel<br>2. Type "Suggest a campaign for Q1"<br>3. Send | Message appears in chat history. Typing indicator shown. AI response streamed in real-time. | P0 | [ ] | SSE/streaming response |
| 4.1.2 | **Message history persistence** | 1. Chat with AI<br>2. Close panel<br>3. Refresh page<br>4. Reopen panel | Previous conversation restored from DB. Scroll position maintained. | P1 | [ ] | IndexedDB + server sync |
| 4.1.3 | **Clear conversation** | 1. Have active conversation<br>2. Click "Clear Chat"<br>3. Confirm | All messages removed. New session started. Previous conversation archived (not deleted). | P2 | [ ] | Soft delete for audit |
| 4.1.4 | **Rate limiting on AI requests** | 1. Send 50 messages rapidly<br>2. Send 51st | 51st message blocked with: "Rate limit exceeded. Try again in 1 minute." Token usage displayed. | P1 | [ ] | Sliding window counter |

### 4.2 AI Functionality

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 4.1.5 | **Generate campaign from prompt** | 1. Type "Create a summer sale email campaign targeting 18-25"<br>2. Send | AI generates structured campaign draft with title, channels, suggested budget, timeline. User can "Apply to Editor." | P0 | [ ] | Structured output parsing |
| 4.1.6 | **AI-generated content approval** | 1. Generate AI content<br>2. Review and click "Use This"<br>3. Verify in editor | Content populated in campaign editor. Marked with "AI-generated" badge. Human review required flag set. | P1 | [ ] | Watermark/attribution |
| 4.1.7 | **AI suggestion relevance** | 1. Enter campaign context (product, audience)<br>2. Ask for suggestions | Suggestions are contextually relevant. No hallucinated products or features. Confidence score shown. | P1 | [ ] | RAG validation check |
| 4.1.8 | **AI error handling (model unavailable)** | 1. Trigger AI request<br>2. Simulate upstream AI model failure | Graceful error: "AI service temporarily unavailable. Please try again later." Fallback to template suggestions. | P0 | [ ] | Circuit breaker pattern |
| 4.1.9 | **Token usage tracking** | 1. Send multiple messages<br>2. Check usage panel | Token count accurate. Cost estimate shown. Alert at 80% of quota. Monthly reset functional. | P2 | [ ] | Usage meter accuracy |
| 4.1.10 | **AI context awareness (campaign-specific)** | 1. Open a specific campaign<br>2. Ask "What channels are performing best?" | AI has access to campaign context. References actual campaign data. No cross-campaign data leakage. | P1 | [ ] | RAG with campaign scoping |

**AI Agent Section Status:** 0/10 passed | 0 failed | 0 blocked

---

## 5. Reports (8 Test Cases)

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 5.1 | **Generate campaign performance report** | 1. Go to Reports<br>2. Select date range<br>3. Select campaign(s)<br>4. Click "Generate" | Report generated with charts, tables, KPIs. PDF export available. Data matches actual campaign metrics. | P0 | [ ] | Verify aggregation accuracy |
| 5.2 | **Real-time metrics accuracy** | 1. Run active campaign<br>2. Check real-time dashboard<br>3. Compare with raw analytics data | Dashboard figures within 2% of source data. Auto-refresh interval (30s) functional. | P0 | [ ] | Data pipeline validation |
| 5.3 | **Custom report builder** | 1. Click "Custom Report"<br>2. Drag metrics, dimensions, filters<br>3. Save configuration | Report renders with selected fields. Save creates template for reuse. Share link works. | P1 | [ ] | Drag-and-drop library test |
| 5.4 | **Scheduled report delivery** | 1. Configure weekly report<br>2. Set recipients and format<br>3. Save schedule | Report auto-generated and emailed at scheduled time. Attachments correct format. Unsubscribe link works. | P1 | [ ] | Cron job verification |
| 5.5 | **Export formats (CSV, PDF, XLSX)** | 1. Open any report<br>2. Click Export → select format | File downloads in correct format. Data complete. Encoding UTF-8. Special characters handled. | P1 | [ ] | Large dataset export (10k+ rows) |
| 5.6 | **Drill-down from chart to details** | 1. View aggregate chart<br>2. Click on a data point<br>3. Verify drill-down | Navigates to detailed view filtered by clicked dimension. Back button returns to aggregate. | P2 | [ ] | Deep linking preserved |
| 5.7 | **Comparison reports (period-over-period)** | 1. Select "Compare" mode<br>2. Choose current vs previous period<br>3. Generate | Report shows side-by-side comparison. Variance percentages calculated. Trend indicators (up/down arrows). | P2 | [ ] | Period alignment (same weekday) |
| 5.8 | **Report caching and stale data** | 1. Generate report<br>2. Modify underlying data<br>3. Reopen report | Cached version shown with "Last updated" timestamp. "Refresh" button fetches latest. Cache TTL = 5 min. | P2 | [ ] | Cache invalidation on data change |

**Reports Section Status:** 0/8 passed | 0 failed | 0 blocked

---

## 6. Settings (8 Test Cases)

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 6.1 | **Update profile information** | 1. Go to Settings → Profile<br>2. Update name, avatar, timezone<br>3. Save | Changes persisted. Avatar uploads, resizes to 128x128. Toast confirmation. Header profile updates. | P1 | [ ] | Image validation (type, size) |
| 6.2 | **Change password** | 1. Enter current password<br>2. Enter new password (12+ chars)<br>3. Confirm<br>4. Save | Password updated. All existing sessions invalidated except current. Success toast. | P0 | [ ] | bcrypt rehash verification |
| 6.3 | **Configure notification preferences** | 1. Go to Settings → Notifications<br>2. Toggle email/push/WebSocket<br>3. Save | Preferences persisted. Toggle states saved to DB. Test notification button functional. | P1 | [ ] | Verify preference API |
| 6.4 | **Team management (invite members)** | 1. Go to Settings → Team<br>2. Click "Invite"<br>3. Enter email, select role<br>4. Send | Invitation email sent with unique token. Pending invite shown in list. Role options: Admin, Editor, Viewer. | P0 | [ ] | Token expiry = 7 days |
| 6.5 | **Role-based permission enforcement** | 1. Login as Viewer<br>2. Attempt to access admin routes<br>3. Attempt admin API calls | Route guards redirect to 403 page. API returns 403. No sensitive data exposed. | P0 | [ ] | RBAC middleware test |
| 6.6 | **Organization settings (branding)** | 1. Go to Settings → Organization<br>2. Upload logo, set primary color<br>3. Save | Logo appears in header/emails. Theme color applied. Favicon updated. | P3 | [ ] | CSS variable injection |
| 6.7 | **Integration configuration (Google Ads, Meta)** | 1. Go to Settings → Integrations<br>2. Connect Google Ads<br>3. Complete OAuth flow | OAuth token stored encrypted. Connection status shows "Connected". Test sync button functional. | P0 | [ ] | Token encryption at rest |
| 6.8 | **API key generation and revocation** | 1. Go to Settings → API Keys<br>2. Generate new key<br>3. Copy and test<br>4. Revoke | Key works for API auth until revoked. Revocation immediate. Audit log shows create/revoke. | P0 | [ ] | HMAC-SHA256 signing |

**Settings Section Status:** 0/8 passed | 0 failed | 0 blocked

---

## 7. Real-Time Updates (5 Test Cases)

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 7.1 | **WebSocket connection stability** | 1. Open dashboard<br>2. Monitor WS connection for 1 hour<br>3. Verify auto-reconnect | Connection maintained. Heartbeat ping/pong every 30s. On disconnect, exponential backoff reconnect. | P0 | [ ] | Network tab monitoring |
| 7.2 | **Campaign status update push** | 1. User A: Open campaigns list<br>2. User B: Approve a campaign<br>3. User A: Observe | Campaign status updates in real-time without refresh. Toast notification: "Campaign X approved." | P0 | [ ] | WebSocket event broadcast |
| 7.3 | **Concurrent editing collision** | 1. User A: Edit campaign description<br>2. User B: Edit same campaign simultaneously<br>3. Both save | Last-write-wins with conflict warning. OR optimistic locking with version check (ETag). | P1 | [ ] | Operational transform or locking |
| 7.4 | **Notification delivery latency** | 1. Trigger approval request<br>2. Measure time to notification bell | Notification appears within 2 seconds of event. Ordered by timestamp. Deduplication working. | P1 | [ ] | Latency measurement |
| 7.5 | **Graceful degradation (offline)** | 1. Disconnect network<br>2. Perform action<br>3. Reconnect | "Offline mode" banner shown. Actions queued. On reconnect, queued actions sync with server. | P1 | [ ] | Service Worker + IndexedDB queue |

**Real-Time Updates Section Status:** 0/5 passed | 0 failed | 0 blocked

---

## 8. Mobile Responsiveness (10 Test Cases)

### 8.1 Layout & Navigation

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 8.1 | **Dashboard layout on iPhone 14 Pro** | 1. Open on iPhone 14 Pro (393x852)<br>2. Verify all sections | Single column layout. No horizontal scroll. Charts readable. Cards stack vertically. | P1 | [ ] | iOS Safari test |
| 8.2 | **Sidebar navigation collapse** | 1. Open on mobile<br>2. Tap hamburger menu<br>3. Navigate to each section | Sidebar slides in with overlay. Active section highlighted. Swipe to dismiss. Body scroll locked when open. | P1 | [ ] | Touch gesture support |
| 8.3 | **Campaign list horizontal scroll prevention** | 1. Open campaigns on 320px wide device<br>2. Check for overflow | No horizontal scroll on any page. Tables convert to card view or have horizontal scroll container. | P1 | [ ] | iPhone SE test |
| 8.4 | **Touch target sizes (48x48dp)** | 1. Inspect all interactive elements<br>2. Measure tap areas | All buttons, links, inputs minimum 48x48 CSS pixels. No accidental taps on adjacent elements. | P1 | [ ] | DevTools accessibility audit |

### 8.2 Forms & Interactions

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 8.5 | **Campaign form on mobile** | 1. Open "New Campaign" on mobile<br>2. Fill all fields<br>3. Submit | Form scrolls smoothly. Date picker opens native iOS/Android picker. Keyboard doesn't obscure inputs. | P1 | [ ] | viewport meta tag test |
| 8.6 | **AI Agent chat on mobile** | 1. Open AI Agent on mobile<br>2. Send message<br>3. Scroll history | Input field sticky at bottom. Keyboard pushes content up. Messages bubble layout correct. No layout shift. | P1 | [ ] | Virtual keyboard handling |
| 8.7 | **Pull-to-refresh on lists** | 1. Open campaigns list<br>2. Pull down<br>3. Release | Refresh spinner shown. List refreshes with latest data. Works on all list views. | P2 | [ ] | Native-feel gesture |

### 8.3 Cross-Device

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 8.8 | **iPad/tablet layout (landscape)** | 1. Open on iPad Air (1180x820)<br>2. Verify layout | Two-column layout where appropriate. Sidebar always visible. Forms use available width efficiently. | P2 | [ ] | Breakpoint at 1024px |
| 8.9 | **Android Chrome (Pixel 7)** | 1. Open on Pixel 7<br>2. Run through core flows | Identical experience to iOS. No browser-specific bugs. Bottom nav accounts for Android system nav. | P2 | [ ] | Chrome DevTools mobile |
| 8.10 | **Orientation change handling** | 1. Open in portrait<br>2. Rotate to landscape<br>3. Rotate back | Layout adjusts correctly. No visual glitches. Scroll position preserved. Modals centered. | P2 | [ ] | resize/orientation event |

**Mobile Responsiveness Section Status:** 0/10 passed | 0 failed | 0 blocked

---

## 9. Accessibility (8 Test Cases)

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 9.1 | **Keyboard navigation (Tab order)** | 1. Navigate entire app using only Tab<br>2. Verify logical focus order | Focus moves predictably: top-to-bottom, left-to-right. No keyboard traps. Skip-to-content link works. | P0 | [ ] | WCAG 2.1 AA compliance |
| 9.2 | **Screen reader compatibility** | 1. Enable NVDA/VoiceOver<br>2. Navigate main flows<br>3. Verify announcements | All interactive elements labeled. Dynamic content announced via ARIA live regions. Modal focus trapping works. | P0 | [ ] | axe DevTools audit |
| 9.3 | **Color contrast compliance** | 1. Run axe contrast check<br>2. Verify all text/background pairs | All text meets WCAG AA: 4.5:1 for normal, 3:1 for large. Error states distinguishable without color. | P0 | [ ] | Deuteranopia simulation |
| 9.4 | **Focus visibility** | 1. Tab through all interactive elements | Focus indicator clearly visible (2px solid, 3:1 contrast). Not obscured by sticky headers. | P1 | [ ] | `:focus-visible` styling |
| 9.5 | **ARIA labels and roles** | 1. Inspect with DevTools<br>2. Verify semantic HTML and ARIA | Proper heading hierarchy (h1→h6). Buttons are `<button>`. Navigation has `role="navigation"`. Landmarks present. | P1 | [ ] | axe automated scan |
| 9.6 | **Reduced motion preference** | 1. Enable `prefers-reduced-motion: reduce`<br>2. Navigate app | All animations disabled. No parallax. Modals appear instantly. Loading spinners only essential motion. | P2 | [ ] | `@media (prefers-reduced-motion)` |
| 9.7 | **Form error announcement** | 1. Submit invalid form<br>2. Listen with screen reader | Errors announced via `aria-live="polite"`. Error text linked to input via `aria-describedby`. | P1 | [ ] | SR announcement test |
| 9.8 | **Accessible modal dialogs** | 1. Open any modal<br>2. Tab within modal<br>3. Press Escape | Focus trapped within modal. Escape closes. Focus returns to trigger on close. `aria-modal="true"` set. | P1 | [ ] | Focus management audit |

**Accessibility Section Status:** 0/8 passed | 0 failed | 0 blocked

---

## 10. Performance (5 Test Cases)

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 10.1 | **Lighthouse score >= 90** | 1. Run Lighthouse on all major pages<br>2. Record scores | Performance >= 90. Accessibility >= 95. Best Practices >= 95. SEO >= 90. | P0 | [ ] | CI-integrated |
| 10.2 | **First Contentful Paint < 1.5s** | 1. Throttle to Fast 3G<br>2. Measure FCP on dashboard | FCP under 1.5 seconds on 4G. Under 3 seconds on Fast 3G. Skeleton screens shown during load. | P0 | [ ] | WebPageTest / Lighthouse |
| 10.3 | **Time to Interactive < 3.5s** | 1. Throttle CPU 4x<br>2. Measure TTI on campaign editor | Page interactive within 3.5s. No long tasks (>50ms) blocking input. | P1 | [ ] | Performance monitor |
| 10.4 | **List virtualization for 1000+ items** | 1. Load campaign list with 2000 items<br>2. Scroll through list | Smooth 60fps scrolling. Only visible rows rendered. Memory usage stable (~50MB). | P1 | [ ] | react-window / react-virtuoso |
| 10.5 | **API response time SLA** | 1. Load dashboard<br>2. Measure all API calls | 95th percentile < 200ms. 99th percentile < 500ms. Error rate < 0.1%. | P0 | [ ] | Grafana / APM dashboard |

**Performance Section Status:** 0/5 passed | 0 failed | 0 blocked

---

## 11. Security (8 Test Cases)

| # | Test Case | Steps | Expected Result | Severity | Status | Notes |
|---|-----------|-------|-----------------|----------|--------|-------|
| 11.1 | **JWT token security** | 1. Login<br>2. Inspect token in cookie<br>3. Attempt XSS cookie theft | Token is `httpOnly`, `Secure`, `SameSite=Strict`. Cannot be accessed via `document.cookie`. | P0 | [ ] | DevTools Application tab |
| 11.2 | **SQL injection prevention** | 1. Enter SQL in search: `' OR 1=1 --`<br>2. Submit in all form fields | Input parameterized/sanitized. No unauthorized data returned. WAF blocks if applicable. | P0 | [ ] | sqlmap automated test |
| 11.3 | **XSS payload prevention** | 1. Enter `<script>alert(1)</script>` in campaign name<br>2. Save and view | Script not executed. Content HTML-escaped. CSP header blocks inline scripts. | P0 | [ ] | XSS cheat sheet payloads |
| 11.4 | **CSRF token validation** | 1. Extract CSRF token<br>2. Craft forged request without token<br>3. Submit cross-origin | Request rejected with 403. `X-CSRF-Token` header required on state-changing operations. | P0 | [ ] | Double-submit cookie pattern |
| 11.5 | **Authorization boundary testing** | 1. Login as User A<br>2. Attempt to access User B's campaigns via URL manipulation | 403 Forbidden returned. Cannot access resources outside own organization. IDOR prevented. | P0 | [ ] | BURP Suite automation |
| 11.6 | **File upload security** | 1. Upload valid image<br>2. Upload malicious file (`.php`, `.exe`)<br>3. Upload SVG with embedded script | Only image MIME types accepted. File scanned. SVG sanitized. Size limit enforced (5MB). | P0 | [ ] | ClamAV / file type magic bytes |
| 11.7 | **Secret exposure audit** | 1. Search source code for API keys<br>2. Check network tab for secrets<br>3. Verify `.env` not in bundle | No secrets in client bundle. Environment variables server-side only. Source maps don't expose internals. | P0 | [ ] | `npm run build` output scan |
| 11.8 | **Dependency vulnerability scan** | 1. Run `npm audit`<br>2. Run `snyk test`<br>3. Review Dependabot alerts | Zero critical vulnerabilities. High vulnerabilities have remediation plan. SBOM generated. | P0 | [ ] | CI pipeline integration |

**Security Section Status:** 0/8 passed | 0 failed | 0 blocked

---

## Summary Dashboard

| Section | Total | Passed | Failed | Blocked | Pass Rate |
|---------|-------|--------|--------|---------|-----------|
| Authentication Flows | 10 | 0 | 0 | 0 | 0% |
| Campaign Management | 15 | 0 | 0 | 0 | 0% |
| Draft Approval Workflow | 12 | 0 | 0 | 0 | 0% |
| AI Agent | 10 | 0 | 0 | 0 | 0% |
| Reports | 8 | 0 | 0 | 0 | 0% |
| Settings | 8 | 0 | 0 | 0 | 0% |
| Real-Time Updates | 5 | 0 | 0 | 0 | 0% |
| Mobile Responsiveness | 10 | 0 | 0 | 0 | 0% |
| Accessibility | 8 | 0 | 0 | 0 | 0% |
| Performance | 5 | 0 | 0 | 0 | 0% |
| Security | 8 | 0 | 0 | 0 | 0% |
| **TOTAL** | **99** | **0** | **0** | **0** | **0%** |

### Release Gate Criteria

| Criterion | Threshold | Status |
|-----------|-----------|--------|
| All P0 tests passed | 100% | Pending |
| All P1 tests passed | >= 95% | Pending |
| Overall pass rate | >= 90% | Pending |
| Zero security test failures | 0 | Pending |
| Zero accessibility test failures | 0 | Pending |
| Performance score >= 90 | Yes | Pending |

### Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |
| Security Reviewer | | | |
| Release Manager | | | |

---

## Appendix A: Test Environment Details

```
Frontend:    React 18.2 + TypeScript 5.3 + Vite 5.0
Backend:     Node.js 20 LTS + Express 4.18
Database:    PostgreSQL 16 + Redis 7
AI Service:  OpenAI GPT-4 Turbo + Vector Store
Infrastructure: AWS (ECS Fargate, RDS, ElastiCache, CloudFront)
Monitoring:  Datadog APM + Sentry Error Tracking + Grafana
```

## Appendix B: Automated Test Coverage Requirements

| Layer | Minimum Coverage | Framework |
|-------|------------------|-----------|
| Unit Tests | 80% | Vitest + React Testing Library |
| Integration Tests | 70% | Vitest + MSW |
| E2E Tests | All P0 flows | Playwright |
| API Contract Tests | All endpoints | Pact |
| Visual Regression | All pages | Chromatic / Percy |
| Accessibility | All pages | axe-core + pa11y |
| Performance Budget | Enforced in CI | Lighthouse CI |

## Appendix C: Regression Scope

The following areas require full regression when changes are made to:
- **Auth module**: All authenticated flows, session handling, RBAC
- **Campaign API**: Campaign CRUD, scheduling, approval workflow
- **AI integration**: Chat, suggestions, content generation
- **Database schema**: All data-dependent features, reports, exports
- **Real-time layer**: WebSocket events, notifications, live updates
