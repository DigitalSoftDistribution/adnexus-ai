/**
 * Meta OAuth Routes
 *
 * Handles the full Meta OAuth flow:
 *   1. GET  /api/v1/auth/meta/connect    — initiates OAuth, redirects to Meta
 *   2. GET  /api/v1/auth/meta/callback   — handles Meta's redirect with auth code
 *
 * After successful OAuth, stores tokens in ad_accounts for the workspace.
 */
import { Router, type Request, type Response } from "express";
import { config } from "../../config";
import { supabase } from "../../lib/supabase";
import { logger } from "../../lib/logger";
import axios from "axios";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { createOAuthState, integrationsRedirect, requestWorkspaceMatchesAuthenticatedWorkspace, userCanManageOAuthWorkspace, verifyOAuthState } from "./oauthState";

const router = Router();
const META_OAUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";
const META_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token";
const META_GRAPH_URL = "https://graph.facebook.com/v19.0";

const REQUIRED_SCOPES = ["ads_read", "ads_management", "business_management"];

/**
 * GET /api/v1/auth/meta/connect
 *
 * Initiates the Meta OAuth flow. Expects query params:
 *   - workspace_id  (required)
 *   - account_id    (optional, for reconnects)
 *   - reconnect     (optional, for reconnects)
 *
 * Redirects the user to Meta's OAuth consent page.
 */
router.get("/connect", requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    if (!requestWorkspaceMatchesAuthenticatedWorkspace(req.query.workspace_id, req.workspaceId)) {
      res.status(403).json({ error: "Workspace mismatch", code: "FORBIDDEN" });
      return;
    }
    const workspaceId = req.workspaceId!;

    if (!config.meta.appId || !config.meta.appSecret) {
      res.redirect(integrationsRedirect("meta", "config_error", "missing_meta_oauth_config"));
      return;
    }

    const redirectUri = `${config.frontend.url}/auth/meta/callback`;
    const stateB64 = createOAuthState({
      platform: "meta",
      workspaceId,
      userId: req.user!.sub,
      accountId: (req.query.account_id as string) || null,
      reconnect: req.query.reconnect === "true",
    });

    const params = new URLSearchParams({
      client_id: config.meta.appId,
      redirect_uri: redirectUri,
      scope: REQUIRED_SCOPES.join(","),
      state: stateB64,
      response_type: "code",
    });

    const authUrl = `${META_OAUTH_URL}?${params.toString()}`;
    logger.info({ workspaceId }, "Redirecting to Meta OAuth");
    if (req.accepts('json')) {
      res.json({ success: true, data: { redirectUrl: authUrl } });
      return;
    }
    res.redirect(authUrl);
  } catch (err) {
    logger.error({ err }, "Meta OAuth connect error");
    res
      .status(500)
      .json({ error: "OAuth initiation failed", code: "INTERNAL_ERROR" });
  }
});

