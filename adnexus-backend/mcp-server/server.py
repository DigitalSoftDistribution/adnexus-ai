#!/usr/bin/env python3
"""
AdNexus AI - Production-Ready MCP Server
========================================
A FastMCP server that proxies 30+ tools to the AdNexus Node.js API,
enabling AI assistants (Claude, Cursor, etc.) to manage ad campaigns
across Meta, Google, TikTok, and Snapchat with full safety controls:
- Draft-first writes (no live changes without approval)
- Approval workflows for all mutating operations
- Structured logging with timing
- Graceful error handling
- JWT authentication

Environment Variables
---------------------
    API_BASE_URL   : Base URL of the AdNexus API (default: http://localhost:3000/api/v1)
    API_JWT_TOKEN  : JWT token for authenticating with the AdNexus backend
    LOG_LEVEL      : Logging level (default: INFO)
    MCP_TRANSPORT  : FastMCP transport — 'stdio' or 'sse' (default: stdio)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal, Optional

import httpx
from fastmcp import FastMCP, Context
from pydantic import BaseModel, Field, field_validator, model_validator

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("adnexus-mcp")

# ---------------------------------------------------------------------------
# Configuration from environment
# ---------------------------------------------------------------------------
API_BASE: str = os.getenv("API_BASE_URL", "http://localhost:3000/api/v1").rstrip("/")
API_JWT: str = os.getenv("API_JWT_TOKEN", "")
MCP_TRANSPORT: str = os.getenv("MCP_TRANSPORT", "stdio")
REQUEST_TIMEOUT: float = float(os.getenv("REQUEST_TIMEOUT", "30.0"))

if not API_JWT:
    logger.warning("API_JWT_TOKEN is not set — requests to the backend will fail!")

# ---------------------------------------------------------------------------
# Shared async HTTP client with connection pooling
# ---------------------------------------------------------------------------
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    """Return (or create) the shared async HTTP client."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(REQUEST_TIMEOUT),
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
            headers={"User-Agent": "AdNexus-MCP/1.0"},
        )
    return _client


# ---------------------------------------------------------------------------
# Request context for logging / tracing
# ---------------------------------------------------------------------------
@dataclass
class _ReqCtx:
    """Lightweight context bag for a single tool invocation."""

    tool_name: str
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    start_ts: float = field(default_factory=time.perf_counter)

    def elapsed_ms(self) -> float:
        return (time.perf_counter() - self.start_ts) * 1000


