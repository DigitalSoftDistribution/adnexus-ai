/**
 * Meta OAuth Routes
 *
 * Handles the full Meta OAuth flow:
 *   1. GET  /api/v1/auth/meta/connect    — initiates OAuth, redirects to Meta
 *   2. GET  /api/v1/auth/meta/callback   — handles Meta's redirect with auth code
 *
 * After successful OAuth, stores tokens in ad_accounts for the workspace.
 */
import { Router, type Request, type Response } from 'express';
import { config } from '../../config';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const META_OAUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
const META_TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token';
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

const REQUIRED_SCOPES = [
  'ads_read',
  'ads_management',
  'business_management',
];

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
router.get('/connect', (req: Request, res: Response) => {
  try {
    const workspaceId = (req.query.workspace_id as string) || req.headers['x-workspace-id'] as string;
    if (!workspaceId) {
      res.status(400).json({ error: 'workspace_id is required', code: 'VALIDATION_ERROR' });
      return;
    }

    if (!config.meta.appId) {
      res.status(500).json({ error: 'Meta app not configured', code: 'CONFIG_ERROR' });
      return;
    }

    const redirectUri = `${config.frontend.url}/auth/meta/callback`;
    const state = JSON.stringify({
      workspaceId,
      accountId: req.query.account_id as string || null,
      reconnect: req.query.reconnect === 'true',
      nonce: uuidv4(),
    });
    const stateB64 = Buffer.from(state).toString('base64');

    const params = new URLSearchParams({
      client_id: config.meta.appId,
      redirect_uri: redirectUri,
      scope: REQUIRED_SCOPES.join(','),
      state: stateB64,
      response_type: 'code',
    });

    const authUrl = `${META_OAUTH_URL}?${params.toString()}`;
    logger.info({ workspaceId }, 'Redirecting to Meta OAuth');
    res.redirect(authUrl);
  } catch (err) {
    logger.error({ err }, 'Meta OAuth connect error');
    res.status(500).json({ error: 'OAuth initiation failed', code: 'INTERNAL_ERROR' });
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
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state: stateB64 } = req.query;

    if (!code || !stateB64) {
      res.status(400).json({ error: 'Missing code or state', code: 'VALIDATION_ERROR' });
      return;
    }

    // Parse state
    let stateData: { workspaceId: string; accountId: string | null; reconnect: boolean };
    try {
      stateData = JSON.parse(Buffer.from(stateB64 as string, 'base64').toString());
    } catch {
      res.status(400).json({ error: 'Invalid state parameter', code: 'VALIDATION_ERROR' });
      return;
    }

    const { workspaceId, accountId, reconnect } = stateData;
    const redirectUri = `${config.frontend.url}/auth/meta/callback`;

    // Step 1: Exchange code for short-lived token
    logger.info({ workspaceId }, 'Exchanging Meta OAuth code for token');
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
      res.status(500).json({ error: 'Failed to obtain access token', code: 'OAUTH_ERROR' });
      return;
    }

    // Step 2: Exchange for long-lived token (60 days)
    logger.info({ workspaceId }, 'Exchanging for long-lived token');
    const llRes = await axios.get(META_TOKEN_URL, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: config.meta.appId,
        client_secret: config.meta.appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    const accessToken = llRes.data.access_token as string;
    const expiresIn = (llRes.data.expires_in as number) || 5184000; // default 60 days
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Step 3: Fetch ad accounts
    logger.info({ workspaceId }, 'Fetching Meta ad accounts');
    const accountsRes = await axios.get(`${META_GRAPH_URL}/me/adaccounts`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,account_status,business_name,currency,timezone_name',
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
      if (reconnect && accountId) {
        // Update existing account
        const { error: updateErr } = await supabase
          .from('ad_accounts')
          .update({
            oauth_token: accessToken,
            refresh_token: accessToken, // Meta uses same token refreshed
            token_expires_at: expiresAt,
            scopes: REQUIRED_SCOPES,
            status: 'active',
            metadata: {
              business_name: acc.business_name,
              currency: acc.currency,
              timezone: acc.timezone_name,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('account_id', accountId)
          .eq('workspace_id', workspaceId);

        if (!updateErr) results.push(acc.id);
      } else if (!reconnect) {
        // Check if account already exists
        const { data: existing } = await supabase
          .from('ad_accounts')
          .select('id')
          .eq('account_id', acc.id)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (existing) {
          // Update
          const { error: updateErr } = await supabase
            .from('ad_accounts')
            .update({
              oauth_token: accessToken,
              refresh_token: accessToken,
              token_expires_at: expiresAt,
              scopes: REQUIRED_SCOPES,
              status: 'active',
              metadata: {
                business_name: acc.business_name,
                currency: acc.currency,
                timezone: acc.timezone_name,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (!updateErr) results.push(acc.id);
        } else {
          // Insert new
          const { data: inserted, error: insertErr } = await supabase
            .from('ad_accounts')
            .insert({
              workspace_id: workspaceId,
              platform: 'meta',
              account_id: acc.id,
              name: acc.name || `Meta Ads Account ${acc.id}`,
              status: acc.account_status === 1 ? 'active' : 'pending',
              oauth_token: accessToken,
              refresh_token: accessToken,
              token_expires_at: expiresAt,
              scopes: REQUIRED_SCOPES,
              metadata: {
                business_name: acc.business_name,
                currency: acc.currency,
                timezone: acc.timezone_name,
              },
            })
            .select('id')
            .single();

          if (!insertErr && inserted) results.push(acc.id);
        }
      }
    }

    logger.info({ workspaceId, accountsAdded: results.length }, 'Meta OAuth complete');

    // Redirect back to frontend with success
    const frontendParams = new URLSearchParams({
      platform: 'meta',
      status: 'connected',
      accounts: results.length.toString(),
    });
    res.redirect(`${config.frontend.url}/settings?${frontendParams.toString()}`);
  } catch (err) {
    logger.error({ err }, 'Meta OAuth callback error');
    res.redirect(`${config.frontend.url}/settings?platform=meta&status=error&reason=oauth_failed`);
  }
});

/**
 * POST /api/v1/auth/meta/disconnect
 *
 * Disconnects a Meta ad account by revoking the stored token.
 * Body: { account_id: string, workspace_id: string }
 */
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const { account_id, workspace_id } = req.body;

    if (!account_id || !workspace_id) {
      res.status(400).json({ error: 'account_id and workspace_id required', code: 'VALIDATION_ERROR' });
      return;
    }

    // Fetch the token
    const { data: account } = await supabase
      .from('ad_accounts')
      .select('oauth_token')
      .eq('account_id', account_id)
      .eq('workspace_id', workspace_id)
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
      .from('ad_accounts')
      .update({ status: 'disconnected', oauth_token: null, refresh_token: null })
      .eq('account_id', account_id)
      .eq('workspace_id', workspace_id);

    res.json({ success: true, message: 'Meta account disconnected' });
  } catch (err) {
    logger.error({ err }, 'Meta disconnect error');
    res.status(500).json({ error: 'Disconnect failed', code: 'INTERNAL_ERROR' });
  }
});

export default router;