/**
 * GET /api/v1/auth/meta/callback
 *
 * Handles Meta's OAuth callback. Expects query params:
 *   - code   (from Meta)
 *   - state  (our state with workspace_id)
 *
 * Exchanges the code for tokens, gets ad accounts,
 * and stores everything in the ad_accounts table.
 */
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const { code, state: stateB64, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn({ error: oauthError }, "Meta OAuth denied by user");
      res.redirect(
        integrationsRedirect("meta", "denied", "oauth_denied"),
      );
      return;
    }

    if (!code || !stateB64) {
      res
        .status(400)
        .json({ error: "Missing code or state", code: "VALIDATION_ERROR" });
      return;
    }

    const stateData = verifyOAuthState(stateB64, "meta");
    if (!stateData) {
      res.redirect(integrationsRedirect("meta", "error", "invalid_oauth_state"));
      return;
    }

    const { workspaceId, userId, accountId, reconnect } = stateData;
    if (!(await userCanManageOAuthWorkspace(userId, workspaceId))) {
      res.redirect(integrationsRedirect("meta", "error", "workspace_access_denied"));
      return;
    }
    const redirectUri = `${config.frontend.url}/auth/meta/callback`;

    let reconnectPlatformAccountId = accountId;
    if (reconnect && accountId && /^[0-9a-f-]{36}$/i.test(accountId)) {
      const { data: reconnectAccount } = await supabase
        .from('ad_accounts')
        .select('platform_account_id')
        .eq('id', accountId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (!reconnectAccount?.platform_account_id) {
        res.redirect(integrationsRedirect("meta", "error", "account_not_found"));
        return;
      }
      reconnectPlatformAccountId = reconnectAccount.platform_account_id;
    }

    // Step 1: Exchange code for short-lived token
    logger.info({ workspaceId }, "Exchanging Meta OAuth code for token");
    const tokenRes = await axios.get(META_TOKEN_URL, {
      params: {
        client_id: config.meta.appId,
        client_secret: config.meta.appSecret,
        redirect_uri: redirectUri,
        code,
      },
    });

    const shortLivedToken = tokenRes.data.access_token as string;
    if (!shortLivedToken) {
      res
        .status(500)
        .json({ error: "Failed to obtain access token", code: "OAUTH_ERROR" });
      return;
    }

    // Step 2: Exchange for long-lived token (60 days)
    logger.info({ workspaceId }, "Exchanging for long-lived token");
    const llRes = await axios.get(META_TOKEN_URL, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: config.meta.appId,
        client_secret: config.meta.appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    const accessToken = llRes.data.access_token as string;
    if (!accessToken) {
      res.status(500).json({ error: 'Failed to obtain long-lived access token', code: 'OAUTH_ERROR' });
      return;
    }
    const expiresIn = (llRes.data.expires_in as number) || 5184000; // default 60 days
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Step 3: Fetch ad accounts
    logger.info({ workspaceId }, "Fetching Meta ad accounts");
    const accountsRes = await axios.get(`${META_GRAPH_URL}/me/adaccounts`, {
      params: {
        access_token: accessToken,
        fields: "id,name,account_status,business_name,currency,timezone_name",
        limit: 100,
      },
    });

    const ad_accounts: Array<{
      id: string;
      name: string;
      account_status: number;
      business_name?: string;
      currency?: string;
      timezone_name?: string;
    }> = accountsRes.data.data ?? [];

    // Step 4: Store in ad_accounts table
    const results: string[] = [];
    for (const acc of ad_accounts) {
      if (reconnect && reconnectPlatformAccountId) {
        if (acc.id !== reconnectPlatformAccountId) continue;
        const { error: updateErr } = await supabase
          .from("ad_accounts")
          .update({
            oauth_token: accessToken,
            refresh_token: accessToken, // Meta uses same token refreshed
            token_expires_at: expiresAt,
            scopes: REQUIRED_SCOPES,
            status: "active",
            is_active: true,
            metadata: {
              accountName: acc.name || `Meta Ads Account ${acc.id}`,
              business_name: acc.business_name,
              currency: acc.currency,
              timezone: acc.timezone_name,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("platform_account_id", reconnectPlatformAccountId)
          .eq("workspace_id", workspaceId);

        if (!updateErr) results.push(acc.id);
      } else if (!reconnect) {
        // Check if account already exists
        const { data: existing } = await supabase
          .from("ad_accounts")
          .select("id")
          .eq("platform_account_id", acc.id)
          .eq("workspace_id", workspaceId)
          .maybeSingle();

        if (existing) {
          // Update
          const { error: updateErr } = await supabase
            .from("ad_accounts")
            .update({
              oauth_token: accessToken,
              refresh_token: accessToken,
              token_expires_at: expiresAt,
              scopes: REQUIRED_SCOPES,
              status: "active",
              is_active: true,
              metadata: {
                accountName: acc.name || `Meta Ads Account ${acc.id}`,
                business_name: acc.business_name,
                currency: acc.currency,
                timezone: acc.timezone_name,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (!updateErr) results.push(acc.id);
        } else {
          // Insert new
          const { data: inserted, error: insertErr } = await supabase
            .from("ad_accounts")
            .insert({
              workspace_id: workspaceId,
              platform: "meta",
              platform_account_id: acc.id,
              name: acc.name || `Meta Ads Account ${acc.id}`,
              status: acc.account_status === 1 ? "active" : "error",
              oauth_token: accessToken,
              refresh_token: accessToken,
              token_expires_at: expiresAt,
              scopes: REQUIRED_SCOPES,
              is_active: acc.account_status === 1,
              metadata: {
                accountName: acc.name || `Meta Ads Account ${acc.id}`,
                business_name: acc.business_name,
                currency: acc.currency,
                timezone: acc.timezone_name,
              },
            })
            .select("id")
            .single();

          if (!insertErr && inserted) results.push(acc.id);
        }
      }
    }

    logger.info(
      { workspaceId, accountsAdded: results.length },
      "Meta OAuth complete",
    );

    // Redirect back to frontend with success
    const frontendParams = new URLSearchParams({
      platform: "meta",
      status: results.length > 0 ? "connected" : "no_accounts",
      accounts: results.length.toString(),
      reason: results.length > 0 ? "connected" : "no_eligible_ad_accounts",
    });
    res.redirect(
      `${config.frontend.url}/dashboard/integrations?${frontendParams.toString()}`,
    );
  } catch (err) {
    logger.error({ err }, "Meta OAuth callback error");
    res.redirect(
      integrationsRedirect("meta", "error", "oauth_failed"),
    );
  }
});

/**
 * POST /api/v1/auth/meta/disconnect
 *
 * Disconnects a Meta ad account by revoking the stored token.
 * Body: { account_id: string, workspace_id: string }
 */
router.post("/disconnect", async (req: Request, res: Response) => {
  try {
    const { account_id, workspace_id } = req.body;

    if (!account_id || !workspace_id) {
      res.status(400).json({
        error: "account_id and workspace_id required",
        code: "VALIDATION_ERROR",
      });
      return;
    }

    // Fetch the token
    const { data: account } = await supabase
      .from("ad_accounts")
      .select("oauth_token")
      .eq("platform_account_id", account_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (account?.oauth_token) {
      // Revoke with Meta
      try {
        await axios.delete(`${META_GRAPH_URL}/me/permissions`, {
          params: { access_token: account.oauth_token },
        });
      } catch {
        // Token may already be invalid; continue with DB cleanup
      }
    }

    await supabase
      .from("ad_accounts")
      .update({
        status: "disconnected",
        is_active: false,
        oauth_token: null,
        refresh_token: null,
        token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("platform_account_id", account_id)
      .eq("workspace_id", workspace_id);

    res.json({ success: true, message: "Meta account disconnected" });
  } catch (err) {
    logger.error({ err }, "Meta disconnect error");
    res
      .status(500)
      .json({ error: "Disconnect failed", code: "INTERNAL_ERROR" });
  }
});

export default router;