# ===========================================================================
# Helper: authenticated API call
# ===========================================================================
async def _api_call(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json_data: dict[str, Any] | None = None,
    ctx: _ReqCtx | None = None,
) -> dict[str, Any] | list[Any]:
    """Make an authenticated HTTP request to the AdNexus API.

    Parameters
    ----------
    method:
        HTTP method (GET, POST, PATCH, DELETE).
    path:
        API path (e.g. ``/campaigns``).
    params:
        Query-string parameters.
    json_data:
        JSON request body.
    ctx:
        Optional request context for tracing.

    Returns
    -------
    Parsed JSON response, or ``{"error": ...}`` on failure.
    """
    client = _get_client()
    headers: dict[str, str] = {
        "Authorization": f"Bearer {API_JWT}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if ctx:
        headers["X-Trace-ID"] = ctx.trace_id

    url = f"{API_BASE}{path}"

    # Strip None values so we don't send ``null`` over the wire
    if params:
        params = {k: v for k, v in params.items() if v is not None}
    if json_data:
        json_data = {k: v for k, v in json_data.items() if v is not None}

    trace = f"[{ctx.trace_id}]" if ctx else "[—]"
    logger.debug("%s → %s %s  params=%s  body_keys=%s", trace, method, url, list(params or {}), list(json_data or {}))

    try:
        response = await client.request(method, url, params=params, json=json_data, headers=headers)
        response.raise_for_status()

        if response.status_code == 204 or not response.text:
            return {"success": True}
        return response.json()

    except httpx.HTTPStatusError as e:
        err_body = e.response.text or str(e)
        try:
            detail = e.response.json()
            err_body = json.dumps(detail)
        except Exception:
            pass
        logger.error("%s HTTP %s on %s %s: %s", trace, e.response.status_code, method, path, err_body)
        return {"error": f"API error {e.response.status_code}: {err_body}"}

    except httpx.ConnectError as e:
        logger.error("%s Cannot connect to %s: %s", trace, API_BASE, e)
        return {"error": f"Cannot connect to AdNexus API at {API_BASE}. Is the server running? ({e})"}

    except httpx.TimeoutException as e:
        logger.error("%s Request timeout on %s %s: %s", trace, method, path, e)
        return {"error": f"Request timed out after {REQUEST_TIMEOUT}s: {e}"}

    except Exception as e:
        logger.exception("%s Unexpected error on %s %s", trace, method, path)
        return {"error": f"Unexpected error: {type(e).__name__}: {e}"}


# ===========================================================================
# Helpers: human-readable formatters
# ===========================================================================
def _fmt_currency(value: float | None) -> str:
    if value is None:
        return "N/A"
    return f"${value:,.2f}"


def _fmt_number(value: float | None, decimals: int = 0) -> str:
    if value is None:
        return "N/A"
    if decimals == 0:
        return f"{value:,.0f}"
    return f"{value:,.{decimals}f}"


def _fmt_percent(value: float | None) -> str:
    if value is None:
        return "N/A"
    return f"{value * 100:.2f}%"


def _fmt_roas(value: float | None) -> str:
    if value is None:
        return "N/A"
    return f"{value:.2f}x"


def _fmt_duration_ms(ms: float) -> str:
    return f"{ms:.1f}ms"


def _safe_json_loads(raw: str | None, label: str = "JSON") -> dict[str, Any] | None:
    """Safely parse a JSON string; return None if empty/invalid."""
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
        return {"value": parsed}
    except json.JSONDecodeError as e:
        logger.warning("Failed to parse %s: %s", label, e)
        return None


# ===========================================================================
# Result wrapper — every tool returns this shape
# ===========================================================================
def _ok(data: dict[str, Any], meta: dict[str, Any] | None = None) -> str:
    """Serialize a successful result."""
    payload = {"success": True, "data": data}
    if meta:
        payload["meta"] = meta
    return json.dumps(payload, indent=2, default=str)


def _err(message: str, *, code: str = "UNKNOWN_ERROR", details: dict[str, Any] | None = None) -> str:
    """Serialize an error result."""
    payload: dict[str, Any] = {"success": False, "error": {"code": code, "message": message}}
    if details:
        payload["error"]["details"] = details
    return json.dumps(payload, indent=2, default=str)


def _tool_result(
    ctx: _ReqCtx,
    api_result: dict[str, Any] | list[Any],
    *,
    formatter: callable | None = None,
) -> str:
    """Handle the common post-API pattern: detect error, format success, log timing."""
    elapsed = ctx.elapsed_ms()

    if isinstance(api_result, dict) and "error" in api_result:
        logger.warning("[%s] tool=%s FAILED after %s — %s", ctx.trace_id, ctx.tool_name, _fmt_duration_ms(elapsed), api_result["error"])
        return _err(str(api_result["error"]), code="API_ERROR")

    logger.info("[%s] tool=%s OK in %s", ctx.trace_id, ctx.tool_name, _fmt_duration_ms(elapsed))

    if formatter is not None:
        return formatter(api_result)

    return _ok(api_result if isinstance(api_result, dict) else {"items": api_result}, meta={"trace_id": ctx.trace_id, "elapsed_ms": round(elapsed, 2)})


# ===========================================================================
# FastMCP app with lifespan
# ===========================================================================
@asynccontextmanager
async def _app_lifespan(server: FastMCP):
    """Manage the lifecycle of the shared HTTP client."""
    logger.info("AdNexus MCP server starting — API: %s", API_BASE)
    client = _get_client()
    # Quick health ping
    try:
        health = await client.get(f"{API_BASE}/health", headers={"Authorization": f"Bearer {API_JWT}"}, timeout=5.0)
        logger.info("Backend health check: HTTP %s", health.status_code)
    except Exception as e:
        logger.warning("Backend health check failed: %s", e)
    yield {"client": client}
    logger.info("AdNexus MCP server shutting down")
    if _client and not _client.is_closed:
        await _client.aclose()


mcp = FastMCP("adnexus-ai", lifespan=_app_lifespan)


# ===========================================================================
# Pydantic input models — CAMPAIGN TOOLS
# ===========================================================================


class ListCampaignsInput(BaseModel):
    """Input for listing campaigns with optional filters."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    platform: Literal["meta", "google", "tiktok", "snap"] | None = Field(None, description="Filter by ad platform")
    status: Literal["ACTIVE", "PAUSED", "ARCHIVED", "DRAFT"] | None = Field(None, description="Filter by campaign status")
    date_from: str | None = Field(None, description="Start date (YYYY-MM-DD)")
    date_to: str | None = Field(None, description="End date (YYYY-MM-DD)")
    account_id: str | None = Field(None, description="Filter by ad account ID")
    limit: int = Field(50, ge=1, le=200, description="Maximum results to return")
    offset: int = Field(0, ge=0, description="Pagination offset")


class GetCampaignInput(BaseModel):
    """Input for retrieving a single campaign by ID."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    campaign_id: str = Field(..., description="Campaign ID")


class CreateCampaignInput(BaseModel):
    """Input for creating a new campaign draft.

    The campaign is created as a DRAFT and requires approval before
    it is applied to the live ad account.
    """

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    name: str = Field(..., min_length=1, max_length=200, description="Campaign name")
    objective: str = Field(..., description="Campaign objective (e.g. CONVERSIONS, AWARENESS, TRAFFIC, LEAD_GENERATION)")
    daily_budget: float | None = Field(None, ge=1, description="Daily budget in account currency")
    lifetime_budget: float | None = Field(None, ge=1, description="Lifetime budget in account currency")
    platform: Literal["meta", "google", "tiktok", "snap"] = Field(..., description="Target ad platform")
    account_id: str = Field(..., description="Ad account ID on the platform")
    targeting: str | None = Field(None, description="JSON-stringified targeting specification")
    bid_strategy: str | None = Field(None, description="Bid strategy (e.g. LOWEST_COST, COST_CAP, LOWEST_COST_WITH_BID_CAP)")
    start_date: str | None = Field(None, description="Campaign start date (YYYY-MM-DD)")
    end_date: str | None = Field(None, description="Campaign end date (YYYY-MM-DD)")

    @model_validator(mode="after")
    def _check_budget(self) -> "CreateCampaignInput":
        if self.daily_budget is None and self.lifetime_budget is None:
            raise ValueError("Either daily_budget or lifetime_budget must be provided")
        if self.daily_budget is not None and self.lifetime_budget is not None:
            raise ValueError("Provide only one of daily_budget or lifetime_budget, not both")
        return self


class UpdateCampaignInput(BaseModel):
    """Input for updating campaign settings. Creates a draft for approval."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    campaign_id: str = Field(..., description="Campaign ID to update")
    name: str | None = Field(None, min_length=1, max_length=200, description="New campaign name")
    daily_budget: float | None = Field(None, ge=1, description="New daily budget")
    lifetime_budget: float | None = Field(None, ge=1, description="New lifetime budget")
    status: Literal["ACTIVE", "PAUSED"] | None = Field(None, description="New campaign status")
    targeting: str | None = Field(None, description="JSON-stringified targeting changes")
    bid_strategy: str | None = Field(None, description="New bid strategy")
    reason: str | None = Field(None, description="Reason for the update")


class PauseCampaignInput(BaseModel):
    """Input for pausing a campaign. Creates a draft for approval."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    campaign_id: str = Field(..., description="Campaign ID to pause")
    reason: str | None = Field(None, description="Reason for pausing")


class ResumeCampaignInput(BaseModel):
    """Input for resuming a paused campaign. Creates a draft for approval."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    campaign_id: str = Field(..., description="Campaign ID to resume")
    reason: str | None = Field(None, description="Reason for resuming")


class DuplicateCampaignInput(BaseModel):
    """Input for duplicating (cloning) an existing campaign. Creates a draft."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    campaign_id: str = Field(..., description="Campaign ID to duplicate")
    new_name: str = Field(..., min_length=1, max_length=200, description="Name for the duplicated campaign")


class GetCampaignInsightsInput(BaseModel):
    """Input for retrieving campaign performance insights over a date range."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    campaign_id: str = Field(..., description="Campaign ID")
    date_preset: Literal["today", "yesterday", "last_7d", "last_30d", "last_90d"] = Field("last_30d", description="Date range preset")
    date_from: str | None = Field(None, description="Custom start date (YYYY-MM-DD, overrides preset)")
    date_to: str | None = Field(None, description="Custom end date (YYYY-MM-DD, overrides preset)")
    breakdown: Literal["day", "week", "month", "platform", "country", "age", "gender"] | None = Field(None, description="Dimension to break down by")


# ===========================================================================
# Pydantic input models — AD TOOLS
# ===========================================================================


class ListAdsInput(BaseModel):
    """Input for listing ads within a campaign or adset."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    campaign_id: str | None = Field(None, description="Parent campaign ID (filter ads within this campaign)")
    adset_id: str | None = Field(None, description="Parent adset ID (filter ads within this adset)")
    status: Literal["ACTIVE", "PAUSED", "ARCHIVED", "DRAFT", "REJECTED"] | None = Field(None, description="Filter by ad status")
    limit: int = Field(50, ge=1, le=200, description="Maximum results to return")
    offset: int = Field(0, ge=0, description="Pagination offset")


class GetAdInput(BaseModel):
    """Input for retrieving a single ad by ID."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    ad_id: str = Field(..., description="Ad ID")


class CreateAdInput(BaseModel):
    """Input for creating a new ad draft.

    The ad is created as a DRAFT and requires approval before it goes live.
    """

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    adset_id: str = Field(..., description="Parent adset ID")
    name: str = Field(..., min_length=1, max_length=200, description="Ad name")
    creative_type: Literal["image", "video", "carousel", "collection", "reels", "story"] = Field(..., description="Type of creative")
    creative_url: str | None = Field(None, description="URL to the creative asset")
    creative_text: str | None = Field(None, description="Primary ad text / body copy")
    headline: str | None = Field(None, description="Headline text")
    description: str | None = Field(None, description="Description text")
    call_to_action: str | None = Field(None, description="Call-to-action button label (e.g. 'Shop Now', 'Learn More')")
    destination_url: str | None = Field(None, description="Landing page URL")
    tracking_spec: str | None = Field(None, description="JSON-stringified tracking specification")


class UpdateAdInput(BaseModel):
    """Input for updating an existing ad. Creates a draft for approval."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    ad_id: str = Field(..., description="Ad ID to update")
    name: str | None = Field(None, min_length=1, max_length=200, description="New ad name")
    creative_text: str | None = Field(None, description="Updated ad copy / body text")
    headline: str | None = Field(None, description="Updated headline")
    description: str | None = Field(None, description="Updated description")
    creative_url: str | None = Field(None, description="Updated creative asset URL")
    call_to_action: str | None = Field(None, description="Updated call-to-action")
    destination_url: str | None = Field(None, description="Updated landing page URL")
    targeting: str | None = Field(None, description="JSON-stringified targeting changes")
    reason: str | None = Field(None, description="Reason for the update")


class PauseAdInput(BaseModel):
    """Input for pausing an underperforming ad. Creates a draft for approval."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    ad_id: str = Field(..., description="Ad ID to pause")
    reason: str | None = Field(None, description="Reason for pausing (e.g. 'CTR below 0.5%')")


class GetAdPerformanceInput(BaseModel):
    """Input for retrieving ad-level performance metrics."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    ad_id: str = Field(..., description="Ad ID")
    date_preset: Literal["today", "yesterday", "last_7d", "last_30d", "last_90d"] = Field("last_30d", description="Date range preset")
    date_from: str | None = Field(None, description="Custom start date (YYYY-MM-DD)")
    date_to: str | None = Field(None, description="Custom end date (YYYY-MM-DD)")


# ===========================================================================
# Pydantic input models — OPTIMIZATION TOOLS
# ===========================================================================


class GetPerformanceSummaryInput(BaseModel):
    """Input for retrieving a cross-platform performance summary with KPIs."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    date_preset: Literal["today", "yesterday", "last_7d", "last_30d", "last_90d"] = Field("last_30d", description="Date range preset")
    date_from: str | None = Field(None, description="Custom start date (YYYY-MM-DD)")
    date_to: str | None = Field(None, description="Custom end date (YYYY-MM-DD)")
    platform: Literal["meta", "google", "tiktok", "snap"] | None = Field(None, description="Filter by platform")


class GetBudgetPacingInput(BaseModel):
    """Input for budget utilization and pacing analysis."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    campaign_id: str | None = Field(None, description="Filter by specific campaign")
    account_id: str | None = Field(None, description="Filter by ad account ID")
    platform: Literal["meta", "google", "tiktok", "snap"] | None = Field(None, description="Filter by platform")


class DetectCreativeFatigueInput(BaseModel):
    """Input for detecting creative fatigue across ads.

    Creative fatigue occurs when an ad's performance degrades over time
    due to audience saturation — the same people seeing the same ad repeatedly.
    """

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    campaign_id: str | None = Field(None, description="Filter by campaign")
    adset_id: str | None = Field(None, description="Filter by adset")
    threshold: float = Field(0.15, ge=0.0, le=1.0, description="Fatigue threshold — ads with fatigue score above this are flagged")
    lookback_days: int = Field(14, ge=7, le=90, description="Number of days to look back for performance comparison")


class GetOptimizationRecommendationsInput(BaseModel):
    """Input for retrieving AI-generated optimization recommendations."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    campaign_id: str | None = Field(None, description="Filter by specific campaign")
    platform: Literal["meta", "google", "tiktok", "snap"] | None = Field(None, description="Filter by platform")
    focus_area: Literal["budget", "bidding", "targeting", "creative", "all"] = Field("all", description="Type of recommendations to prioritize")
    limit: int = Field(10, ge=1, le=50, description="Maximum number of recommendations")


class ExecuteOptimizationInput(BaseModel):
    """Input for applying an AI optimization recommendation.

    The change is created as a DRAFT and requires approval before
    it is applied to the live ad account.
    """

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    recommendation_id: str = Field(..., description="ID of the recommendation to apply")
    reason: str | None = Field(None, description="Optional note explaining why this recommendation is being applied")


class GetMorningBriefInput(BaseModel):
    """Input for generating the morning brief — a daily summary of performance,
    alerts, and recommended actions for the marketing team.
    """

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    date_preset: Literal["yesterday", "last_7d", "last_30d"] = Field("yesterday", description="Time period for the brief")
    include_recommendations: bool = Field(True, description="Include AI recommendations in the brief")


# ===========================================================================
# Pydantic input models — AUDIENCE TOOLS
# ===========================================================================


class ListAudiencesInput(BaseModel):
    """Input for listing custom and lookalike audiences."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    platform: Literal["meta", "google", "tiktok", "snap"] | None = Field(None, description="Filter by platform")
    audience_type: Literal["custom", "lookalike", "saved", "all"] = Field("all", description="Filter by audience type")
    limit: int = Field(50, ge=1, le=200, description="Maximum results to return")
    offset: int = Field(0, ge=0, description="Pagination offset")


class GetAudiencePerformanceInput(BaseModel):
    """Input for retrieving audience performance data."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    audience_id: str | None = Field(None, description="Specific audience ID (if omitted, returns all audiences)")
    date_preset: Literal["today", "yesterday", "last_7d", "last_30d", "last_90d"] = Field("last_30d", description="Date range preset")


class SuggestAudiencesInput(BaseModel):
    """Input for getting AI-suggested audiences to test based on campaign history."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    campaign_id: str | None = Field(None, description="Base campaign for audience suggestions")
    platform: Literal["meta", "google", "tiktok", "snap"] | None = Field(None, description="Target platform")
    objective: str | None = Field(None, description="Campaign objective (e.g. CONVERSIONS, AWARENESS)")
    limit: int = Field(5, ge=1, le=20, description="Maximum number of suggestions")


# ===========================================================================
# Pydantic input models — REPORTING TOOLS
# ===========================================================================


class GenerateReportInput(BaseModel):
    """Input for generating a performance report."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    report_type: Literal["performance", "spend", "conversion", "creative", "audience"] = Field(..., description="Type of report to generate")
    date_preset: Literal["today", "yesterday", "last_7d", "last_30d", "last_90d"] = Field("last_30d", description="Date range preset")
    date_from: str | None = Field(None, description="Custom start date (YYYY-MM-DD)")
    date_to: str | None = Field(None, description="Custom end date (YYYY-MM-DD)")
    campaign_id: str | None = Field(None, description="Filter by campaign")
    platform: Literal["meta", "google", "tiktok", "snap"] | None = Field(None, description="Filter by platform")
    format: Literal["json", "csv"] = Field("json", description="Output format")
    include_charts: bool = Field(False, description="Include chart data for visualization")


class GetTrendAnalysisInput(BaseModel):
    """Input for trend analysis of a specific metric over time."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    metric: Literal["spend", "impressions", "clicks", "ctr", "cpc", "conversions", "cpa", "roas", "revenue"] = Field(..., description="Metric to analyze")
    date_preset: Literal["last_7d", "last_30d", "last_90d"] = Field("last_30d", description="Date range preset")
    date_from: str | None = Field(None, description="Custom start date (YYYY-MM-DD)")
    date_to: str | None = Field(None, description="Custom end date (YYYY-MM-DD)")
    campaign_id: str | None = Field(None, description="Filter by campaign")
    platform: Literal["meta", "google", "tiktok", "snap"] | None = Field(None, description="Filter by platform")
    granularity: Literal["daily", "weekly"] = Field("daily", description="Time granularity")


class ComparePlatformsInput(BaseModel):
    """Input for cross-platform performance comparison."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    date_preset: Literal["today", "yesterday", "last_7d", "last_30d", "last_90d"] = Field("last_30d", description="Date range preset")
    date_from: str | None = Field(None, description="Custom start date (YYYY-MM-DD)")
    date_to: str | None = Field(None, description="Custom end date (YYYY-MM-DD)")
    platforms: list[Literal["meta", "google", "tiktok", "snap"]] | None = Field(None, description="Specific platforms to compare (default: all connected)")
    metrics: list[Literal["spend", "impressions", "clicks", "ctr", "cpc", "conversions", "cpa", "roas"]] = Field(default_factory=lambda: ["spend", "impressions", "clicks", "ctr", "conversions", "roas"], description="Metrics to compare")


# ===========================================================================
# Pydantic input models — DRAFT TOOLS
# ===========================================================================


class ListPendingDraftsInput(BaseModel):
    """Input for listing drafts awaiting approval."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    limit: int = Field(50, ge=1, le=200, description="Maximum results to return")
    offset: int = Field(0, ge=0, description="Pagination offset")
    draft_type: Literal["create_campaign", "update_campaign", "pause_campaign", "resume_campaign", "duplicate_campaign", "create_ad", "update_ad", "pause_ad", "all"] = Field("all", description="Filter by draft type")
    platform: Literal["meta", "google", "tiktok", "snap"] | None = Field(None, description="Filter by platform")


class ApproveDraftInput(BaseModel):
    """Input for approving a draft so it is executed on the live ad account."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    draft_id: str = Field(..., description="Draft ID to approve")
    approval_note: str | None = Field(None, description="Optional approval note")


class RejectDraftInput(BaseModel):
    """Input for rejecting a draft so it is discarded without being applied."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    draft_id: str = Field(..., description="Draft ID to reject")
    rejection_reason: str | None = Field(None, description="Reason for rejection")


class GetDraftDetailsInput(BaseModel):
    """Input for retrieving full draft details including a diff view of changes."""

    workspace_id: str = Field(..., description="Workspace / tenant identifier")
    draft_id: str = Field(..., description="Draft ID")


# ===========================================================================
# Formatters for human-readable output
# ===========================================================================

def _fmt_campaign_list(result: dict[str, Any] | list[Any]) -> str:
    campaigns = result.get("campaigns", []) if isinstance(result, dict) else result
    if not campaigns:
        return _ok({"message": "No campaigns found matching the filters.", "campaigns": []})
    formatted = []
    for c in campaigns:
        formatted.append(
            {
                "id": c.get("id", "N/A"),
                "name": c.get("name", "Unnamed"),
                "platform": c.get("platform", "N/A"),
                "status": c.get("status", "N/A"),
                "objective": c.get("objective", "N/A"),
                "spend": _fmt_currency(c.get("spend")),
                "budget": _fmt_currency(c.get("budget")),
                "roas": _fmt_roas(c.get("roas")),
                "impressions": _fmt_number(c.get("impressions")),
                "clicks": _fmt_number(c.get("clicks")),
                "ctr": _fmt_percent(c.get("ctr")),
                "cpc": _fmt_currency(c.get("cpc")),
                "conversions": _fmt_number(c.get("conversions")),
            }
        )
    return _ok({"count": len(campaigns), "campaigns": formatted})


def _fmt_campaign_detail(result: dict[str, Any] | list[Any]) -> str:
    c = result if isinstance(result, dict) else {}
    return _ok(
        {
            "id": c.get("id", "N/A"),
            "name": c.get("name", "Unnamed"),
            "platform": c.get("platform", "N/A"),
            "status": c.get("status", "N/A"),
            "objective": c.get("objective", "N/A"),
            "account_id": c.get("account_id", "N/A"),
            "daily_budget": _fmt_currency(c.get("daily_budget")),
            "lifetime_budget": _fmt_currency(c.get("lifetime_budget")),
            "spend": _fmt_currency(c.get("spend")),
            "budget_remaining": _fmt_currency(c.get("budget_remaining")),
            "roas": _fmt_roas(c.get("roas")),
            "impressions": _fmt_number(c.get("impressions")),
            "clicks": _fmt_number(c.get("clicks")),
            "conversions": _fmt_number(c.get("conversions")),
            "ctr": _fmt_percent(c.get("ctr")),
            "cpc": _fmt_currency(c.get("cpc")),
            "cpa": _fmt_currency(c.get("cpa")),
            "revenue": _fmt_currency(c.get("revenue")),
            "bid_strategy": c.get("bid_strategy", "N/A"),
            "start_date": c.get("start_date", "N/A"),
            "end_date": c.get("end_date", "N/A"),
            "created_at": c.get("created_at", "N/A"),
            "updated_at": c.get("updated_at", "N/A"),
            "targeting": c.get("targeting", {}),
        }
    )


def _fmt_ad_list(result: dict[str, Any] | list[Any]) -> str:
    ads = result.get("ads", []) if isinstance(result, dict) else result
    if not ads:
        return _ok({"message": "No ads found.", "ads": []})
    formatted = []
    for a in ads:
        formatted.append(
            {
                "id": a.get("id", "N/A"),
                "name": a.get("name", "Unnamed"),
                "status": a.get("status", "N/A"),
                "creative_type": a.get("creative_type", "N/A"),
                "adset_id": a.get("adset_id", "N/A"),
                "campaign_id": a.get("campaign_id", "N/A"),
                "spend": _fmt_currency(a.get("spend")),
                "impressions": _fmt_number(a.get("impressions")),
                "clicks": _fmt_number(a.get("clicks")),
                "ctr": _fmt_percent(a.get("ctr")),
                "conversions": _fmt_number(a.get("conversions")),
                "creative_text_preview": (a.get("creative_text", "")[:100] + "...") if a.get("creative_text") else None,
            }
        )
    return _ok({"count": len(ads), "ads": formatted})


def _fmt_ad_detail(result: dict[str, Any] | list[Any]) -> str:
    a = result if isinstance(result, dict) else {}
    return _ok(
        {
            "id": a.get("id", "N/A"),
            "name": a.get("name", "Unnamed"),
            "adset_id": a.get("adset_id", "N/A"),
            "campaign_id": a.get("campaign_id", "N/A"),
            "status": a.get("status", "N/A"),
            "creative_type": a.get("creative_type", "N/A"),
            "creative_url": a.get("creative_url", "N/A"),
            "creative_text": a.get("creative_text", "N/A"),
            "headline": a.get("headline", "N/A"),
            "description": a.get("description", "N/A"),
            "call_to_action": a.get("call_to_action", "N/A"),
            "destination_url": a.get("destination_url", "N/A"),
            "spend": _fmt_currency(a.get("spend")),
            "impressions": _fmt_number(a.get("impressions")),
            "clicks": _fmt_number(a.get("clicks")),
            "ctr": _fmt_percent(a.get("ctr")),
            "cpc": _fmt_currency(a.get("cpc")),
            "conversions": _fmt_number(a.get("conversions")),
            "cpa": _fmt_currency(a.get("cpa")),
            "roas": _fmt_roas(a.get("roas")),
        }
    )


def _fmt_draft_created(result: dict[str, Any] | list[Any], draft_type: str, details: dict[str, Any]) -> str:
    d = result if isinstance(result, dict) else {}
    return _ok(
        {
            "message": f"{draft_type} draft created successfully and is pending approval.",
            "draft_id": d.get("id", "N/A"),
            "draft_type": draft_type,
            "status": d.get("status", "pending"),
            "details": details,
            "note": "This draft will NOT be applied until approved. Use approve_draft to apply it.",
        }
    )


def _fmt_draft_list(result: dict[str, Any] | list[Any]) -> str:
    drafts = result.get("drafts", []) if isinstance(result, dict) else result
    if not drafts:
        return _ok({"message": "No pending drafts awaiting approval.", "drafts": []})
    formatted = []
    for d in drafts:
        formatted.append(
            {
                "id": d.get("id", "N/A"),
                "type": d.get("draft_type", "N/A"),
                "name": d.get("name", "Unnamed"),
                "platform": d.get("platform", "N/A"),
                "status": d.get("status", "N/A"),
                "created_at": d.get("created_at", "N/A"),
                "requested_by": d.get("requested_by", "N/A"),
                "description": d.get("description", "N/A"),
            }
        )
    return _ok({"count": len(drafts), "drafts": formatted})


def _fmt_draft_detail(result: dict[str, Any] | list[Any]) -> str:
    d = result if isinstance(result, dict) else {}
    return _ok(
        {
            "id": d.get("id", "N/A"),
            "type": d.get("draft_type", "N/A"),
            "name": d.get("name", "Unnamed"),
            "platform": d.get("platform", "N/A"),
            "status": d.get("status", "N/A"),
            "created_at": d.get("created_at", "N/A"),
            "requested_by": d.get("requested_by", "N/A"),
            "description": d.get("description", "N/A"),
            "changes": d.get("changes", {}),
            "diff": d.get("diff", {}),
            "approval_history": d.get("approval_history", []),
        }
    )


def _fmt_insights(result: dict[str, Any] | list[Any], date_preset: str = "last_30d") -> str:
    data = result if isinstance(result, dict) else {}
    insights = data.get("insights", data)
    if not insights:
        return _ok({"message": "No insights available for the selected period.", "insights": {}})
    if isinstance(insights, dict):
        return _ok(
            {
                "period": date_preset,
                "summary": {
                    "impressions": _fmt_number(insights.get("impressions")),
                    "clicks": _fmt_number(insights.get("clicks")),
                    "spend": _fmt_currency(insights.get("spend")),
                    "ctr": _fmt_percent(insights.get("ctr")),
                    "cpc": _fmt_currency(insights.get("cpc")),
                    "conversions": _fmt_number(insights.get("conversions")),
                    "cpa": _fmt_currency(insights.get("cpa")),
                    "roas": _fmt_roas(insights.get("roas")),
                    "revenue": _fmt_currency(insights.get("revenue")),
                    "frequency": _fmt_number(insights.get("frequency"), 2),
                },
                "raw": insights,
            }
        )
    # Daily breakdown list
    formatted = []
    for row in insights:
        formatted.append(
            {
                "date": row.get("date", "N/A"),
                "spend": _fmt_currency(row.get("spend")),
                "clicks": _fmt_number(row.get("clicks")),
                "impressions": _fmt_number(row.get("impressions")),
                "ctr": _fmt_percent(row.get("ctr")),
                "roas": _fmt_roas(row.get("roas")),
                "conversions": _fmt_number(row.get("conversions")),
            }
        )
    return _ok({"period": date_preset, "daily_breakdown": formatted, "raw": insights})


def _fmt_performance_summary(result: dict[str, Any] | list[Any]) -> str:
    data = result if isinstance(result, dict) else {}
    summary = data.get("summary", data)
    return _ok(
        {
            "period": data.get("date_preset", "N/A"),
            "kpis": {
                "total_spend": _fmt_currency(summary.get("total_spend")),
                "total_impressions": _fmt_number(summary.get("total_impressions")),
                "total_clicks": _fmt_number(summary.get("total_clicks")),
                "total_conversions": _fmt_number(summary.get("total_conversions")),
                "total_revenue": _fmt_currency(summary.get("total_revenue")),
                "overall_ctr": _fmt_percent(summary.get("overall_ctr")),
                "overall_cpc": _fmt_currency(summary.get("overall_cpc")),
                "overall_cpa": _fmt_currency(summary.get("overall_cpa")),
                "overall_roas": _fmt_roas(summary.get("overall_roas")),
            },
            "by_platform": summary.get("by_platform", []),
            "by_campaign": summary.get("by_campaign", []),
            "raw": summary,
        }
    )


def _fmt_budget_pacing(result: dict[str, Any] | list[Any]) -> str:
    data = result if isinstance(result, dict) else {}
    items = data.get("pacing", data.get("items", []))
    if not items:
        return _ok({"message": "No budget pacing data available.", "items": []})
    formatted = []
    for item in items:
        formatted.append(
            {
                "id": item.get("id", "N/A"),
                "name": item.get("name", "Unnamed"),
                "type": item.get("type", "campaign"),
                "budget": _fmt_currency(item.get("budget")),
                "spent": _fmt_currency(item.get("spent")),
                "remaining": _fmt_currency(item.get("remaining")),
                "pacing_pct": _fmt_percent(item.get("pacing_pct")),
                "days_remaining": item.get("days_remaining", "N/A"),
                "on_track": item.get("on_track", False),
                "projected_spend": _fmt_currency(item.get("projected_spend")),
            }
        )
    return _ok({"count": len(items), "items": formatted})


def _fmt_creative_fatigue(result: dict[str, Any] | list[Any]) -> str:
    data = result if isinstance(result, dict) else {}
    ads = data.get("fatigue_scores", data.get("ads", []))
    if not ads:
        return _ok({"message": "No creative fatigue data available.", "ads": [], "flagged_count": 0})
    formatted = []
    flagged = 0
    for a in ads:
        is_fatigued = a.get("is_fatigued", False)
        if is_fatigued:
            flagged += 1
        formatted.append(
            {
                "ad_id": a.get("ad_id", "N/A"),
                "ad_name": a.get("ad_name", "Unnamed"),
                "creative_id": a.get("creative_id", "N/A"),
                "fatigue_score": a.get("fatigue_score", 0),
                "is_fatigued": is_fatigued,
                "ctr_trend": a.get("ctr_trend", "N/A"),
                "frequency": _fmt_number(a.get("frequency"), 2),
                "days_running": a.get("days_running", "N/A"),
                "impressions": _fmt_number(a.get("impressions")),
                "recommendation": a.get("recommendation", "N/A"),
            }
        )
    return _ok({"total_ads": len(ads), "flagged_count": flagged, "threshold": data.get("threshold", 0.15), "ads": formatted})


def _fmt_optimization_recommendations(result: dict[str, Any] | list[Any]) -> str:
    data = result if isinstance(result, dict) else {}
    recs = data.get("recommendations", data)
    if not recs:
        return _ok({"message": "No optimization recommendations at this time.", "recommendations": []})
    formatted = []
    for r in recs:
        formatted.append(
            {
                "id": r.get("id", "N/A"),
                "type": r.get("type", "N/A"),
                "category": r.get("category", "N/A"),
                "priority": r.get("priority", "medium"),
                "title": r.get("title", "N/A"),
                "description": r.get("description", "N/A"),
                "estimated_impact": r.get("estimated_impact", {}),
                "affected_entity": r.get("affected_entity", {}),
                "confidence": r.get("confidence", "N/A"),
            }
        )
    return _ok({"count": len(recs), "recommendations": formatted})


def _fmt_morning_brief(result: dict[str, Any] | list[Any]) -> str:
    data = result if isinstance(result, dict) else {}
    return _ok(
        {
            "generated_at": data.get("generated_at", datetime.now(timezone.utc).isoformat()),
            "period": data.get("period", "N/A"),
            "executive_summary": data.get("executive_summary", "N/A"),
            "key_metrics": {
                "spend": _fmt_currency(data.get("total_spend")),
                "impressions": _fmt_number(data.get("total_impressions")),
                "clicks": _fmt_number(data.get("total_clicks")),
                "conversions": _fmt_number(data.get("total_conversions")),
                "roas": _fmt_roas(data.get("overall_roas")),
                "cpa": _fmt_currency(data.get("overall_cpa")),
            },
            "alerts": data.get("alerts", []),
            "recommendations": data.get("recommendations", []),
            "platform_breakdown": data.get("platform_breakdown", []),
            "raw": data,
        }
    )


def _fmt_audience_list(result: dict[str, Any] | list[Any]) -> str:
    audiences = result.get("audiences", []) if isinstance(result, dict) else result
    if not audiences:
        return _ok({"message": "No audiences found.", "audiences": []})
    formatted = []
    for a in audiences:
        formatted.append(
            {
                "id": a.get("id", "N/A"),
                "name": a.get("name", "Unnamed"),
                "platform": a.get("platform", "N/A"),
                "type": a.get("audience_type", "N/A"),
                "size": _fmt_number(a.get("size")),
                "status": a.get("status", "N/A"),
                "created_at": a.get("created_at", "N/A"),
                "description": a.get("description", "N/A"),
            }
        )
    return _ok({"count": len(audiences), "audiences": formatted})


def _fmt_audience_performance(result: dict[str, Any] | list[Any]) -> str:
    data = result if isinstance(result, dict) else {}
    audiences = data.get("audiences", data)
    if not audiences:
        return _ok({"message": "No audience performance data available.", "audiences": []})
    formatted = []
    for a in audiences:
        formatted.append(
            {
                "id": a.get("id", "N/A"),
                "name": a.get("name", "Unnamed"),
                "platform": a.get("platform", "N/A"),
                "type": a.get("audience_type", "N/A"),
                "size": _fmt_number(a.get("size")),
                "spend": _fmt_currency(a.get("spend")),
                "impressions": _fmt_number(a.get("impressions")),
                "clicks": _fmt_number(a.get("clicks")),
                "conversions": _fmt_number(a.get("conversions")),
                "ctr": _fmt_percent(a.get("ctr")),
                "cpa": _fmt_currency(a.get("cpa")),
                "roas": _fmt_roas(a.get("roas")),
            }
        )
    return _ok({"count": len(formatted), "audiences": formatted})


def _fmt_audience_suggestions(result: dict[str, Any] | list[Any]) -> str:
    data = result if isinstance(result, dict) else {}
    suggestions = data.get("suggestions", data)
    if not suggestions:
        return _ok({"message": "No audience suggestions available.", "suggestions": []})
    formatted = []
    for s in suggestions:
        formatted.append(
            {
                "audience_type": s.get("audience_type", "N/A"),
                "name": s.get("name", "Unnamed"),
                "description": s.get("description", "N/A"),
                "estimated_size": _fmt_number(s.get("estimated_size")),
                "estimated_cpa": _fmt_currency(s.get("estimated_cpa")),
                "estimated_roas": _fmt_roas(s.get("estimated_roas")),
                "rationale": s.get("rationale", "N/A"),
                "targeting_spec": s.get("targeting_spec", {}),
            }
        )
    return _ok({"count": len(formatted), "suggestions": formatted})


def _fmt_report(result: dict[str, Any] | list[Any]) -> str:
    data = result if isinstance(result, dict) else {}
    return _ok(
        {
            "report_id": data.get("report_id", "N/A"),
            "report_type": data.get("report_type", "N/A"),
            "period": data.get("period", "N/A"),
            "generated_at": data.get("generated_at", "N/A"),
            "summary": data.get("summary", {}),
            "sections": data.get("sections", []),
            "download_url": data.get("download_url", None),
            "raw": data,
        }
    )


def _fmt_trend_analysis(result: dict[str, Any] | list[Any]) -> str:
    data = result if isinstance(result, dict) else {}
    return _ok(
        {
            "metric": data.get("metric", "N/A"),
            "period": data.get("period", "N/A"),
            "trend_direction": data.get("trend_direction", "N/A"),
            "trend_slope": data.get("trend_slope", "N/A"),
            "change_pct": _fmt_percent(data.get("change_pct")),
            "current_value": data.get("current_value", "N/A"),
            "previous_value": data.get("previous_value", "N/A"),
            "granularity": data.get("granularity", "daily"),
            "data_points": data.get("data_points", []),
            "forecast": data.get("forecast", []),
        }
    )


def _fmt_platform_comparison(result: dict[str, Any] | list[Any]) -> str:
    data = result if isinstance(result, dict) else {}
    comparison = data.get("comparison", data)
    return _ok(
        {
            "period": data.get("period", "N/A"),
            "platforms_compared": data.get("platforms", []),
            "summary": comparison.get("summary", {}),
            "details": comparison.get("details", []),
            "winner": comparison.get("winner", {}),
            "recommendations": comparison.get("recommendations", []),
        }
    )


# ===========================================================================
# TOOL IMPLEMENTATIONS — CAMPAIGN TOOLS (8)
# ===========================================================================


@mcp.tool()
async def list_campaigns(input: ListCampaignsInput) -> str:
    """List all campaigns with optional filters for platform, status, date range, and account.

    Returns a paginated list of campaigns with key metrics including spend,
    budget, ROAS, impressions, clicks, and CTR. Use this tool to get an
    overview of all active and paused campaigns across connected ad accounts.
    """
    ctx = _ReqCtx("list_campaigns")
    result = await _api_call(
        "GET",
        "/campaigns",
        params={
            "workspace_id": input.workspace_id,
            "platform": input.platform,
            "status": input.status,
            "date_from": input.date_from,
            "date_to": input.date_to,
            "account_id": input.account_id,
            "limit": input.limit,
            "offset": input.offset,
        },
        ctx=ctx,
    )
    return _tool_result(ctx, result, formatter=_fmt_campaign_list)


@mcp.tool()
async def get_campaign(input: GetCampaignInput) -> str:
    """Get detailed information about a single campaign by its ID.

    Returns comprehensive campaign details including budgets, targeting,
    performance metrics, bid strategy, and schedule. Use this to drill
    into a specific campaign before making changes.
    """
    ctx = _ReqCtx("get_campaign")
    result = await _api_call(
        "GET",
        f"/campaigns/{input.campaign_id}",
        params={"workspace_id": input.workspace_id},
        ctx=ctx,
    )
    return _tool_result(ctx, result, formatter=_fmt_campaign_detail)


@mcp.tool()
async def create_campaign(input: CreateCampaignInput) -> str:
    """Create a new campaign as a DRAFT.

    The campaign is NOT applied to live ad accounts immediately. A draft is
    created with status 'pending' that requires approval via ``approve_draft``.
    This ensures all campaign creations are reviewed before going live.

    You must provide exactly one budget type: ``daily_budget`` or ``lifetime_budget``.
    """
    ctx = _ReqCtx("create_campaign")
    payload: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "draft_type": "create_campaign",
        "name": input.name,
        "objective": input.objective,
        "platform": input.platform,
        "account_id": input.account_id,
    }
    if input.daily_budget is not None:
        payload["daily_budget"] = input.daily_budget
    if input.lifetime_budget is not None:
        payload["lifetime_budget"] = input.lifetime_budget
    if input.targeting is not None:
        payload["targeting"] = _safe_json_loads(input.targeting, "targeting")
    if input.bid_strategy is not None:
        payload["bid_strategy"] = input.bid_strategy
    if input.start_date is not None:
        payload["start_date"] = input.start_date
    if input.end_date is not None:
        payload["end_date"] = input.end_date

    result = await _api_call("POST", "/drafts", json_data=payload, ctx=ctx)
    return _tool_result(
        ctx,
        result,
        formatter=lambda r: _fmt_draft_created(
            r, "create_campaign", {"name": input.name, "platform": input.platform, "objective": input.objective}
        ),
    )


