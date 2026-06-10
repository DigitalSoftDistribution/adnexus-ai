/**
 * Snapchat Ads OAuth Routes
 *
 * Handles the Snap Marketing API OAuth 2.0 flow:
 *   1. GET  /api/v1/auth/snap/connect    — initiates OAuth, redirects to Snap
 *   2. GET  /api/v1/auth/snap/callback   — handles redirect with auth code
 *   3. POST /api/v1/auth/snap/disconnect — revokes a connected account
 *
 * Tokens are stored in ad_accounts using the canonical columns.
 */
import { Router, type Request, type Response } from 'express';
import { config } from '../../config';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { consumeOAuthStateNonce, createOAuthState, integrationsRedirect, oauthCallbackUrl, requestWorkspaceMatchesAuthenticatedWorkspace, sendOAuthJsonError, userCanManageOAuthWorkspace, verifyOAuthState, wantsJson } from './oauthState';

const router = Router();

const SNAP_OAUTH_URL = 'https://accounts.snapchat.com/login/oauth2/authorize';
const SNAP_TOKEN_URL = 'https://accounts.snapchat.com/login/oauth2/access_token';

const REQUIRED_SCOPES = ['snapchat-marketing-api'];

/**
 * GET /api/v1/auth/snap/connect
 * Query: workspace_id (required)
 */
router.get('/connect', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!requestWorkspaceMatchesAuthenticatedWorkspace(req.query.workspace_id, req.workspaceId)) {
      res.status(403).json({ error: 'Workspace mismatch', code: 'FORBIDDEN' });
      return;
    }
    const workspaceId = req.workspaceId!;

    if (!config.snap.clientId) {
      sendOAuthJsonError(req, res, 500, 'snap', 'config_error', 'missing_snap_oauth_config', 'Snap OAuth is not configured');
      return;
    }

    const redirectUri = oauthCallbackUrl('snap');
    const state = await createOAuthState({ platform: 'snap', workspaceId, userId: req.user!.sub });

    const params = new URLSearchParams({
      client_id: config.snap.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: REQUIRED_SCOPES.join(' '),
      state,
    });

    logger.info({ workspaceId }, 'Redirecting to Snap OAuth');
    const authUrl = `${SNAP_OAUTH_URL}?${params.toString()}`;
    if (wantsJson(req)) {
      res.json({ success: true, data: { redirectUrl: authUrl } });
      return;
    }
    res.redirect(authUrl);
  } catch (err) {
    logger.error({ err }, 'Snap OAuth connect error');
    res.status(500).json({ error: 'OAuth initiation failed', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/v1/auth/snap/callback
 * Exchanges code for tokens and stores the account.
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state: stateB64, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn({ error: oauthError }, 'Snap OAuth denied by user');
      sendOAuthJsonError(req, res, 400, 'snap', 'denied', 'oauth_denied', 'Snap OAuth was denied');
      return;
    }
    if (!code || !stateB64) {
      res.status(400).json({ error: 'Missing code or state', code: 'VALIDATION_ERROR' });
      return;
    }

    const stateData = verifyOAuthState(stateB64, 'snap');
    if (!stateData) {
      sendOAuthJsonError(req, res, 400, 'snap', 'error', 'invalid_oauth_state', 'Invalid OAuth state');
      return;
    }
    if (!(await consumeOAuthStateNonce('snap', stateData.nonce))) {
      sendOAuthJsonError(req, res, 400, 'snap', 'error', 'invalid_oauth_state', 'Invalid OAuth state');
      return;
    }

    const { workspaceId, userId } = stateData;
    if (!(await userCanManageOAuthWorkspace(userId, workspaceId))) {
      sendOAuthJsonError(req, res, 403, 'snap', 'error', 'workspace_access_denied', 'Workspace access denied');
      return;
    }

    if (!config.snap.clientId || !config.snap.clientSecret) {
      res.status(500).json({ error: 'Snap OAuth not configured', code: 'CONFIG_ERROR' });
      return;
    }

    const redirectUri = oauthCallbackUrl('snap');
    const tokenResponse = await fetch(SNAP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.snap.clientId,
        client_secret: config.snap.clientSecret,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text();
      logger.error({ status: tokenResponse.status, body }, 'Snap token exchange failed');
      sendOAuthJsonError(req, res, 502, 'snap', 'error', 'oauth_failed', 'Snap OAuth failed');
      return;
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    if (!tokens.access_token) {
      logger.error({ body: tokens }, 'Snap token exchange returned no access token');
      sendOAuthJsonError(req, res, 502, 'snap', 'error', 'oauth_failed', 'Snap OAuth failed');
      return;
    }

    const { error: dbError } = await supabase.from('ad_accounts').upsert(
      {
        workspace_id: workspaceId,
        platform: 'snap',
        platform_account_id: 'snap-ads',
        name: 'Snapchat Ads',
        oauth_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        scopes: REQUIRED_SCOPES,
        status: 'active',
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,platform,platform_account_id' },
    );

    if (dbError) {
      logger.error({ err: dbError }, 'Failed to store Snap tokens');
      sendOAuthJsonError(req, res, 500, 'snap', 'error', 'db', 'Failed to store Snap credentials');
      return;
    }

    logger.info({ workspaceId }, 'Snap Ads account connected');
    res.redirect(integrationsRedirect('snap', 'connected', 'connected'));
  } catch (err) {
    logger.error({ err }, 'Snap OAuth callback error');
    res.redirect(integrationsRedirect('snap', 'error', 'oauth_failed'));
  }
});

/**
 * POST /api/v1/auth/snap/disconnect
 * Body: { account_id: string, workspace_id: string }
 */
router.post('/disconnect', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { account_id, workspace_id } = req.body;
    if (!requestWorkspaceMatchesAuthenticatedWorkspace(workspace_id, req.workspaceId)) {
      res.status(403).json({ error: 'Workspace mismatch', code: 'FORBIDDEN' });
      return;
    }

    if (!account_id || !workspace_id) {
      res.status(400).json({ error: 'account_id and workspace_id required', code: 'VALIDATION_ERROR' });
      return;
    }

    await supabase
      .from('ad_accounts')
      .update({ status: 'disconnected', is_active: false, oauth_token: null, refresh_token: null, token_expires_at: null, updated_at: new Date().toISOString() })
      .eq('platform_account_id', account_id)
      .eq('workspace_id', workspace_id)
      .eq('platform', 'snap');

    res.json({ success: true, message: 'Snap account disconnected' });
  } catch (err) {
    logger.error({ err }, 'Snap disconnect error');
    res.status(500).json({ error: 'Disconnect failed', code: 'INTERNAL_ERROR' });
  }
});

export default router;
