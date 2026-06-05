/**
 * TikTok Ads OAuth Routes
 *
 * Handles the TikTok For Business OAuth flow:
 *   1. GET  /api/v1/auth/tiktok/connect   — initiates OAuth, redirects to TikTok
 *   2. GET  /api/v1/auth/tiktok/callback  — handles redirect with auth code
 *   3. POST /api/v1/auth/tiktok/disconnect — revokes a connected account
 *
 * Tokens are stored in ad_accounts using the canonical columns
 * (oauth_token / refresh_token / platform_account_id / name).
 */
import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import { config } from '../../config';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { createOAuthState, integrationsRedirect, requestWorkspaceMatchesAuthenticatedWorkspace, userCanManageOAuthWorkspace, verifyOAuthState } from './oauthState';

const router = Router();

const TIKTOK_OAUTH_URL = 'https://business-api.tiktok.com/portal/auth';
const TIKTOK_TOKEN_URL = 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/';

/**
 * GET /api/v1/auth/tiktok/connect
 * Query: workspace_id (required)
 */
router.get('/connect', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    if (!requestWorkspaceMatchesAuthenticatedWorkspace(req.query.workspace_id, req.workspaceId)) {
      res.status(403).json({ error: 'Workspace mismatch', code: 'FORBIDDEN' });
      return;
    }
    const workspaceId = req.workspaceId!;

    if (!config.tiktok.appId) {
      res.redirect(integrationsRedirect('tiktok', 'config_error', 'missing_tiktok_oauth_config'));
      return;
    }

    const redirectUri = `${config.frontend.url}/auth/tiktok/callback`;
    const state = createOAuthState({ platform: 'tiktok', workspaceId, userId: req.user!.sub });

    const params = new URLSearchParams({
      app_id: config.tiktok.appId,
      redirect_uri: redirectUri,
      state,
    });

    logger.info({ workspaceId }, 'Redirecting to TikTok OAuth');
    const authUrl = `${TIKTOK_OAUTH_URL}?${params.toString()}`;
    if (req.accepts('json')) {
      res.json({ success: true, data: { redirectUrl: authUrl } });
      return;
    }
    res.redirect(authUrl);
  } catch (err) {
    logger.error({ err }, 'TikTok OAuth connect error');
    res.status(500).json({ error: 'OAuth initiation failed', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/v1/auth/tiktok/callback
 * Exchanges auth_code for an access token and stores the account.
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { auth_code, code, state: stateB64, error: oauthError } = req.query;
    const authCode = (auth_code as string) || (code as string);

    if (oauthError) {
      logger.warn({ error: oauthError }, 'TikTok OAuth denied by user');
      res.redirect(integrationsRedirect('tiktok', 'denied', 'oauth_denied'));
      return;
    }
    if (!authCode || !stateB64) {
      res.status(400).json({ error: 'Missing code or state', code: 'VALIDATION_ERROR' });
      return;
    }

    const stateData = verifyOAuthState(stateB64, 'tiktok');
    if (!stateData) {
      res.redirect(integrationsRedirect('tiktok', 'error', 'invalid_oauth_state'));
      return;
    }
    const { workspaceId, userId } = stateData;
    if (!(await userCanManageOAuthWorkspace(userId, workspaceId))) {
      res.redirect(integrationsRedirect('tiktok', 'error', 'workspace_access_denied'));
      return;
    }

    if (!config.tiktok.appId || !config.tiktok.appSecret) {
      res.status(500).json({ error: 'TikTok OAuth not configured', code: 'CONFIG_ERROR' });
      return;
    }

    const tokenRes = await axios.post(TIKTOK_TOKEN_URL, {
      app_id: config.tiktok.appId,
      secret: config.tiktok.appSecret,
      auth_code: authCode,
    });

    const tokenData = tokenRes.data?.data ?? {};
    const accessToken = tokenData.access_token as string;
    const advertiserIds: string[] = tokenData.advertiser_ids ?? [];

    if (!accessToken) {
      logger.error({ body: tokenRes.data }, 'TikTok token exchange failed');
      res.redirect(integrationsRedirect('tiktok', 'error', 'oauth_failed'));
      return;
    }

    const advertiserId = advertiserIds[0];
    if (!advertiserId) {
      logger.error({ body: tokenRes.data }, 'TikTok token exchange returned no advertiser id');
      res.redirect(integrationsRedirect('tiktok', 'error', 'no_advertiser'));
      return;
    }
    const { error: dbError } = await supabase.from('ad_accounts').upsert(
      {
        workspace_id: workspaceId,
        platform: 'tiktok',
        platform_account_id: advertiserId,
        name: 'TikTok Ads',
        oauth_token: accessToken,
        refresh_token: null,
        scopes: [],
        status: 'active',
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,platform,platform_account_id' },
    );

    if (dbError) {
      logger.error({ err: dbError }, 'Failed to store TikTok tokens');
      res.redirect(integrationsRedirect('tiktok', 'error', 'db'));
      return;
    }

    logger.info({ workspaceId }, 'TikTok Ads account connected');
    res.redirect(integrationsRedirect('tiktok', 'connected', 'connected'));
  } catch (err) {
    logger.error({ err }, 'TikTok OAuth callback error');
    res.redirect(integrationsRedirect('tiktok', 'error', 'oauth_failed'));
  }
});

/**
 * POST /api/v1/auth/tiktok/disconnect
 * Body: { account_id: string, workspace_id: string }
 */
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const { account_id, workspace_id } = req.body;
    if (!account_id || !workspace_id) {
      res.status(400).json({ error: 'account_id and workspace_id required', code: 'VALIDATION_ERROR' });
      return;
    }

    await supabase
      .from('ad_accounts')
      .update({ status: 'disconnected', is_active: false, oauth_token: null, refresh_token: null, token_expires_at: null, updated_at: new Date().toISOString() })
      .eq('platform_account_id', account_id)
      .eq('workspace_id', workspace_id)
      .eq('platform', 'tiktok');

    res.json({ success: true, message: 'TikTok account disconnected' });
  } catch (err) {
    logger.error({ err }, 'TikTok disconnect error');
    res.status(500).json({ error: 'Disconnect failed', code: 'INTERNAL_ERROR' });
  }
});

export default router;