@mcp.tool()
async def update_campaign(input: UpdateCampaignInput) -> str:
    """Update campaign settings (budget, status, targeting) as a DRAFT.

    Changes to the campaign are NOT applied immediately. A draft is created
    that must be approved via ``approve_draft`` before the changes go live.
    Provide only the fields you want to change — omitted fields are left unchanged.
    """
    ctx = _ReqCtx("update_campaign")
    payload: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "draft_type": "update_campaign",
        "campaign_id": input.campaign_id,
    }
    changes: dict[str, Any] = {}
    if input.name is not None:
        changes["name"] = input.name
    if input.daily_budget is not None:
        changes["daily_budget"] = input.daily_budget
    if input.lifetime_budget is not None:
        changes["lifetime_budget"] = input.lifetime_budget
    if input.status is not None:
        changes["status"] = input.status
    if input.bid_strategy is not None:
        changes["bid_strategy"] = input.bid_strategy
    if input.targeting is not None:
        changes["targeting"] = _safe_json_loads(input.targeting, "targeting")
    payload["changes"] = changes
    if input.reason is not None:
        payload["reason"] = input.reason

    result = await _api_call("POST", "/drafts", json_data=payload, ctx=ctx)
    return _tool_result(
        ctx,
        result,
        formatter=lambda r: _fmt_draft_created(
            r, "update_campaign", {"campaign_id": input.campaign_id, "changes": list(changes.keys()), "reason": input.reason}
        ),
    )


