import jwt from 'jsonwebtoken';
import { createOAuthState, verifyOAuthState, requestWorkspaceMatchesAuthenticatedWorkspace } from '../../src/routes/auth/oauthState';

describe('OAuth state security', () => {
  it('round-trips signed provider state', () => {
    const state = createOAuthState({
      platform: 'meta',
      workspaceId: 'ws-1',
      userId: 'user-1',
      accountId: 'account-1',
      reconnect: true,
    });

    const parsed = verifyOAuthState(state, 'meta');

    expect(parsed).toEqual({
      platform: 'meta',
      workspaceId: 'ws-1',
      userId: 'user-1',
      accountId: 'account-1',
      reconnect: true,
    });
  });

  it('rejects legacy unsigned/base64 state and provider mismatches', () => {
    const legacyState = Buffer.from(JSON.stringify({ workspaceId: 'ws-1', userId: 'user-1' })).toString('base64');
    const googleState = createOAuthState({ platform: 'google', workspaceId: 'ws-1', userId: 'user-1' });

    expect(verifyOAuthState(legacyState, 'meta')).toBeNull();
    expect(verifyOAuthState(googleState, 'meta')).toBeNull();
  });

  it('rejects tampered signed state', () => {
    const token = createOAuthState({ platform: 'snap', workspaceId: 'ws-1', userId: 'user-1' });
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    payload.workspaceId = 'ws-2';
    const tampered = [parts[0], Buffer.from(JSON.stringify(payload)).toString('base64url'), parts[2]].join('.');

    expect(verifyOAuthState(tampered, 'snap')).toBeNull();
  });

  it('requires requested workspace to match the authenticated token workspace', () => {
    expect(requestWorkspaceMatchesAuthenticatedWorkspace('ws-1', 'ws-1')).toBe(true);
    expect(requestWorkspaceMatchesAuthenticatedWorkspace(undefined, 'ws-1')).toBe(true);
    expect(requestWorkspaceMatchesAuthenticatedWorkspace('ws-2', 'ws-1')).toBe(false);
    expect(requestWorkspaceMatchesAuthenticatedWorkspace('ws-1', undefined)).toBe(false);
  });
});
