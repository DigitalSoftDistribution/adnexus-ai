"""Draft-first routing tests for apps/mcp/src/server.py (SB-3113)."""

from __future__ import annotations

import importlib.util
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

SERVER_PATH = Path(__file__).resolve().parents[1] / "src" / "server.py"


def _load_server_module():
    spec = importlib.util.spec_from_file_location("adnexus_mcp_server", SERVER_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules["adnexus_mcp_server"] = module
    spec.loader.exec_module(module)
    return module


class DraftFirstRoutingTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = _load_server_module()

    def test_tool_safety_classifies_read_draft_execute(self):
        safety = self.server.TOOL_SAFETY
        self.assertEqual(safety["list_campaigns"], "read")
        self.assertEqual(safety["create_optimization_draft"], "draft")
        self.assertEqual(safety["approve_draft"], "execute")
        self.assertEqual(safety["list_mcp_tools"], "read")

    def test_unknown_tools_default_to_draft(self):
        self.assertEqual(self.server._safety_for("unknown_tool"), "draft")

    def test_safety_model_disables_direct_platform_writes(self):
        self.assertFalse(self.server.MCP_SAFETY_MODEL["direct_platform_writes_from_mcp"])
        self.assertEqual(self.server.MCP_SAFETY_MODEL["default_write_mode"], "draft_first")

    async def test_submit_optimization_draft_posts_to_drafts_not_campaigns(self):
        ctx = self.server._ReqCtx("create_optimization_draft")
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"id": "draft-123", "status": "pending"}

        with patch.object(self.server, "_api_call", new_callable=AsyncMock) as mock_api:
            mock_api.return_value = {"id": "draft-123", "status": "pending"}

            result = await self.server._submit_optimization_draft(
                ctx,
                workspace_id="ws-1",
                platform="meta",
                change_type="budget_change",
                parameters={"daily_budget": 100},
                justification="Increase budget for ROAS",
                campaign_id="camp-1",
            )

            mock_api.assert_awaited_once()
            call_kwargs = mock_api.await_args.kwargs
            self.assertEqual(mock_api.await_args.args[0], "POST")
            self.assertEqual(mock_api.await_args.args[1], "/drafts")
            self.assertEqual(call_kwargs["params"], {"workspace_id": "ws-1"})
            payload = call_kwargs["json_data"]
            self.assertEqual(payload["type"], "budget_change")
            self.assertEqual(payload["campaignId"], "camp-1")
            self.assertEqual(payload["createdBy"], "ai")
            self.assertNotIn("PATCH", str(mock_api.await_args))
            self.assertEqual(result["id"], "draft-123")

    async def test_update_campaign_routes_through_drafts(self):
        ctx = self.server._ReqCtx("update_campaign")
        update_input = self.server.UpdateCampaignInput(
            campaign_id="camp-1",
            workspace_id="ws-1",
            daily_budget=150.0,
        )

        with patch.object(self.server, "_submit_optimization_draft", new_callable=AsyncMock) as mock_draft:
            mock_draft.return_value = {"id": "draft-456"}

            raw = await self.server.update_campaign(update_input)
            parsed = json.loads(raw)

            mock_draft.assert_awaited_once()
            kwargs = mock_draft.await_args.kwargs
            self.assertEqual(kwargs["change_type"], "budget_change")
            self.assertEqual(kwargs["parameters"], {"daily_budget": 150.0})
            self.assertTrue(parsed["success"])

    async def test_list_mcp_tools_returns_safety_catalog(self):
        ctx_input = self.server.ListMcpToolsInput()
        raw = await self.server.list_mcp_tools(ctx_input)
        parsed = json.loads(raw)

        self.assertTrue(parsed["success"])
        self.assertIn("create_optimization_draft", [t["name"] for t in parsed["data"]["tools"]])
        draft_tool = next(t for t in parsed["data"]["tools"] if t["name"] == "create_optimization_draft")
        self.assertEqual(draft_tool["safety"], "draft")


if __name__ == "__main__":
    unittest.main()