@mcp.tool()
async def pause_campaign(input: PauseCampaignInput) -> str:
    """Pause a running campaign as a DRAFT.

    The campaign is NOT paused immediately. A draft is created with status
    'pending' that requires approval via ``approve_draft``. Use this to safely
    pause underperforming campaigns with a paper trail.
    """
    ctx = _ReqCtx("pause_campaign")
    payload = {
        "workspace_id": input.workspace_id,
        "draft_type": "pause_campaign",
        "campaign_id": input.campaign_id,
        "reason": input.reason,
    }
    result = await _api_call("POST", "/drafts", json_data=payload, ctx=ctx)
    return _tool_result(
        ctx,
        result,
        formatter=lambda r: _fmt_draft_created(
            r, "pause_campaign", {"campaign_id": input.campaign_id, "reason": input.reason}
        ),
    )


@mcp.tool()
async def resume_campaign(input: ResumeCampaignInput) -> str:
    """Resume a paused campaign as a DRAFT.

    The campaign is NOT resumed immediately. A draft is created with status
    'pending' that requires approval via ``approve_draft``. Use this to safely
    resume campaigns that were previously paused.
    """
    ctx = _ReqCtx("resume_campaign")
    payload = {
        "workspace_id": input.workspace_id,
        "draft_type": "resume_campaign",
        "campaign_id": input.campaign_id,
        "reason": input.reason,
    }
    result = await _api_call("POST", "/drafts", json_data=payload, ctx=ctx)
    return _tool_result(
        ctx,
        result,
        formatter=lambda r: _fmt_draft_created(
            r, "resume_campaign", {"campaign_id": input.campaign_id, "reason": input.reason}
        ),
    )


