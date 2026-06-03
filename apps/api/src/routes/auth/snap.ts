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
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const SNAP_OAUTH_URL = 'https://accounts.snapchat.com/login/oauth2/authorize';
const SNAP_TOKEN_URL = 'https://accounts.snapchat.com/login/oauth2/access_token';

const REQUIRED_SCOPES = ['snapchat-marketing-api'];

/**
 * GET /api/v1/auth/snap/connect
 * Query: workspace_id (required)
 */
router.get('/connect', (req: Request, res: Response) => {
  try {
    const workspaceId =
      (req.query.workspace_id as string) || (req.headers['x-workspace-id'] as string);
    if (!workspaceId) {
      res.status(400).json({ error: 'workspace_id is required', code: 'VALIDATION_ERROR' });
      return;
    }

    if (!config.snap.clientId) {
      res.status(500).json({ error: 'Snap app not configured', code: 'CONFIG_ERROR' });
      return;
    }

    const redirectUri = `${config.frontend.url}/auth/snap/callback`;
    const state = Buffer.from(JSON.stringify({ workspaceId, nonce: uuidv4() })).toString('base64');

    const params = new URLSearchParams({
      client_id: config.snap.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: REQUIRED_SCOPES.join(' '),
      state,
    });

    logger.info({ workspaceId }, 'Redirecting to Snap OAuth');
    res.redirect(`${SNAP_OAUTH_URL}?${params.toString()}`);
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
      res.redirect(`${config.frontend.url}/settings?snap=denied`);
      return;
    }
    if (!code || !stateB64) {
      res.status(400).json({ error: 'Missing code or state', code: 'VALIDATION_ERROR' });
      return;
    }

    let workspaceId: string;
    try {
      workspaceId = JSON.parse(Buffer.from(stateB64 as string, 'base64').toString()).workspaceId;
    } catch {
      res.status(400).json({ error: 'Invalid state parameter', code: 'VALIDATION_ERROR' });
      return;
    }

    if (!config.snap.clientId || !config.snap.clientSecret) {
      res.status(500).json({ error: 'Snap OAuth not configured', code: 'CONFIG_ERROR' });
      return;
    }

    const redirectUri = `${config.frontend.url}/auth/snap/callback`;
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
      res.redirect(`${config.frontend.url}/settings?snap=error&reason=oauth_failed`);
      return;
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const { error: dbError } = await supabase.from('ad_accounts').upsert(
      {
        workspace_id: workspaceId,
        platform: 'snap',
        platform_account_id: 'snap-ads',
        account_id: 'snap-ads',
        name: 'Snapchat Ads',
        oauth_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        scopes: REQUIRED_SCOPES,
        status: 'active',
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,platform,account_id' },
    );

    if (dbError) {
      logger.error({ err: dbError }, 'Failed to store Snap tokens');
      res.redirect(`${config.frontend.url}/settings?snap=error&reason=db`);
      return;
    }

    logger.info({ workspaceId }, 'Snap Ads account connected');
    res.redirect(`${config.frontend.url}/settings?snap=connected`);
  } catch (err) {
    logger.error({ err }, 'Snap OAuth callback error');
    res.redirect(`${config.frontend.url}/settings?snap=error&reason=oauth_failed`);
  }
});

/**
 * POST /api/v1/auth/snap/disconnect
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
      .update({ status: 'disconnected', is_active: false, oauth_token: null, refresh_token: null })
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
