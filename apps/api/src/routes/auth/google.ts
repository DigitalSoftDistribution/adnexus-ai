/**
 * Google Ads OAuth Routes
 *
 * Handles the full Google OAuth 2.0 flow:
 *   1. GET  /api/v1/auth/google/connect   — initiates OAuth, redirects to Google
 *   2. GET  /api/v1/auth/google/callback  — handles Google's redirect with auth code
 *
 * After successful OAuth, stores tokens in ad_accounts for the workspace.
 */
import { Router, type Request, type Response } from 'express';
import { config } from '../../config';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { createOAuthState, integrationsRedirect, oauthCallbackUrl, requestWorkspaceMatchesAuthenticatedWorkspace, sendOAuthJsonError, userCanManageOAuthWorkspace, verifyOAuthState, wantsJson } from './oauthState';

const router = Router();

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/adwords',
];

/**
 * GET /api/v1/auth/google/connect
 *
 * Initiates the Google OAuth flow. Expects query params:
 *   - workspace_id  (required)
 *
 * Redirects the user to Google's OAuth consent page.
 */
router.get('/connect', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    if (!requestWorkspaceMatchesAuthenticatedWorkspace(req.query.workspace_id, req.workspaceId)) {
      res.status(403).json({ error: 'Workspace mismatch', code: 'FORBIDDEN' });
      return;
    }
    const workspaceId = req.workspaceId!;

    if (!config.google.clientId) {
      sendOAuthJsonError(req, res, 500, 'google', 'config_error', 'missing_google_oauth_config', 'Google OAuth is not configured');
      return;
    }

    const redirectUri = oauthCallbackUrl('google');
    const stateB64 = createOAuthState({ platform: 'google', workspaceId, userId: req.user!.sub });

    const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: redirectUri,
      scope: REQUIRED_SCOPES.join(' '),
      state: stateB64,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    });

    const authUrl = `${GOOGLE_OAUTH_URL}?${params.toString()}`;
    logger.info({ workspaceId }, 'Redirecting to Google OAuth');
    if (wantsJson(req)) {
      res.json({ success: true, data: { redirectUrl: authUrl } });
      return;
    }
    res.redirect(authUrl);
  } catch (err) {
    logger.error({ err }, 'Google OAuth connect error');
    res.status(500).json({ error: 'OAuth initiation failed', code: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /api/v1/auth/google/callback
 *
 * Handles Google's OAuth callback. Exchanges the code for tokens
 * and stores them in the ad_accounts table.
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state: stateB64, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn({ error: oauthError }, 'Google OAuth denied by user');
      sendOAuthJsonError(req, res, 400, 'google', 'denied', 'oauth_denied', 'Google OAuth was denied');
      return;
    }

    if (!code || !stateB64) {
      res.status(400).json({ error: 'Missing code or state', code: 'VALIDATION_ERROR' });
      return;
    }

    const stateData = verifyOAuthState(stateB64, 'google');
    if (!stateData) {
      sendOAuthJsonError(req, res, 400, 'google', 'error', 'invalid_oauth_state', 'Invalid OAuth state');
      return;
    }
    const { workspaceId, userId } = stateData;
    if (!(await userCanManageOAuthWorkspace(userId, workspaceId))) {
      sendOAuthJsonError(req, res, 403, 'google', 'error', 'workspace_access_denied', 'Workspace access denied');
      return;
    }

    if (!config.google.clientId || !config.google.clientSecret) {
      res.status(500).json({ error: 'Google OAuth not configured', code: 'CONFIG_ERROR' });
      return;
    }

    const redirectUri = oauthCallbackUrl('google');

    // Exchange code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      logger.error({ status: tokenResponse.status, body: errorBody }, 'Google token exchange failed');
      res.status(502).json({ error: 'Token exchange failed', code: 'OAUTH_ERROR' });
      return;
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type: string;
      scope: string;
    };

    if (!tokens.access_token) {
      logger.error({ body: tokens }, 'Google token exchange returned no access token');
      res.status(502).json({ error: 'Token exchange failed', code: 'OAUTH_ERROR' });
      return;
    }

    // Store the Google ad account in the database. The Google Ads customer ID
    // is resolved out-of-band; until then use a stable per-workspace key so
    // reconnects upsert cleanly against the canonical unique constraint.
    const { error: dbError } = await supabase
      .from('ad_accounts')
      .upsert({
        workspace_id: workspaceId,
        platform: 'google',
        platform_account_id: 'google-ads',
        name: 'Google Ads',
        oauth_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scopes: tokens.scope?.split(' ') || REQUIRED_SCOPES,
        status: 'active',
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,platform,platform_account_id' });

    if (dbError) {
      logger.error({ err: dbError }, 'Failed to store Google tokens');
      res.status(500).json({ error: 'Failed to store credentials', code: 'DB_ERROR' });
      return;
    }

    logger.info({ workspaceId }, 'Google Ads account connected successfully');

    // Redirect back to the frontend settings page
    res.redirect(integrationsRedirect('google', 'connected', 'connected'));
  } catch (err) {
    logger.error({ err }, 'Google OAuth callback error');
    res.status(500).json({ error: 'OAuth callback failed', code: 'INTERNAL_ERROR' });
  }
});

export default router;