@mcp.tool()
async def duplicate_campaign(input: DuplicateCampaignInput) -> str:
    """Clone an existing campaign as a DRAFT.

    The source campaign is duplicated with the new name. The duplicate is
    created as a draft and requires approval via ``approve_draft`` before
    it is created on the live ad account. This is useful for quickly launching
    similar campaigns or running A/B variants.
    """
    ctx = _ReqCtx("duplicate_campaign")
    payload = {
        "workspace_id": input.workspace_id,
        "draft_type": "duplicate_campaign",
        "campaign_id": input.campaign_id,
        "new_name": input.new_name,
    }
    result = await _api_call("POST", "/drafts", json_data=payload, ctx=ctx)
    return _tool_result(
        ctx,
        result,
        formatter=lambda r: _fmt_draft_created(
            r, "duplicate_campaign", {"source_campaign_id": input.campaign_id, "new_name": input.new_name}
        ),
    )


@mcp.tool()
async def get_campaign_insights(input: GetCampaignInsightsInput) -> str:
    """Get performance metrics (insights) for a campaign over a date range.

    Returns spend, impressions, clicks, CTR, CPC, conversions, CPA, ROAS,
    and revenue. Supports breakdown by day, week, month, platform, country,
    age, or gender. Use this to analyze campaign performance trends.
    """
    ctx = _ReqCtx("get_campaign_insights")
    params: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "campaign_id": input.campaign_id,
        "date_preset": input.date_preset,
    }
    if input.date_from is not None:
        params["date_from"] = input.date_from
    if input.date_to is not None:
        params["date_to"] = input.date_to
    if input.breakdown is not None:
        params["breakdown"] = input.breakdown

    result = await _api_call("GET", f"/campaigns/{input.campaign_id}/insights", params=params, ctx=ctx)
    return _tool_result(ctx, result, formatter=lambda r: _fmt_insights(r, input.date_preset))


