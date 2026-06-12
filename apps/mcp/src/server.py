#!/usr/bin/env python3
"""
AdNexus AI - Production-Ready MCP Server v2
============================================
A FastMCP server that proxies 30+ tools to the AdNexus Node.js API,
enabling AI assistants (Claude, Cursor, etc.) to manage ad campaigns
across Meta, Google, TikTok, and Snapchat with full safety controls.

New in v2:
- SSE/HTTP transport support for remote connections
- Streaming tool responses for long-running operations
- Enhanced AI tools: creative generation, audience analysis, budget forecasting
- Tool result caching with TTL
- Batch operation support
- Structured logging with timing
- Graceful error handling
- JWT authentication
- Draft-first safety: tools classified as read / draft / execute
- Risky writes routed through create_optimization_draft (no direct live mutations)

Environment Variables
---------------------
    API_BASE_URL   : Base URL of the AdNexus API (default: http://localhost:3000/api/v1)
    API_JWT_TOKEN  : JWT token for authenticating with the AdNexus backend
    LOG_LEVEL      : Logging level (default: INFO)
    MCP_TRANSPORT  : FastMCP transport — 'stdio', 'sse', or 'http' (default: stdio)
    MCP_PORT       : Port for SSE/HTTP transport (default: 8080)
    MCP_HOST       : Host for SSE/HTTP transport (default: 0.0.0.0)
    CACHE_TTL      : Tool result cache TTL in seconds (default: 60)
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
from datetime import datetime, timezone, timedelta
from typing import Any, Literal, Optional
from functools import lru_cache

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
MCP_PORT: int = int(os.getenv("MCP_PORT", "8080"))
MCP_HOST: str = os.getenv("MCP_HOST", "0.0.0.0")
REQUEST_TIMEOUT: float = float(os.getenv("REQUEST_TIMEOUT", "30.0"))
CACHE_TTL: int = int(os.getenv("CACHE_TTL", "60"))

if not API_JWT:
    logger.warning("API_JWT_TOKEN is not set — requests to the backend will fail!")

# ---------------------------------------------------------------------------
# Shared async HTTP client with connection pooling
# ---------------------------------------------------------------------------
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(REQUEST_TIMEOUT),
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
            headers={"User-Agent": "AdNexus-MCP/2.0"},
        )
    return _client


# ---------------------------------------------------------------------------
# Simple in-memory cache for tool results
# ---------------------------------------------------------------------------
class ToolCache:
    def __init__(self, ttl_seconds: int = 60):
        self._cache: dict[str, tuple[Any, datetime]] = {}
        self._ttl = timedelta(seconds=ttl_seconds)

    def get(self, key: str) -> Any | None:
        if key not in self._cache:
            return None
        value, timestamp = self._cache[key]
        if datetime.now() - timestamp > self._ttl:
            del self._cache[key]
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._cache[key] = (value, datetime.now())

    def invalidate(self, pattern: str | None = None) -> None:
        if pattern is None:
            self._cache.clear()
        else:
            keys_to_remove = [k for k in self._cache if pattern in k]
            for k in keys_to_remove:
                del self._cache[k]


tool_cache = ToolCache(CACHE_TTL)

# ---------------------------------------------------------------------------
# Draft-first tool safety model (SB-3113)
# ---------------------------------------------------------------------------
ToolSafety = Literal["read", "draft", "execute"]

MCP_SAFETY_MODEL = {
    "default_write_mode": "draft_first",
    "direct_platform_writes_from_mcp": False,
    "approval_required_for_writes": True,
}

TOOL_SAFETY: dict[str, ToolSafety] = {
    # Read — no workspace mutations
    "list_campaigns": "read",
    "get_campaign": "read",
    "get_campaign_summary": "read",
    "list_drafts": "read",
    "get_draft_details": "read",
    "analyze_audience": "read",
    "forecast_budget": "read",
    "list_mcp_tools": "read",
    "cache_control": "read",
    # Draft — stage changes for human review (canonical write path)
    "create_optimization_draft": "draft",
    "create_draft": "draft",
    "create_campaign": "draft",
    "update_campaign": "draft",
    "generate_creative": "draft",
    "batch_operations": "draft",
    # Execute — human approval actions that may apply approved drafts
    "approve_draft": "execute",
    "reject_draft": "execute",
}

VALID_DRAFT_TYPES = frozenset({
    "budget_change",
    "status_change",
    "bid_adjustment",
    "targeting_edit",
    "creative_upload",
    "campaign_create",
    "campaign_duplicate",
    "campaign_delete",
    "ab_test_create",
    "budget_reallocation",
    "rule_based",
    "audience_edit",
    "schedule_change",
    "name_change",
})


def _safety_for(tool_name: str) -> ToolSafety:
    return TOOL_SAFETY.get(tool_name, "draft")


def _infer_draft_type_from_update(fields: dict[str, Any]) -> str:
    if "status" in fields:
        return "status_change"
    if "daily_budget" in fields or "lifetime_budget" in fields:
        return "budget_change"
    if "name" in fields:
        return "name_change"
    return "rule_based"


# ---------------------------------------------------------------------------
# Request context for logging / tracing
# ---------------------------------------------------------------------------
@dataclass
class _ReqCtx:
    tool_name: str
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    start: float = field(default_factory=time.perf_counter)

    def elapsed_ms(self) -> float:
        return (time.perf_counter() - self.start) * 1000


def _fmt_duration_ms(ms: float) -> str:
    if ms < 1000:
        return f"{ms:.0f}ms"
    return f"{ms / 1000:.1f}s"


# ---------------------------------------------------------------------------
# Result helpers
# ---------------------------------------------------------------------------
def _ok(data: Any, meta: dict | None = None) -> str:
    payload = {"success": True, "data": data}
    if meta:
        payload["meta"] = meta
    return json.dumps(payload, indent=2, default=str)


def _err(message: str, code: str = "ERROR", meta: dict | None = None) -> str:
    payload = {"success": False, "error": {"code": code, "message": message}}
    if meta:
        payload["meta"] = meta
    return json.dumps(payload, indent=2, default=str)


def _tool_result(ctx: _ReqCtx, result: Any, formatter=None) -> str:
    safety = _safety_for(ctx.tool_name)
    meta = {
        "trace_id": ctx.trace_id,
        "elapsed_ms": round(ctx.elapsed_ms(), 2),
        "tool_safety": safety,
        "draft_first": safety == "draft",
    }
    if isinstance(result, dict) and "error" in result:
        return _err(result["error"], meta=meta)
    data = formatter(result) if formatter else result
    return _ok(data, meta=meta)


# ---------------------------------------------------------------------------
# Low-level API call with retries
# ---------------------------------------------------------------------------
async def _api_call(
    method: str,
    path: str,
    *,
    params: dict | None = None,
    json_data: dict | None = None,
    ctx: _ReqCtx,
    use_cache: bool = False,
) -> Any:
    cache_key = f"{method}:{path}:{json.dumps(params or {})}:{json.dumps(json_data or {})}"

    if use_cache:
        cached = tool_cache.get(cache_key)
        if cached is not None:
            logger.debug("[%s] Cache hit for %s", ctx.trace_id, path)
            return cached

    client = _get_client()
    url = f"{API_BASE}{path}"
    headers = {"Authorization": f"Bearer {API_JWT}"} if API_JWT else {}

    for attempt in range(3):
        try:
            resp = await client.request(
                method, url, params=params, json=json_data, headers=headers
            )
            resp.raise_for_status()
            data = resp.json()

            if use_cache:
                tool_cache.set(cache_key, data)

            return data
        except httpx.HTTPStatusError as e:
            if e.response.status_code >= 500 and attempt < 2:
                wait = 2 ** attempt
                logger.warning("[%s] Retry %s/%s after %ss — %s", ctx.trace_id, attempt + 1, 3, wait, e)
                await asyncio.sleep(wait)
                continue
            try:
                body = e.response.json()
                return {"error": body.get("error", {}).get("message", str(e))}
            except Exception:
                return {"error": str(e)}
        except Exception as e:
            if attempt < 2:
                wait = 2 ** attempt
                logger.warning("[%s] Retry %s/%s after %ss — %s", ctx.trace_id, attempt + 1, 3, wait, e)
                await asyncio.sleep(wait)
                continue
            return {"error": f"{type(e).__name__}: {e}"}

    return {"error": "Max retries exceeded"}


async def _submit_optimization_draft(
    ctx: _ReqCtx,
    *,
    workspace_id: str,
    platform: str,
    change_type: str,
    parameters: dict[str, Any],
    justification: str,
    campaign_id: str | None = None,
    impact_estimate: str | None = None,
) -> Any:
    """Stage a proposed change via POST /drafts — never mutates live campaigns."""
    if change_type not in VALID_DRAFT_TYPES:
        return {"error": f"Unsupported change_type: {change_type}"}

    title = justification.strip()[:500] if justification.strip() else f"Proposed {change_type}"
    payload: dict[str, Any] = {
        "campaignId": campaign_id,
        "type": change_type,
        "title": title,
        "description": justification,
        "proposedChanges": parameters,
        "createdBy": "ai",
        "platform": platform,
    }
    if impact_estimate:
        payload["description"] = f"{justification}\n\nImpact: {impact_estimate}"

    result = await _api_call(
        "POST",
        "/drafts",
        params={"workspace_id": workspace_id},
        json_data=payload,
        ctx=ctx,
    )
    tool_cache.invalidate("/drafts")
    return result


# ---------------------------------------------------------------------------
# MCP Server
# ---------------------------------------------------------------------------
mcp = FastMCP("adnexus-ai")


# ===========================================================================
# Pydantic input models
# ===========================================================================
class ListCampaignsInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace UUID")
    status: Optional[str] = Field(None, description="Filter by status: active, paused, archived")
    platform: Optional[str] = Field(None, description="Filter by platform: meta, google, tiktok, snap")
    search: Optional[str] = Field(None, description="Search by campaign name")
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)


class GetCampaignInput(BaseModel):
    campaign_id: str = Field(..., description="Campaign UUID")
    workspace_id: str = Field(..., description="Workspace UUID")


class CreateCampaignInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace UUID")
    ad_account_id: str = Field(..., description="Ad account UUID")
    platform: str = Field(..., description="Platform: meta, google, tiktok, snap")
    name: str = Field(..., min_length=2, max_length=255)
    status: str = Field("draft", description="Campaign status")
    objective: Optional[str] = Field(None, description="Campaign objective")
    budget_type: Optional[str] = Field(None, description="daily or lifetime")
    daily_budget: Optional[float] = Field(None, ge=0)
    lifetime_budget: Optional[float] = Field(None, ge=0)
    start_date: Optional[str] = Field(None, description="ISO date string")
    end_date: Optional[str] = Field(None, description="ISO date string")


class UpdateCampaignInput(BaseModel):
    campaign_id: str = Field(..., description="Campaign UUID")
    workspace_id: str = Field(..., description="Workspace UUID")
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    status: Optional[str] = Field(None)
    daily_budget: Optional[float] = Field(None, ge=0)
    lifetime_budget: Optional[float] = Field(None, ge=0)


class GetCampaignSummaryInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace UUID")


class ListDraftsInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace UUID")
    status: Optional[str] = Field(None, description="Filter by draft status")
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)


class CreateOptimizationDraftInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace UUID")
    campaign_id: Optional[str] = Field(None, description="Campaign UUID (optional for campaign_create)")
    platform: str = Field("meta", description="Platform: meta, google, tiktok, snap, or all")
    change_type: str = Field(..., description="Draft type, e.g. budget_change, status_change, campaign_create")
    parameters: dict = Field(default_factory=dict, description="Proposed field changes")
    justification: str = Field(..., min_length=5, max_length=2000, description="Why this change is recommended")
    impact_estimate: Optional[str] = Field(None, description="Optional impact summary for reviewers")


class CreateDraftInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace UUID")
    platform: str = Field(..., description="Platform or 'all'")
    campaign_id: Optional[str] = Field(None, description="Campaign UUID")
    draft_type: str = Field(..., description="Type of change")
    change_summary: str = Field(..., min_length=5, max_length=500)
    change_detail: dict = Field(default_factory=dict)
    ai_reasoning: Optional[str] = Field(None)
    impact_estimate: Optional[str] = Field(None)


class ListMcpToolsInput(BaseModel):
    safety: Optional[str] = Field(None, description="Filter by safety class: read, draft, or execute")


class ApproveDraftInput(BaseModel):
    draft_id: str = Field(..., description="Draft UUID")
    workspace_id: str = Field(..., description="Workspace UUID")


class RejectDraftInput(BaseModel):
    draft_id: str = Field(..., description="Draft UUID")
    workspace_id: str = Field(..., description="Workspace UUID")
    rejection_reason: Optional[str] = Field(None)


class GetDraftDetailsInput(BaseModel):
    draft_id: str = Field(..., description="Draft UUID")
    workspace_id: str = Field(..., description="Workspace UUID")


class GenerateCreativeInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace UUID")
    campaign_id: str = Field(..., description="Campaign UUID")
    prompt: str = Field(..., description="Creative brief / prompt for AI generation")
    format: str = Field("image", description="Output format: image, video, carousel")
    count: int = Field(3, ge=1, le=10, description="Number of variants to generate")


class AnalyzeAudienceInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace UUID")
    campaign_id: Optional[str] = Field(None, description="Campaign UUID to analyze")
    platform: Optional[str] = Field(None, description="Platform to focus on")


class ForecastBudgetInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace UUID")
    campaign_ids: list[str] = Field(default_factory=list, description="Campaigns to forecast")
    days: int = Field(30, ge=7, le=90, description="Forecast horizon in days")
    budget_scenarios: list[float] = Field(default_factory=lambda: [1.0, 1.2, 1.5], description="Budget multipliers to test")


class BatchOperationInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace UUID")
    operations: list[dict] = Field(..., description="List of operations to perform")


class CacheControlInput(BaseModel):
    action: str = Field(..., description="Action: clear, stats")
    pattern: Optional[str] = Field(None, description="Pattern to match for selective clearing")


# ===========================================================================
# Campaign tools
# ===========================================================================
@mcp.tool()
async def list_campaigns(input: ListCampaignsInput) -> str:
    """[safety:read] List campaigns for a workspace with optional filters."""
    ctx = _ReqCtx("list_campaigns")
    params = {
        "workspace_id": input.workspace_id,
        "page": input.page,
        "limit": input.limit,
    }
    if input.status:
        params["status"] = input.status
    if input.platform:
        params["platform"] = input.platform
    if input.search:
        params["search"] = input.search

    result = await _api_call("GET", "/campaigns", params=params, ctx=ctx, use_cache=True)
    return _tool_result(ctx, result)


@mcp.tool()
async def get_campaign(input: GetCampaignInput) -> str:
    """[safety:read] Get detailed information about a specific campaign."""
    ctx = _ReqCtx("get_campaign")
    result = await _api_call(
        "GET", f"/campaigns/{input.campaign_id}", params={"workspace_id": input.workspace_id}, ctx=ctx, use_cache=True
    )
    return _tool_result(ctx, result)


@mcp.tool()
async def create_campaign(input: CreateCampaignInput) -> str:
    """[safety:draft] Stage a new campaign for approval — does not publish live."""
    ctx = _ReqCtx("create_campaign")
    parameters = input.model_dump(exclude_none=True, exclude={"workspace_id"})
    result = await _submit_optimization_draft(
        ctx,
        workspace_id=input.workspace_id,
        platform=input.platform,
        campaign_id=None,
        change_type="campaign_create",
        parameters=parameters,
        justification=f'Create campaign "{input.name}"',
    )
    return _tool_result(ctx, result)


@mcp.tool()
async def update_campaign(input: UpdateCampaignInput) -> str:
    """[safety:draft] Stage campaign changes for approval — does not mutate live campaigns."""
    ctx = _ReqCtx("update_campaign")
    changes = input.model_dump(exclude_none=True, exclude={"campaign_id", "workspace_id"})
    if not changes:
        return _err("No fields to update", meta={"trace_id": ctx.trace_id, "tool_safety": "draft"})

    change_type = _infer_draft_type_from_update(changes)
    summary_parts = [f"{key} update" for key in changes]
    result = await _submit_optimization_draft(
        ctx,
        workspace_id=input.workspace_id,
        platform="all",
        campaign_id=input.campaign_id,
        change_type=change_type,
        parameters=changes,
        justification=f"Proposed campaign update: {', '.join(summary_parts)}",
    )
    return _tool_result(ctx, result)


@mcp.tool()
async def get_campaign_summary(input: GetCampaignSummaryInput) -> str:
    """[safety:read] Get aggregate campaign statistics for a workspace."""
    ctx = _ReqCtx("get_campaign_summary")
    result = await _api_call(
        "GET", "/campaigns/summary", params={"workspace_id": input.workspace_id}, ctx=ctx, use_cache=True
    )
    return _tool_result(ctx, result)


# ===========================================================================
# Draft tools
# ===========================================================================
@mcp.tool()
async def list_drafts(input: ListDraftsInput) -> str:
    """[safety:read] List optimization drafts for a workspace."""
    ctx = _ReqCtx("list_drafts")
    params = {
        "workspace_id": input.workspace_id,
        "page": input.page,
        "limit": input.limit,
    }
    if input.status:
        params["status"] = input.status

    result = await _api_call("GET", "/drafts", params=params, ctx=ctx, use_cache=True)
    return _tool_result(ctx, result)


@mcp.tool()
async def create_optimization_draft(input: CreateOptimizationDraftInput) -> str:
    """[safety:draft] Canonical draft-first write path for AI assistants.

    Stages spend- or status-impacting changes for human review. Nothing goes live
    until a person approves the draft in AdNexus.
    """
    ctx = _ReqCtx("create_optimization_draft")
    result = await _submit_optimization_draft(
        ctx,
        workspace_id=input.workspace_id,
        platform=input.platform,
        campaign_id=input.campaign_id,
        change_type=input.change_type,
        parameters=input.parameters,
        justification=input.justification,
        impact_estimate=input.impact_estimate,
    )
    return _tool_result(ctx, result)


@mcp.tool()
async def create_draft(input: CreateDraftInput) -> str:
    """[safety:draft] Create an optimization draft (alias of create_optimization_draft)."""
    ctx = _ReqCtx("create_draft")
    justification = input.ai_reasoning or input.change_summary
    result = await _submit_optimization_draft(
        ctx,
        workspace_id=input.workspace_id,
        platform=input.platform,
        campaign_id=input.campaign_id,
        change_type=input.draft_type,
        parameters=input.change_detail,
        justification=justification,
        impact_estimate=input.impact_estimate,
    )
    return _tool_result(ctx, result)


@mcp.tool()
async def approve_draft(input: ApproveDraftInput) -> str:
    """[safety:execute] Approve a pending draft — may apply the staged change after review."""
    ctx = _ReqCtx("approve_draft")
    result = await _api_call(
        "POST", f"/drafts/{input.draft_id}/approve", json_data={"workspace_id": input.workspace_id}, ctx=ctx
    )
    tool_cache.invalidate("/drafts")
    tool_cache.invalidate(f"/drafts/{input.draft_id}")
    return _tool_result(ctx, result)


@mcp.tool()
async def reject_draft(input: RejectDraftInput) -> str:
    """[safety:execute] Reject a pending draft with optional feedback for the AI loop."""
    ctx = _ReqCtx("reject_draft")
    payload = {"workspace_id": input.workspace_id}
    if input.rejection_reason:
        payload["rejection_reason"] = input.rejection_reason
    result = await _api_call("POST", f"/drafts/{input.draft_id}/reject", json_data=payload, ctx=ctx)
    tool_cache.invalidate("/drafts")
    tool_cache.invalidate(f"/drafts/{input.draft_id}")
    return _tool_result(ctx, result)


@mcp.tool()
async def get_draft_details(input: GetDraftDetailsInput) -> str:
    """[safety:read] Get full details of a draft including change diff."""
    ctx = _ReqCtx("get_draft_details")
    result = await _api_call(
        "GET", f"/drafts/{input.draft_id}", params={"workspace_id": input.workspace_id}, ctx=ctx, use_cache=True
    )
    return _tool_result(ctx, result)


# ===========================================================================
# AI Tools (New in v2)
# ===========================================================================
@mcp.tool()
async def generate_creative(input: GenerateCreativeInput) -> str:
    """[safety:draft] Generate ad creative variants for review (not auto-published).

    Creates multiple creative variants based on a prompt/brief.
    Returns generated assets with metadata for review.
    """
    ctx = _ReqCtx("generate_creative")
    payload = input.model_dump(exclude_none=True)

    # Call the AI service endpoint
    result = await _api_call("POST", "/ai/generate-creative", json_data=payload, ctx=ctx)
    return _tool_result(ctx, result)


@mcp.tool()
async def analyze_audience(input: AnalyzeAudienceInput) -> str:
    """[safety:read] Analyze audience performance and suggest optimizations.

    Provides insights on audience segments, demographics, and targeting
    effectiveness with actionable recommendations.
    """
    ctx = _ReqCtx("analyze_audience")
    params = {"workspace_id": input.workspace_id}
    if input.campaign_id:
        params["campaign_id"] = input.campaign_id
    if input.platform:
        params["platform"] = input.platform

    result = await _api_call("GET", "/ai/analyze-audience", params=params, ctx=ctx, use_cache=True)
    return _tool_result(ctx, result)


@mcp.tool()
async def forecast_budget(input: ForecastBudgetInput) -> str:
    """[safety:read] Forecast campaign performance under different budget scenarios.

    Runs predictive models to estimate spend, conversions, and ROAS
    across multiple budget multiplier scenarios.
    """
    ctx = _ReqCtx("forecast_budget")
    payload = input.model_dump(exclude_none=True)

    result = await _api_call("POST", "/ai/forecast-budget", json_data=payload, ctx=ctx)
    return _tool_result(ctx, result)


# ===========================================================================
# Batch Operations (New in v2)
# ===========================================================================
@mcp.tool()
async def batch_operations(input: BatchOperationInput) -> str:
    """[safety:draft] Run multiple draft-safe operations in one request.

    Each operation should have: {tool: string, input: object}
    Write tools are routed through create_optimization_draft; execute tools
    (approve/reject) require explicit human intent.
    """
    ctx = _ReqCtx("batch_operations")
    results = []

    for idx, op in enumerate(input.operations):
        op_ctx = _ReqCtx(f"batch_op_{idx}")
        tool_name = op.get("tool", "unknown")
        tool_input = op.get("input", {})
        safety = _safety_for(tool_name)

        try:
            if tool_name in ("create_optimization_draft", "create_draft"):
                result = await _submit_optimization_draft(
                    op_ctx,
                    workspace_id=tool_input["workspace_id"],
                    platform=tool_input.get("platform", "all"),
                    campaign_id=tool_input.get("campaign_id"),
                    change_type=tool_input.get("change_type") or tool_input.get("draft_type"),
                    parameters=tool_input.get("parameters") or tool_input.get("change_detail", {}),
                    justification=tool_input.get("justification")
                    or tool_input.get("change_summary")
                    or tool_input.get("ai_reasoning", "Batch draft"),
                    impact_estimate=tool_input.get("impact_estimate"),
                )
            elif tool_name == "update_campaign":
                workspace_id = tool_input["workspace_id"]
                campaign_id = tool_input["campaign_id"]
                changes = {
                    k: v
                    for k, v in tool_input.items()
                    if k not in {"workspace_id", "campaign_id"} and v is not None
                }
                result = await _submit_optimization_draft(
                    op_ctx,
                    workspace_id=workspace_id,
                    platform=tool_input.get("platform", "all"),
                    campaign_id=campaign_id,
                    change_type=_infer_draft_type_from_update(changes),
                    parameters=changes,
                    justification=tool_input.get("justification", "Batch campaign update"),
                )
            elif tool_name == "create_campaign":
                workspace_id = tool_input["workspace_id"]
                platform = tool_input.get("platform", "meta")
                name = tool_input.get("name", "New campaign")
                params = {k: v for k, v in tool_input.items() if k != "workspace_id" and v is not None}
                result = await _submit_optimization_draft(
                    op_ctx,
                    workspace_id=workspace_id,
                    platform=platform,
                    campaign_id=None,
                    change_type="campaign_create",
                    parameters=params,
                    justification=f'Create campaign "{name}"',
                )
            elif tool_name == "approve_draft":
                draft_id = tool_input.get("draft_id")
                result = await _api_call(
                    "POST",
                    f"/drafts/{draft_id}/approve",
                    json_data={"workspace_id": tool_input.get("workspace_id")},
                    ctx=op_ctx,
                )
                tool_cache.invalidate("/drafts")
            elif tool_name == "reject_draft":
                draft_id = tool_input.get("draft_id")
                payload = {"workspace_id": tool_input.get("workspace_id")}
                if tool_input.get("rejection_reason"):
                    payload["rejection_reason"] = tool_input["rejection_reason"]
                result = await _api_call("POST", f"/drafts/{draft_id}/reject", json_data=payload, ctx=op_ctx)
                tool_cache.invalidate("/drafts")
            else:
                result = {"error": f"Unknown or unsupported batch tool: {tool_name}"}

            results.append({
                "index": idx,
                "tool": tool_name,
                "tool_safety": safety,
                "success": "error" not in result,
                "data": result,
            })
        except Exception as e:
            results.append({
                "index": idx,
                "tool": tool_name,
                "tool_safety": safety,
                "success": False,
                "error": str(e),
            })

    return _ok({
        "total": len(input.operations),
        "successful": sum(1 for r in results if r["success"]),
        "failed": sum(1 for r in results if not r["success"]),
        "results": results,
    }, meta={
        "trace_id": ctx.trace_id,
        "elapsed_ms": round(ctx.elapsed_ms(), 2),
        "tool_safety": "draft",
        "draft_first": True,
    })


# ===========================================================================
# Tool catalog (read-only)
# ===========================================================================
@mcp.tool()
async def list_mcp_tools(input: ListMcpToolsInput) -> str:
    """[safety:read] List MCP tools with read/draft/execute safety classification."""
    ctx = _ReqCtx("list_mcp_tools")
    tools = [
        {"name": name, "safety": safety}
        for name, safety in sorted(TOOL_SAFETY.items())
    ]
    if input.safety:
        tools = [tool for tool in tools if tool["safety"] == input.safety]

    return _ok({
        "safety_model": MCP_SAFETY_MODEL,
        "tools": tools,
        "counts": {
            "read": sum(1 for t in tools if t["safety"] == "read"),
            "draft": sum(1 for t in tools if t["safety"] == "draft"),
            "execute": sum(1 for t in tools if t["safety"] == "execute"),
        },
    }, meta={"trace_id": ctx.trace_id, "tool_safety": "read"})


# ===========================================================================
# Cache Management (New in v2)
# ===========================================================================
@mcp.tool()
async def cache_control(input: CacheControlInput) -> str:
    """[safety:read] Manage the MCP tool result cache.

    Actions:
      - clear: Clear all cached results or those matching a pattern
      - stats: Show cache statistics
    """
    ctx = _ReqCtx("cache_control")

    if input.action == "clear":
        tool_cache.invalidate(input.pattern)
        return _ok({"message": "Cache cleared", "pattern": input.pattern or "all"}, meta={"trace_id": ctx.trace_id})
    elif input.action == "stats":
        return _ok({
            "cached_entries": len(tool_cache._cache),
            "ttl_seconds": CACHE_TTL,
        }, meta={"trace_id": ctx.trace_id})
    else:
        return _err(f"Unknown action: {input.action}", meta={"trace_id": ctx.trace_id})


# ===========================================================================
# Health check
# ===========================================================================
async def _health_check() -> dict[str, Any]:
    started = time.perf_counter()
    try:
        client = _get_client()
        resp = await client.get(
            f"{API_BASE}/health",
            headers={"Authorization": f"Bearer {API_JWT}"} if API_JWT else {},
            timeout=5.0,
        )
        latency_ms = (time.perf_counter() - started) * 1000
        return {
            "status": "healthy" if resp.status_code < 400 else "unhealthy",
            "api_base": API_BASE,
            "api_http_status": resp.status_code,
            "api_latency_ms": round(latency_ms, 2),
            "cache_entries": len(tool_cache._cache),
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
    logger.info("AdNexus AI MCP Server v2.0")
    logger.info("API Base     : %s", API_BASE)
    logger.info("Transport    : %s", MCP_TRANSPORT)
    logger.info("Host/Port    : %s:%s", MCP_HOST, MCP_PORT)
    logger.info("Timeout      : %.1fs", REQUEST_TIMEOUT)
    logger.info("Cache TTL    : %ss", CACHE_TTL)
    logger.info("Log Level    : %s", LOG_LEVEL)
    logger.info("JWT Token    : %s", "set" if API_JWT else "NOT SET — requests will fail!")
    logger.info("=" * 60)

    if MCP_TRANSPORT in ("sse", "http"):
        mcp.run(transport=MCP_TRANSPORT, host=MCP_HOST, port=MCP_PORT)
    else:
        mcp.run(transport=MCP_TRANSPORT)
