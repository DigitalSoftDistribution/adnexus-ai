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
import { encryptToken } from '../../security/encryption';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { consumeOAuthStateNonce, createOAuthState, integrationsRedirect, oauthCallbackUrl, requestWorkspaceMatchesAuthenticatedWorkspace, sendOAuthJsonError, userCanManageOAuthWorkspace, verifyOAuthState, wantsJson } from './oauthState';

const router = Router();

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
function googleTokenUrl(): string {
  return config.google.oauthTokenUrl;
}

function googleAdsApiBaseUrl(): string {
  return `${config.google.adsApiBaseUrl.replace(/\/$/, '')}/v16`;
}

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/adwords',
];

interface GoogleTokenPayload {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

interface GoogleAccessibleCustomerDetails {
  id: string;
  descriptiveName?: string;
  currencyCode?: string;
  timeZone?: string;
}

function extractGoogleCustomerId(resourceName: string): string {
  const match = resourceName.match(/customers\/(\d+)/);
  return match?.[1] ?? resourceName;
}

function googleHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': config.google.developerToken,
    'Content-Type': 'application/json',
  };
}

async function listAccessibleGoogleCustomers(accessToken: string): Promise<string[]> {
  const response = await fetch(`${googleAdsApiBaseUrl()}/customers:listAccessibleCustomers`, {
    headers: googleHeaders(accessToken),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.warn({ status: response.status, body }, 'Google accessible customers fetch failed');
    return [];
  }

  const data = await response.json() as { resourceNames?: string[]; resource_names?: string[] };
  return data.resourceNames ?? data.resource_names ?? [];
}

async function getGoogleCustomerDetails(accessToken: string, customerId: string): Promise<GoogleAccessibleCustomerDetails> {
  const response = await fetch(`${googleAdsApiBaseUrl()}/customers/${customerId}/googleAds:search`, {
    method: 'POST',
    headers: googleHeaders(accessToken),
    body: JSON.stringify({
      query: 'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone FROM customer',
      page_size: 1,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.warn({ status: response.status, body, customerId }, 'Google customer details fetch failed');
    return { id: customerId };
  }

  const data = await response.json() as {
    results?: Array<{
      customer?: {
        id?: string;
        descriptiveName?: string;
        descriptive_name?: string;
        currencyCode?: string;
        currency_code?: string;
        timeZone?: string;
        time_zone?: string;
      };
    }>;
  };
  const customer = data.results?.[0]?.customer;
  return {
    id: customer?.id ?? customerId,
    descriptiveName: customer?.descriptiveName ?? customer?.descriptive_name,
    currencyCode: customer?.currencyCode ?? customer?.currency_code,
    timeZone: customer?.timeZone ?? customer?.time_zone,
  };
}

async function resolveGoogleAccessibleAccounts(accessToken: string): Promise<GoogleAccessibleCustomerDetails[]> {
  const resources = await listAccessibleGoogleCustomers(accessToken);
  const customerIds = resources.map(extractGoogleCustomerId).filter(Boolean);
  if (customerIds.length === 0) return [{ id: 'google-ads' }];

  const details = await Promise.all(customerIds.map((id) => getGoogleCustomerDetails(accessToken, id)));
  return details.length > 0 ? details : [{ id: customerIds[0] ?? 'google-ads' }];
}

/**
 * GET /api/v1/auth/google/connect
 *
 * Initiates the Google OAuth flow. Expects query params:
 *   - workspace_id  (required)
 *
 * Redirects the user to Google's OAuth consent page.
 */
router.get('/connect', requireAuth, requireAdmin, async (req: Request, res: Response) => {
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
    const stateB64 = await createOAuthState({ platform: 'google', workspaceId, userId: req.user!.sub });

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
    if (!(await consumeOAuthStateNonce('google', stateData.nonce))) {
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
    const tokenResponse = await fetch(googleTokenUrl(), {
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

    const tokens = await tokenResponse.json() as GoogleTokenPayload;

    if (!tokens.access_token) {
      logger.error({ body: tokens }, 'Google token exchange returned no access token');
      res.status(502).json({ error: 'Token exchange failed', code: 'OAUTH_ERROR' });
      return;
    }

    const accounts = await resolveGoogleAccessibleAccounts(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const scopes = tokens.scope?.split(' ').filter(Boolean) || REQUIRED_SCOPES;
    const connectedAccounts: string[] = [];

    for (const account of accounts) {
      const { error: dbError } = await supabase
        .from('ad_accounts')
        .upsert({
          workspace_id: workspaceId,
          platform: 'google',
          platform_account_id: account.id,
          name: account.descriptiveName || `Google Ads ${account.id}`,
          oauth_token: encryptToken(tokens.access_token),
          refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
          token_expires_at: expiresAt,
          scopes,
          status: 'active',
          is_active: true,
          metadata: {
            accountName: account.descriptiveName || `Google Ads ${account.id}`,
            currency: account.currencyCode,
            timezone: account.timeZone,
            customer_id: account.id,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,platform,platform_account_id' });

      if (dbError) {
        logger.error({ err: dbError, customerId: account.id }, 'Failed to store Google tokens');
        res.status(500).json({ error: 'Failed to store credentials', code: 'DB_ERROR' });
        return;
      }

      connectedAccounts.push(account.id);
    }

    logger.info({ workspaceId, accounts: connectedAccounts.length }, 'Google Ads account(s) connected successfully');

    // Redirect back to the frontend settings page
    res.redirect(integrationsRedirect('google', 'connected', 'connected'));
  } catch (err) {
    logger.error({ err }, 'Google OAuth callback error');
    res.status(500).json({ error: 'OAuth callback failed', code: 'INTERNAL_ERROR' });
  }
});

export default router;