# ===========================================================================
# TOOL IMPLEMENTATIONS — AD TOOLS (6)
# ===========================================================================


@mcp.tool()
async def list_ads(input: ListAdsInput) -> str:
    """List all ads with optional filtering by campaign, adset, and status.

    Returns a paginated list of ads with key metrics. Use ``campaign_id`` to
    filter ads within a specific campaign, or ``adset_id`` for a specific adset.
    """
    ctx = _ReqCtx("list_ads")
    params: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "status": input.status,
        "limit": input.limit,
        "offset": input.offset,
    }
    if input.campaign_id is not None:
        params["campaign_id"] = input.campaign_id
    if input.adset_id is not None:
        params["adset_id"] = input.adset_id

    result = await _api_call("GET", "/ads", params=params, ctx=ctx)
    return _tool_result(ctx, result, formatter=_fmt_ad_list)


@mcp.tool()
async def get_ad(input: GetAdInput) -> str:
    """Get detailed information about a single ad by its ID.

    Returns comprehensive ad details including creative info (type, URL, text,
    headline, CTA), performance metrics (spend, impressions, clicks, CTR, CPA,
    ROAS), and targeting. Use this to inspect a specific ad before editing.
    """
    ctx = _ReqCtx("get_ad")
    result = await _api_call(
        "GET",
        f"/ads/{input.ad_id}",
        params={"workspace_id": input.workspace_id},
        ctx=ctx,
    )
    return _tool_result(ctx, result, formatter=_fmt_ad_detail)


@mcp.tool()
async def create_ad(input: CreateAdInput) -> str:
    """Create a new ad as a DRAFT.

    The ad is NOT published to the live ad account immediately. A draft is
    created with status 'pending' that requires approval via ``approve_draft``.
    Provide the creative asset URL, ad copy, headline, and call-to-action
    to create a complete ad ready for review.
    """
    ctx = _ReqCtx("create_ad")
    payload: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "draft_type": "create_ad",
        "adset_id": input.adset_id,
        "name": input.name,
        "creative_type": input.creative_type,
    }
    if input.creative_url is not None:
        payload["creative_url"] = input.creative_url
    if input.creative_text is not None:
        payload["creative_text"] = input.creative_text
    if input.headline is not None:
        payload["headline"] = input.headline
    if input.description is not None:
        payload["description"] = input.description
    if input.call_to_action is not None:
        payload["call_to_action"] = input.call_to_action
    if input.destination_url is not None:
        payload["destination_url"] = input.destination_url
    if input.tracking_spec is not None:
        payload["tracking_spec"] = _safe_json_loads(input.tracking_spec, "tracking_spec")

    result = await _api_call("POST", "/drafts", json_data=payload, ctx=ctx)
    return _tool_result(
        ctx,
        result,
        formatter=lambda r: _fmt_draft_created(
            r, "create_ad", {"adset_id": input.adset_id, "name": input.name, "creative_type": input.creative_type}
        ),
    )


@mcp.tool()
async def update_ad(input: UpdateAdInput) -> str:
    """Update an existing ad (creative, copy, targeting) as a DRAFT.

    Changes are NOT applied immediately. A draft is created that must be
    approved via ``approve_draft``. Provide only the fields you want to
    change — omitted fields are left unchanged.
    """
    ctx = _ReqCtx("update_ad")
    payload: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "draft_type": "update_ad",
        "ad_id": input.ad_id,
    }
    changes: dict[str, Any] = {}
    if input.name is not None:
        changes["name"] = input.name
    if input.creative_text is not None:
        changes["creative_text"] = input.creative_text
    if input.headline is not None:
        changes["headline"] = input.headline
    if input.description is not None:
        changes["description"] = input.description
    if input.creative_url is not None:
        changes["creative_url"] = input.creative_url
    if input.call_to_action is not None:
        changes["call_to_action"] = input.call_to_action
    if input.destination_url is not None:
        changes["destination_url"] = input.destination_url
    if input.targeting is not None:
        changes["targeting"] = _safe_json_loads(input.targeting, "targeting")
    payload["changes"] = changes
    if input.reason is not None:
        payload["reason"] = input.reason

    result = await _api_call("POST", "/drafts", json_data=payload, ctx=ctx)
    return _tool_result(
        ctx,
        result,
        formatter=lambda r: _fmt_draft_created(
            r, "update_ad", {"ad_id": input.ad_id, "changes": list(changes.keys()), "reason": input.reason}
        ),
    )


