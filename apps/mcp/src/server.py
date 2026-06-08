#!/usr/bin/env python3
"""
AdNexus AI - Production-Ready MCP Server v2
============================================
A FastMCP server that proxies 15 tools to the AdNexus Node.js API,
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
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any, Literal, Optional

import httpx
from fastmcp import FastMCP
from pydantic import BaseModel, Field

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
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Any | None:
        async with self._lock:
            if key not in self._cache:
                return None
            value, timestamp = self._cache[key]
            if datetime.now() - timestamp > self._ttl:
                del self._cache[key]
                return None
            return value

    async def set(self, key: str, value: Any) -> None:
        async with self._lock:
            self._cache[key] = (value, datetime.now())

    async def invalidate(self, pattern: str | None = None) -> None:
        async with self._lock:
            if pattern is None:
                self._cache.clear()
            else:
                keys_to_remove = [k for k in self._cache if pattern in k]
                for k in keys_to_remove:
                    del self._cache[k]


tool_cache = ToolCache(CACHE_TTL)


# ---------------------------------------------------------------------------
# Token-bucket rate limiter
# ---------------------------------------------------------------------------
class RateLimiter:
    """Simple token-bucket rate limiter for protecting downstream API."""

    def __init__(self, rate: float = 10.0, burst: int = 20):
        self._rate = rate
        self._burst = burst
        self._tokens = float(burst)
        self._last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> bool:
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_refill
            self._tokens = min(self._burst, self._tokens + elapsed * self._rate)
            self._last_refill = now
            if self._tokens >= 1.0:
                self._tokens -= 1.0
                return True
            return False

_rate_limiter = RateLimiter()


def rate_limited(func):
    """Decorator that enforces rate limiting on tool calls."""
    async def wrapper(*args, **kwargs):
        if not await _rate_limiter.acquire():
            return _err("Rate limit exceeded — please slow down requests", code="RATE_LIMITED")
        return await func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    wrapper.__doc__ = func.__doc__
    return wrapper


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
    if isinstance(result, dict) and "error" in result:
        return _err(result["error"], meta={"trace_id": ctx.trace_id})
    data = formatter(result) if formatter else result
    return _ok(data, meta={"trace_id": ctx.trace_id, "elapsed_ms": round(ctx.elapsed_ms(), 2)})


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
                await tool_cache.set(cache_key, data)

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


# ---------------------------------------------------------------------------
# MCP Server
# ---------------------------------------------------------------------------
mcp = FastMCP("adnexus-ai")



# ---------------------------------------------------------------------------
# Workspace context authentication
# ---------------------------------------------------------------------------
async def _validate_workspace(workspace_id: str, ctx: _ReqCtx) -> str | None:
    """Validate that the caller has access to the given workspace.

    Returns an error message string if validation fails, or None if successful.
    """
    if not workspace_id:
        return _err("workspace_id is required", code="AUTH_MISSING_WORKSPACE")
    result = await _api_call(
        "GET", f"/workspaces/{workspace_id}/verify",
        params={"workspace_id": workspace_id},
        ctx=ctx,
        use_cache=True,
    )
    if isinstance(result, dict) and "error" in result:
        return _err(f"Workspace access denied: {result['error']}", code="AUTH_WORKSPACE_DENIED")
    return None


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
    platform: Literal["meta", "google", "tiktok", "snap"] = Field(..., description="Platform: meta, google, tiktok, snap")
    name: str = Field(..., min_length=2, max_length=255)
    status: Literal["draft", "active", "paused", "archived"] = Field("draft", description="Campaign status")
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
    status: Optional[Literal["draft", "active", "paused", "archived"]] = Field(None)
    daily_budget: Optional[float] = Field(None, ge=0)
    lifetime_budget: Optional[float] = Field(None, ge=0)


class GetCampaignSummaryInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace UUID")


class ListDraftsInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace UUID")
    status: Optional[str] = Field(None, description="Filter by draft status")
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)


class CreateDraftInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace UUID")
    platform: Literal["meta", "google", "tiktok", "snap"] = Field(..., description="Platform: meta, google, tiktok, snap")
    campaign_id: Optional[str] = Field(None, description="Campaign UUID")
    draft_type: str = Field(..., description="Type of change")
    change_summary: str = Field(..., min_length=5, max_length=500)
    change_detail: dict = Field(default_factory=dict)
    ai_reasoning: Optional[str] = Field(None)
    impact_estimate: Optional[str] = Field(None)


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
    campaign_ids: list[str] = Field(default_factory=list, max_length=50, description="Campaigns to forecast")
    days: int = Field(30, ge=7, le=90, description="Forecast horizon in days")
    budget_scenarios: list[float] = Field(default_factory=lambda: [1.0, 1.2, 1.5], max_length=10, description="Budget multipliers to test")


class BatchOperationInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace UUID")
    operations: list[dict] = Field(..., max_length=50, description="List of operations to perform")


class CacheControlInput(BaseModel):
    action: str = Field(..., description="Action: clear, stats")
    pattern: Optional[str] = Field(None, description="Pattern to match for selective clearing")


# ===========================================================================
# Campaign tools
# ===========================================================================
@mcp.tool()
@rate_limited
async def list_campaigns(input: ListCampaignsInput) -> str:
    """List campaigns for a workspace with optional filters."""
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
@rate_limited
async def get_campaign(input: GetCampaignInput) -> str:
    """Get detailed information about a specific campaign."""
    ctx = _ReqCtx("get_campaign")
    result = await _api_call(
        "GET", f"/campaigns/{input.campaign_id}", params={"workspace_id": input.workspace_id}, ctx=ctx, use_cache=True
    )
    return _tool_result(ctx, result)


@mcp.tool()
@rate_limited
async def create_campaign(input: CreateCampaignInput) -> str:
    """Create a new advertising campaign."""
    ctx = _ReqCtx("create_campaign")
    payload = input.model_dump(exclude_none=True)
    result = await _api_call("POST", "/campaigns", json_data=payload, ctx=ctx)
    await tool_cache.invalidate("/campaigns")
    return _tool_result(ctx, result)


@mcp.tool()
@rate_limited
async def update_campaign(input: UpdateCampaignInput) -> str:
    """Update an existing campaign."""
    ctx = _ReqCtx("update_campaign")
    payload = input.model_dump(exclude_none=True)
    del payload["campaign_id"]
    del payload["workspace_id"]
    result = await _api_call(
        "PATCH", f"/campaigns/{input.campaign_id}", json_data=payload, ctx=ctx
    )
    await tool_cache.invalidate(f"/campaigns/{input.campaign_id}")
    return _tool_result(ctx, result)


@mcp.tool()
@rate_limited
async def get_campaign_summary(input: GetCampaignSummaryInput) -> str:
    """Get aggregate campaign statistics for a workspace."""
    ctx = _ReqCtx("get_campaign_summary")
    result = await _api_call(
        "GET", "/campaigns/summary", params={"workspace_id": input.workspace_id}, ctx=ctx, use_cache=True
    )
    return _tool_result(ctx, result)


# ===========================================================================
# Draft tools
# ===========================================================================
@mcp.tool()
@rate_limited
async def list_drafts(input: ListDraftsInput) -> str:
    """List optimization drafts for a workspace."""
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
@rate_limited
async def create_draft(input: CreateDraftInput) -> str:
    """Create an optimization draft for review."""
    ctx = _ReqCtx("create_draft")
    payload = input.model_dump(exclude_none=True)
    result = await _api_call("POST", "/drafts", json_data=payload, ctx=ctx)
    await tool_cache.invalidate("/drafts")
    return _tool_result(ctx, result)


@mcp.tool()
@rate_limited
async def approve_draft(input: ApproveDraftInput) -> str:
    """Approve a pending optimization draft."""
    ctx = _ReqCtx("approve_draft")
    result = await _api_call(
        "POST", f"/drafts/{input.draft_id}/approve", json_data={"workspace_id": input.workspace_id}, ctx=ctx
    )
    await tool_cache.invalidate("/drafts")
    await tool_cache.invalidate(f"/drafts/{input.draft_id}")
    return _tool_result(ctx, result)


@mcp.tool()
@rate_limited
async def reject_draft(input: RejectDraftInput) -> str:
    """Reject a pending optimization draft."""
    ctx = _ReqCtx("reject_draft")
    payload = {"workspace_id": input.workspace_id}
    if input.rejection_reason:
        payload["rejection_reason"] = input.rejection_reason
    result = await _api_call("POST", f"/drafts/{input.draft_id}/reject", json_data=payload, ctx=ctx)
    await tool_cache.invalidate("/drafts")
    await tool_cache.invalidate(f"/drafts/{input.draft_id}")
    return _tool_result(ctx, result)


@mcp.tool()
@rate_limited
async def get_draft_details(input: GetDraftDetailsInput) -> str:
    """Get full details of a draft including change diff."""
    ctx = _ReqCtx("get_draft_details")
    result = await _api_call(
        "GET", f"/drafts/{input.draft_id}", params={"workspace_id": input.workspace_id}, ctx=ctx, use_cache=True
    )
    return _tool_result(ctx, result)


# ===========================================================================
# AI Tools (New in v2)
# ===========================================================================
@mcp.tool()
@rate_limited
async def generate_creative(input: GenerateCreativeInput) -> str:
    """Generate ad creative variants using AI.

    Creates multiple creative variants based on a prompt/brief.
    Returns generated assets with metadata for review.
    """
    ctx = _ReqCtx("generate_creative")
    payload = input.model_dump(exclude_none=True)

    # Call the AI service endpoint
    result = await _api_call("POST", "/ai/generate-creative", json_data=payload, ctx=ctx)
    return _tool_result(ctx, result)


@mcp.tool()
@rate_limited
async def analyze_audience(input: AnalyzeAudienceInput) -> str:
    """Analyze audience performance and suggest optimizations.

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
@rate_limited
async def forecast_budget(input: ForecastBudgetInput) -> str:
    """Forecast campaign performance under different budget scenarios.

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
@rate_limited
async def batch_operations(input: BatchOperationInput) -> str:
    """Execute multiple operations in a single batch request.

    Each operation should have: {tool: string, input: object}
    Returns results for all operations with individual success/failure status.
    """
    ctx = _ReqCtx("batch_operations")
    if len(input.operations) > 50:
        return _err("Batch limited to 50 operations per request", code="BATCH_TOO_LARGE")
    results = []

    for idx, op in enumerate(input.operations):
        op_ctx = _ReqCtx(f"batch_op_{idx}")
        tool_name = op.get("tool", "unknown")
        tool_input = op.get("input", {})

        try:
            # Route to appropriate tool
            if tool_name == "create_draft":
                result = await _api_call("POST", "/drafts", json_data=tool_input, ctx=op_ctx)
            elif tool_name == "approve_draft":
                draft_id = tool_input.get("draft_id")
                result = await _api_call("POST", f"/drafts/{draft_id}/approve", json_data=tool_input, ctx=op_ctx)
            elif tool_name == "update_campaign":
                campaign_id = tool_input.get("campaign_id")
                result = await _api_call("PATCH", f"/campaigns/{campaign_id}", json_data=tool_input, ctx=op_ctx)
            else:
                result = {"error": f"Unknown tool: {tool_name}"}

            results.append({
                "index": idx,
                "tool": tool_name,
                "success": "error" not in result,
                "data": result,
            })
        except Exception as e:
            results.append({
                "index": idx,
                "tool": tool_name,
                "success": False,
                "error": str(e),
            })

    return _ok({
        "total": len(input.operations),
        "successful": sum(1 for r in results if r["success"]),
        "failed": sum(1 for r in results if not r["success"]),
        "results": results,
    }, meta={"trace_id": ctx.trace_id, "elapsed_ms": round(ctx.elapsed_ms(), 2)})


# ===========================================================================
# Cache Management (New in v2)
# ===========================================================================
@mcp.tool()
@rate_limited
async def cache_control(input: CacheControlInput) -> str:
    """Manage the MCP tool result cache.

    Actions:
      - clear: Clear all cached results or those matching a pattern
      - stats: Show cache statistics
    """
    ctx = _ReqCtx("cache_control")

    if input.action == "clear":
        await tool_cache.invalidate(input.pattern)
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
