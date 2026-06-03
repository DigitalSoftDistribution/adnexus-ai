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
import { v4 as uuidv4 } from 'uuid';

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
router.get('/connect', (req: Request, res: Response) => {
  try {
    const workspaceId = (req.query.workspace_id as string) || req.headers['x-workspace-id'] as string;
    if (!workspaceId) {
      res.status(400).json({ error: 'workspace_id is required', code: 'VALIDATION_ERROR' });
      return;
    }

    if (!config.google.clientId) {
      res.status(500).json({ error: 'Google app not configured', code: 'CONFIG_ERROR' });
      return;
    }

    const redirectUri = `${config.frontend.url}/auth/google/callback`;
    const state = JSON.stringify({
      workspaceId,
      nonce: uuidv4(),
    });
    const stateB64 = Buffer.from(state).toString('base64');

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
      res.redirect(`${config.frontend.url}/settings?google=denied`);
      return;
    }

    if (!code || !stateB64) {
      res.status(400).json({ error: 'Missing code or state', code: 'VALIDATION_ERROR' });
      return;
    }

    // Parse state
    let stateData: { workspaceId: string; nonce: string };
    try {
      stateData = JSON.parse(Buffer.from(stateB64 as string, 'base64').toString());
    } catch {
      res.status(400).json({ error: 'Invalid state parameter', code: 'VALIDATION_ERROR' });
      return;
    }

    const { workspaceId } = stateData;

    if (!config.google.clientId || !config.google.clientSecret) {
      res.status(500).json({ error: 'Google OAuth not configured', code: 'CONFIG_ERROR' });
      return;
    }

    const redirectUri = `${config.frontend.url}/auth/google/callback`;

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

    // Store the Google ad account in the database. The Google Ads customer ID
    // is resolved out-of-band; until then use a stable per-workspace key so
    // reconnects upsert cleanly against the (workspace_id, platform,
    // platform_account_id) unique constraint.
    const { error: dbError } = await supabase
      .from('ad_accounts')
      .upsert({
        workspace_id: workspaceId,
        platform: 'google',
        platform_account_id: 'google-ads',
        account_name: 'Google Ads',
        access_token: tokens.access_token,
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
    res.redirect(`${config.frontend.url}/settings?google=connected`);
  } catch (err) {
    logger.error({ err }, 'Google OAuth callback error');
    res.status(500).json({ error: 'OAuth callback failed', code: 'INTERNAL_ERROR' });
  }
});

export default router;