@mcp.tool()
async def pause_ad(input: PauseAdInput) -> str:
    """Pause an underperforming ad as a DRAFT.

    The ad is NOT paused immediately. A draft is created with status 'pending'
    that requires approval via ``approve_draft``. Use this to safely pause ads
    with declining performance (e.g. low CTR, high CPA) with an audit trail.
    """
    ctx = _ReqCtx("pause_ad")
    payload = {
        "workspace_id": input.workspace_id,
        "draft_type": "pause_ad",
        "ad_id": input.ad_id,
        "reason": input.reason,
    }
    result = await _api_call("POST", "/drafts", json_data=payload, ctx=ctx)
    return _tool_result(
        ctx,
        result,
        formatter=lambda r: _fmt_draft_created(r, "pause_ad", {"ad_id": input.ad_id, "reason": input.reason}),
    )


@mcp.tool()
async def get_ad_performance(input: GetAdPerformanceInput) -> str:
    """Get ad-level performance metrics over a date range.

    Returns spend, impressions, clicks, CTR, CPC, conversions, CPA, and ROAS
    for a specific ad. Use this to evaluate individual ad creative performance
    and compare variants.
    """
    ctx = _ReqCtx("get_ad_performance")
    params: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "date_preset": input.date_preset,
    }
    if input.date_from is not None:
        params["date_from"] = input.date_from
    if input.date_to is not None:
        params["date_to"] = input.date_to

    result = await _api_call("GET", f"/ads/{input.ad_id}/performance", params=params, ctx=ctx)
    return _tool_result(ctx, result, formatter=lambda r: _fmt_insights(r, input.date_preset))


# ===========================================================================
# TOOL IMPLEMENTATIONS — OPTIMIZATION TOOLS (6)
# ===========================================================================


@mcp.tool()
async def get_performance_summary(input: GetPerformanceSummaryInput) -> str:
    """Get a cross-platform performance summary with KPIs.

    Aggregates spend, impressions, clicks, conversions, revenue, CTR, CPC,
    CPA, and ROAS across all connected platforms and campaigns. Includes
    breakdown by platform and by campaign. Use this as a dashboard overview.
    """
    ctx = _ReqCtx("get_performance_summary")
    params: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "date_preset": input.date_preset,
    }
    if input.date_from is not None:
        params["date_from"] = input.date_from
    if input.date_to is not None:
        params["date_to"] = input.date_to
    if input.platform is not None:
        params["platform"] = input.platform

    result = await _api_call("GET", "/reports/summary", params=params, ctx=ctx)
    return _tool_result(ctx, result, formatter=_fmt_performance_summary)


@mcp.tool()
async def get_budget_pacing(input: GetBudgetPacingInput) -> str:
    """Get budget utilization and pacing analysis.

    Shows how much of each campaign's budget has been spent, what remains,
    the pacing percentage, days remaining, and whether spend is on track.
    Use this to catch overspending or underspending before month-end.
    """
    ctx = _ReqCtx("get_budget_pacing")
    params: dict[str, Any] = {"workspace_id": input.workspace_id}
    if input.campaign_id is not None:
        params["campaign_id"] = input.campaign_id
    if input.account_id is not None:
        params["account_id"] = input.account_id
    if input.platform is not None:
        params["platform"] = input.platform

    result = await _api_call("GET", "/reports/pacing", params=params, ctx=ctx)
    return _tool_result(ctx, result, formatter=_fmt_budget_pacing)


@mcp.tool()
async def detect_creative_fatigue(input: DetectCreativeFatigueInput) -> str:
    """Detect creative fatigue scores across ads.

    Creative fatigue occurs when an ad's performance degrades over time due
    to audience saturation. This tool analyzes CTR trends, frequency, and
    impression velocity to flag ads that may need fresh creative.

    Ads with a fatigue score above the ``threshold`` are flagged as fatigued
    and include a recommendation (e.g. 'refresh creative', 'expand audience',
    'reduce budget').
    """
    ctx = _ReqCtx("detect_creative_fatigue")
    params: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "threshold": input.threshold,
        "lookback_days": input.lookback_days,
    }
    if input.campaign_id is not None:
        params["campaign_id"] = input.campaign_id
    if input.adset_id is not None:
        params["adset_id"] = input.adset_id

    result = await _api_call("GET", "/optimization/creative-fatigue", params=params, ctx=ctx)
    return _tool_result(ctx, result, formatter=_fmt_creative_fatigue)


@mcp.tool()
async def get_optimization_recommendations(input: GetOptimizationRecommendationsInput) -> str:
    """Get AI-generated optimization recommendations.

    Returns actionable recommendations for improving campaign performance.
    Each recommendation includes type (budget, bidding, targeting, creative),
    priority, estimated impact, and affected entity. Use this to identify
    high-value optimization opportunities.
    """
    ctx = _ReqCtx("get_optimization_recommendations")
    params: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "focus_area": input.focus_area,
        "limit": input.limit,
    }
    if input.campaign_id is not None:
        params["campaign_id"] = input.campaign_id
    if input.platform is not None:
        params["platform"] = input.platform

    result = await _api_call("GET", "/optimization/recommendations", params=params, ctx=ctx)
    return _tool_result(ctx, result, formatter=_fmt_optimization_recommendations)


@mcp.tool()
async def execute_optimization(input: ExecuteOptimizationInput) -> str:
    """Apply an AI optimization recommendation as a DRAFT.

    The change is NOT applied to the live ad account immediately. A draft
    is created that requires approval via ``approve_draft``. This ensures
    all AI-suggested changes are reviewed by a human before taking effect.
    """
    ctx = _ReqCtx("execute_optimization")
    payload = {
        "workspace_id": input.workspace_id,
        "recommendation_id": input.recommendation_id,
        "reason": input.reason,
    }
    result = await _api_call("POST", "/optimization/execute", json_data=payload, ctx=ctx)
    return _tool_result(
        ctx,
        result,
        formatter=lambda r: _fmt_draft_created(
            r, "execute_optimization", {"recommendation_id": input.recommendation_id, "reason": input.reason}
        ),
    )


@mcp.tool()
async def get_morning_brief(input: GetMorningBriefInput) -> str:
    """Generate a morning brief — a daily summary for the marketing team.

    The brief includes: executive summary, key metrics (spend, impressions,
    clicks, conversions, ROAS, CPA), alerts (overspend, fatigue, anomalies),
    AI recommendations, and a platform-by-platform breakdown. Use this to
    start each day with a clear picture of advertising performance.
    """
    ctx = _ReqCtx("get_morning_brief")
    params: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "date_preset": input.date_preset,
        "include_recommendations": input.include_recommendations,
    }

    result = await _api_call("GET", "/reports/morning-brief", params=params, ctx=ctx)
    return _tool_result(ctx, result, formatter=_fmt_morning_brief)


# ===========================================================================
# TOOL IMPLEMENTATIONS — AUDIENCE TOOLS (3)
# ===========================================================================


@mcp.tool()
async def list_audiences(input: ListAudiencesInput) -> str:
    """List custom audiences, lookalike audiences, and saved audiences.

    Returns audience names, types, platforms, estimated sizes, and status.
    Filter by platform or audience type to narrow results. Use this to
    review available audiences before creating or targeting campaigns.
    """
    ctx = _ReqCtx("list_audiences")
    params: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "audience_type": input.audience_type,
        "limit": input.limit,
        "offset": input.offset,
    }
    if input.platform is not None:
        params["platform"] = input.platform

    result = await _api_call("GET", "/audiences", params=params, ctx=ctx)
    return _tool_result(ctx, result, formatter=_fmt_audience_list)


@mcp.tool()
async def get_audience_performance(input: GetAudiencePerformanceInput) -> str:
    """Get performance data for audiences — how each audience is performing.

    Returns spend, impressions, clicks, conversions, CTR, CPA, and ROAS
    broken down by audience. Use this to identify high-value audiences
    and reallocate budget toward top performers.
    """
    ctx = _ReqCtx("get_audience_performance")
    params: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "date_preset": input.date_preset,
    }
    if input.audience_id is not None:
        params["audience_id"] = input.audience_id

    result = await _api_call("GET", "/audiences/performance", params=params, ctx=ctx)
    return _tool_result(ctx, result, formatter=_fmt_audience_performance)


@mcp.tool()
async def suggest_audiences(input: SuggestAudiencesInput) -> str:
    """Get AI-suggested audiences to test based on campaign history.

    Returns audience recommendations with estimated size, CPA, ROAS, and
    a rationale for why each audience is suggested. Use this to discover
    new targeting opportunities and expand reach efficiently.
    """
    ctx = _ReqCtx("suggest_audiences")
    params: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "limit": input.limit,
    }
    if input.campaign_id is not None:
        params["campaign_id"] = input.campaign_id
    if input.platform is not None:
        params["platform"] = input.platform
    if input.objective is not None:
        params["objective"] = input.objective

    result = await _api_call("GET", "/audiences/suggestions", params=params, ctx=ctx)
    return _tool_result(ctx, result, formatter=_fmt_audience_suggestions)


# ===========================================================================
# TOOL IMPLEMENTATIONS — REPORTING TOOLS (3)
# ===========================================================================


@mcp.tool()
async def generate_report(input: GenerateReportInput) -> str:
    """Generate a structured performance report.

    Creates a report of the specified type (performance, spend, conversion,
    creative, or audience) over the given date range. Reports include
    summary metrics and detailed sections. Use this for client reporting,
    weekly reviews, or executive summaries.
    """
    ctx = _ReqCtx("generate_report")
    payload: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "report_type": input.report_type,
        "date_preset": input.date_preset,
        "format": input.format,
        "include_charts": input.include_charts,
    }
    if input.date_from is not None:
        payload["date_from"] = input.date_from
    if input.date_to is not None:
        payload["date_to"] = input.date_to
    if input.campaign_id is not None:
        payload["campaign_id"] = input.campaign_id
    if input.platform is not None:
        payload["platform"] = input.platform

    result = await _api_call("POST", "/reports", json_data=payload, ctx=ctx)
    return _tool_result(ctx, result, formatter=_fmt_report)


@mcp.tool()
async def get_trend_analysis(input: GetTrendAnalysisInput) -> str:
    """Analyze trends for a specific metric over time.

    Tracks the direction and rate of change for a chosen metric (spend,
    impressions, clicks, CTR, CPC, conversions, CPA, ROAS, or revenue).
    Returns trend direction, slope, percentage change, and optionally a
    forecast. Use this to spot emerging patterns and predict future performance.
    """
    ctx = _ReqCtx("get_trend_analysis")
    params: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "metric": input.metric,
        "date_preset": input.date_preset,
        "granularity": input.granularity,
    }
    if input.date_from is not None:
        params["date_from"] = input.date_from
    if input.date_to is not None:
        params["date_to"] = input.date_to
    if input.campaign_id is not None:
        params["campaign_id"] = input.campaign_id
    if input.platform is not None:
        params["platform"] = input.platform

    result = await _api_call("GET", "/reports/trends", params=params, ctx=ctx)
    return _tool_result(ctx, result, formatter=_fmt_trend_analysis)


@mcp.tool()
async def compare_platforms(input: ComparePlatformsInput) -> str:
    """Compare performance across ad platforms side-by-side.

    Returns normalized metrics (spend, impressions, clicks, CTR, CPC,
    conversions, CPA, ROAS) for each platform, a summary comparison, a
    declared 'winner' platform, and actionable recommendations. Use this
    to decide budget allocation across platforms.
    """
    ctx = _ReqCtx("compare_platforms")
    params: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "date_preset": input.date_preset,
        "metrics": input.metrics,
    }
    if input.date_from is not None:
        params["date_from"] = input.date_from
    if input.date_to is not None:
        params["date_to"] = input.date_to
    if input.platforms is not None:
        params["platforms"] = input.platforms

    result = await _api_call("GET", "/reports/platform-comparison", params=params, ctx=ctx)
    return _tool_result(ctx, result, formatter=_fmt_platform_comparison)


# ===========================================================================
# TOOL IMPLEMENTATIONS — DRAFT TOOLS (4)
# ===========================================================================


@mcp.tool()
async def list_pending_drafts(input: ListPendingDraftsInput) -> str:
    """List all drafts awaiting approval.

    Returns drafts that have been created but not yet approved or rejected.
    Each draft shows its type (create_campaign, update_ad, pause_campaign, etc.),
    name, platform, creation time, and who requested it. Use this to review
    the pending change queue.
    """
    ctx = _ReqCtx("list_pending_drafts")
    params: dict[str, Any] = {
        "workspace_id": input.workspace_id,
        "status": "pending",
        "draft_type": None if input.draft_type == "all" else input.draft_type,
        "limit": input.limit,
        "offset": input.offset,
    }
    if input.platform is not None:
        params["platform"] = input.platform

    result = await _api_call("GET", "/drafts", params=params, ctx=ctx)
    return _tool_result(ctx, result, formatter=_fmt_draft_list)


@mcp.tool()
async def approve_draft(input: ApproveDraftInput) -> str:
    """Approve a pending draft so it is executed on the live ad account.

    Once approved, the draft's changes are applied to the actual ad platform
    (Meta, Google, TikTok, or Snapchat). This action is irreversible — the
    changes will go live. Use this after reviewing the draft details.
    """
    ctx = _ReqCtx("approve_draft")
    payload = {
        "workspace_id": input.workspace_id,
        "approval_note": input.approval_note,
    }
    result = await _api_call("POST", f"/drafts/{input.draft_id}/approve", json_data=payload, ctx=ctx)

    if isinstance(result, dict) and "error" in result:
        return _tool_result(ctx, result)

    d = result if isinstance(result, dict) else {}
    elapsed = ctx.elapsed_ms()
    logger.info("[%s] approve_draft OK in %s — draft %s approved", ctx.trace_id, _fmt_duration_ms(elapsed), input.draft_id)
    return _ok(
        {
            "message": "Draft approved and applied to the live ad account.",
            "draft_id": input.draft_id,
            "approval_note": input.approval_note,
            "new_status": d.get("status", "applied"),
            "applied_at": d.get("applied_at", datetime.now(timezone.utc).isoformat()),
        },
        meta={"trace_id": ctx.trace_id, "elapsed_ms": round(elapsed, 2)},
    )


@mcp.tool()
async def reject_draft(input: RejectDraftInput) -> str:
    """Reject a pending draft so it is discarded without being applied.

    The draft's changes are permanently discarded and will NOT be applied
    to any ad account. Use this when a draft is incorrect, no longer needed,
    or poses a risk to campaign performance.
    """
    ctx = _ReqCtx("reject_draft")
    payload = {
        "workspace_id": input.workspace_id,
        "rejection_reason": input.rejection_reason,
    }
    result = await _api_call("POST", f"/drafts/{input.draft_id}/reject", json_data=payload, ctx=ctx)

    if isinstance(result, dict) and "error" in result:
        return _tool_result(ctx, result)

    d = result if isinstance(result, dict) else {}
    elapsed = ctx.elapsed_ms()
    logger.info("[%s] reject_draft OK in %s — draft %s rejected", ctx.trace_id, _fmt_duration_ms(elapsed), input.draft_id)
    return _ok(
        {
            "message": "Draft rejected and discarded.",
            "draft_id": input.draft_id,
            "rejection_reason": input.rejection_reason,
            "new_status": d.get("status", "rejected"),
        },
        meta={"trace_id": ctx.trace_id, "elapsed_ms": round(elapsed, 2)},
    )


@mcp.tool()
async def get_draft_details(input: GetDraftDetailsInput) -> str:
    """Get full details of a draft including a diff view of the proposed changes.

    Returns the draft metadata (type, status, creator, timestamps) along with
    a structured diff showing exactly what will change if the draft is approved.
    Use this to thoroughly review a draft before approving or rejecting it.
    """
    ctx = _ReqCtx("get_draft_details")
    result = await _api_call(
        "GET",
        f"/drafts/{input.draft_id}",
        params={"workspace_id": input.workspace_id},
        ctx=ctx,
    )
    return _tool_result(ctx, result, formatter=_fmt_draft_detail)


# ===========================================================================
# Health check (internal — not exposed as MCP tool)
# ===========================================================================
async def _health_check() -> dict[str, Any]:
    """Check connectivity to the backend API."""
    started = time.perf_counter()
    try:
        client = _get_client()
        resp = await client.get(
            f"{API_BASE}/health",
            headers={"Authorization": f"Bearer {API_JWT}"},
            timeout=5.0,
        )
        latency_ms = (time.perf_counter() - started) * 1000
        return {
            "status": "healthy" if resp.status_code < 400 else "unhealthy",
            "api_base": API_BASE,
            "api_http_status": resp.status_code,
            "api_latency_ms": round(latency_ms, 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "api_base": API_BASE,
            "error": f"{type(e).__name__}: {e}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# ===========================================================================
# Entry point
# ===========================================================================
if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("AdNexus AI MCP Server v1.0")
    logger.info("API Base     : %s", API_BASE)
    logger.info("Transport    : %s", MCP_TRANSPORT)
    logger.info("Timeout      : %.1fs", REQUEST_TIMEOUT)
    logger.info("Log Level    : %s", LOG_LEVEL)
    logger.info("JWT Token    : %s", "set" if API_JWT else "NOT SET — requests will fail!")
    logger.info("=" * 60)
    mcp.run(transport=MCP_TRANSPORT)
