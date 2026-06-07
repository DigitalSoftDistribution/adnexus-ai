import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { supabase } from '../lib/supabase';
import { ValidationError, UnauthorizedError, NotFoundError, AppError } from '../lib/errors';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import type { TokenResponse, User, Workspace, WorkspaceRole } from '../types';

const router = Router();

// ═══════════════════════════════════════════════════════════════
//  Validation Schemas
// ═══════════════════════════════════════════════════════════════

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  workspaceName: z.string().min(1, 'Workspace name is required').max(100).optional(),
});

const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

const resetPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'analyst', 'viewer', 'owner']).default('viewer'),
  workspaceId: z.string().uuid('Invalid workspace ID'),
}).refine(
  (data) => data.role !== 'owner',
  { message: 'Cannot invite as owner via this endpoint', path: ['role'] }
);

const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

// ═══════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Sign a short-lived access token for the authenticated user.
 * Contains user identity, workspace, and role claims.
 */
function signAccessToken(userId: string, email: string, workspaceId: string, role: string): string {
  return jwt.sign(
    { sub: userId, email, workspace_id: workspaceId, role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as unknown as number },
  );
}

/**
 * Sign a long-lived refresh token.
 * Used to obtain new access tokens without re-authenticating.
 */
function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn as unknown as number },
  );
}

/**
 * Build a consistent token response shape.
 */
function buildTokenResponse(
  user: User,
  workspace: Workspace,
  token: string,
  refreshToken: string,
): TokenResponse {
  return { token, refresh_token: refreshToken, user, workspace };
}

/**
 * Generate a URL-friendly slug from a workspace name.
 */
function generateWorkspaceSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}-${Date.now().toString(36)}`;
}

// ═══════════════════════════════════════════════════════════════
//  Routes
// ═══════════════════════════════════════════════════════════════

/**
 * POST /auth/signup
 *
 * Register a new user with Supabase Auth, create their workspace,
 * and add them as the workspace owner.
 *
 * @body { email: string, password: string, name: string, workspaceName?: string }
 * @returns { user, workspace, token, refresh_token }
 */
router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const body = signupSchema.parse(req.body);

    // ── 1. Check if email already exists in Supabase Auth ──
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === body.email.toLowerCase(),
    );
    if (emailExists) {
      throw new ValidationError('Email already registered');
    }

    // ── 2. Create user in Supabase Auth ──
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { name: body.name },
    });

    if (authError || !authData.user) {
      throw new AppError(
        'AUTH_SIGNUP_FAILED',
        authError?.message ?? 'Failed to create user account',
        400,
      );
    }

    const supabaseUser = authData.user;

    // ── 3. Create user profile in public.users ──
    let { data: userRecord, error: userError } = await supabase
      .from('users')
      .insert({
        id: supabaseUser.id,
        email: body.email.toLowerCase(),
        name: body.name,
      })
      .select()
      .single();

    if (userError && userError.code === '23502' && userError.message.includes('password_hash')) {
      const retry = await supabase
        .from('users')
        .insert({
          id: supabaseUser.id,
          email: body.email.toLowerCase(),
          name: body.name,
          password_hash: '',
        })
        .select()
        .single();

      userRecord = retry.data;
      userError = retry.error;
    }

    if (userError || !userRecord) {
      // Rollback: delete the auth user
      await supabase.auth.admin.deleteUser(supabaseUser.id);
      throw new AppError('USER_CREATE_FAILED', 'Failed to create user profile', 500, {
        dbCode: userError?.code,
        dbMessage: userError?.message,
        dbDetails: userError?.details,
      });
    }

    // ── 4. Create workspace ──
    const wsName = body.workspaceName?.trim() || `${body.name}'s Workspace`;
    const slug = generateWorkspaceSlug(wsName);

    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({
        name: wsName,
        slug,
        owner_id: userRecord.id,
        plan: 'free',
      })
      .select()
      .single();

    if (wsError || !workspace) {
      // Rollback: delete auth user (profile cascades via FK)
      await supabase.auth.admin.deleteUser(supabaseUser.id);
      throw new AppError('WORKSPACE_CREATE_FAILED', 'Failed to create workspace', 500);
    }

    // ── 5. Add user as workspace owner ──
    const { error: memberError } = await supabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: userRecord.id,
      role: 'owner' as WorkspaceRole,
    });

    if (memberError) {
      // Rollback: delete workspace, auth user
      await supabase.from('workspaces').delete().eq('id', workspace.id);
      await supabase.auth.admin.deleteUser(supabaseUser.id);
      throw new AppError('MEMBER_CREATE_FAILED', 'Failed to add workspace member', 500);
    }

    // ── 6. Initialise credit record ──
    await supabase.from('ai_credits').insert({
      workspace_id: workspace.id,
      month: new Date().toISOString().slice(0, 7),
      credits_used: 0,
      credits_limit: config.credits.free,
    });

    // ── 7. Generate tokens ──
    const token = signAccessToken(userRecord.id, userRecord.email, workspace.id, 'owner');
    const refreshToken = signRefreshToken(userRecord.id);

    // ── 8. Log audit event ──
    await supabase.from('audit_log').insert({
      workspace_id: workspace.id,
      actor_type: 'user',
      actor_id: userRecord.id,
      actor_name: userRecord.name,
      action: 'User signed up',
      action_category: 'user_signup',
      source: 'api',
      ip_address: req.ip,
      details: { email: body.email },
    });

    const response: TokenResponse = buildTokenResponse(
      userRecord as User,
      workspace as Workspace,
      token,
      refreshToken,
    );

    res.status(201).json({ success: true, data: response });
  }),
);

/**
 * POST /auth/signin
 *
 * Authenticate a user via Supabase Auth and return their
 * profile, workspace, and tokens.
 *
 * @body { email: string, password: string }
 * @returns { user, workspace, token, refresh_token }
 */
router.post(
  '/signin',
  asyncHandler(async (req, res) => {
    const body = signinSchema.parse(req.body);

    // ── 1. Authenticate via Supabase Auth ──
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (signInError || !signInData.user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const supabaseUser = signInData.user;

    // ── 2. Fetch user profile ──
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (userError || !userRecord) {
      throw new UnauthorizedError('User profile not found');
    }

    // ── 3. Get workspace membership ──
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userRecord.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (membershipError || !membership) {
      throw new UnauthorizedError('No workspace membership found');
    }

    // ── 4. Fetch workspace ──
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', membership.workspace_id)
      .single();

    if (wsError || !workspace) {
      throw new UnauthorizedError('Workspace not found');
    }

    // ── 5. Generate tokens ──
    const token = signAccessToken(
      userRecord.id,
      userRecord.email,
      workspace.id,
      membership.role,
    );
    const refreshToken = signRefreshToken(userRecord.id);

    // ── 6. Log audit event ──
    await supabase.from('audit_log').insert({
      workspace_id: workspace.id,
      actor_type: 'user',
      actor_id: userRecord.id,
      actor_name: userRecord.name,
      action: 'User signed in',
      action_category: 'user_login',
      source: 'api',
      ip_address: req.ip,
    });

    const response: TokenResponse = buildTokenResponse(
      userRecord as User,
      workspace as Workspace,
      token,
      refreshToken,
    );

    res.json({ success: true, data: response });
  }),
);

/**
 * POST /auth/refresh
 *
 * Exchange a valid refresh token for a new access token.
 *
 * @body { refresh_token: string }
 * @returns { token: string }
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const body = refreshSchema.parse(req.body);

    // ── 1. Verify the refresh token ──
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(body.refresh_token, config.jwt.secret, {
        clockTolerance: 60,
      }) as jwt.JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // ── 2. Verify user still exists ──
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.sub)
      .single();

    if (userError || !userRecord) {
      throw new UnauthorizedError('User no longer exists');
    }

    // ── 3. Get workspace membership ──
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userRecord.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (!membership) {
      throw new UnauthorizedError('No workspace membership found');
    }

    // ── 4. Issue new access token ──
    const newToken = signAccessToken(
      userRecord.id,
      userRecord.email,
      membership.workspace_id,
      membership.role,
    );

    res.json({
      success: true,
      data: { token: newToken },
    });
  }),
);

/**
 * GET /auth/me
 *
 * Return the current authenticated user's profile,
 * workspace, role, and connected ad accounts.
 *
 * @header Authorization: Bearer <token>
 * @returns { id, email, name, role, workspace, connectedAccounts }
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const workspaceId = req.workspaceId!;

    // ── 1. Fetch user profile ──
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userRecord) {
      throw new NotFoundError('User');
    }

    // ── 2. Fetch workspace ──
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (wsError || !workspace) {
      throw new NotFoundError('Workspace');
    }

    // ── 3. Fetch role ──
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();

    const role = membership?.role ?? 'viewer';

    // ── 4. Fetch connected ad accounts ──
    const { data: connectedAccounts } = await supabase
      .from('ad_accounts')
      .select('id, platform, platform_account_id, name, status')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    res.json({
      success: true,
      data: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role,
        user: {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          role,
        },
        workspace,
        connectedAccounts: connectedAccounts ?? [],
      },
    });
  }),
);

/**
 * POST /auth/reset-password
 *
 * Request a password reset email. Uses Supabase Auth to send
 * a password-reset email to the given address.
 *
 * @body { email: string }
 * @returns { message: string }
 */
router.post(
  ['/reset-password', '/forgot-password'],
  asyncHandler(async (req, res) => {
    const body = resetPasswordRequestSchema.parse(req.body);

    // Check whether the user exists before sending (don't leak this info)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const targetUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === body.email.toLowerCase(),
    );

    // Always return the same message to prevent email enumeration
    if (!targetUser) {
      res.json({
        success: true,
        data: { message: 'If an account exists, a password reset email has been sent' },
      });
      return;
    }

    // Send reset email via Supabase Auth
    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: `${config.frontend.url}/auth/reset-password`,
    });

    if (error) {
      // Still return the same message; log the actual error internally
      console.error('[auth] Supabase resetPasswordForEmail failed:', error.message);
    }

    res.json({
      success: true,
      data: { message: 'If an account exists, a password reset email has been sent' },
    });
  }),
);

/**
 * POST /auth/change-password
 *
 * Change the authenticated user's password.
 * Requires current password for verification.
 *
 * @header Authorization: Bearer <token>
 * @body { currentPassword: string, newPassword: string }
 * @returns { message: string }
 */
router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = changePasswordSchema.parse(req.body);
    const userId = req.user!.sub;

    // ── 1. Get the user's current email from Supabase Auth ──
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (userError || !userRecord) {
      throw new UnauthorizedError('User not found');
    }

    // ── 2. Verify current password by attempting sign-in ──
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userRecord.email,
      password: body.currentPassword,
    });

    if (signInError) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // ── 3. Update password via Supabase Auth Admin ──
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: body.newPassword,
    });

    if (updateError) {
      throw new AppError('PASSWORD_CHANGE_FAILED', 'Failed to update password', 500);
    }

    // ── 4. Log audit event ──
    await supabase.from('audit_log').insert({
      workspace_id: req.workspaceId!,
      actor_type: 'user',
      actor_id: userId,
      action: 'User changed password',
      action_category: 'user_security',
      source: 'api',
      ip_address: req.ip,
    });

    res.json({
      success: true,
      data: { message: 'Password updated successfully' },
    });
  }),
);

/**
 * POST /auth/invite
 *
 * Invite a new team member to a workspace.
 * Creates a pending invitation and sends an invite email.
 *
 * @header Authorization: Bearer <token>
 * @body { email: string, role: 'admin' | 'analyst' | 'viewer', workspaceId: string }
 * @returns { invitation: object }
 */
router.post(
  '/invite',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = inviteSchema.parse(req.body);
    const invitedByUserId = req.user!.sub;
    const invitedByEmail = req.user!.email;

    // ── 1. Verify the inviter has permission (owner or admin) ──
    const { data: inviterMembership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', body.workspaceId)
      .eq('user_id', invitedByUserId)
      .single();

    if (!inviterMembership || !['owner', 'admin'].includes(inviterMembership.role)) {
      throw new UnauthorizedError('Only workspace owners and admins can invite members');
    }

    // ── 1b. Admins cannot invite other admins ──
    if (inviterMembership.role === 'admin' && body.role === 'admin') {
      throw new UnauthorizedError('Only workspace owners can invite admins');
    }

    // ── 2. Prevent duplicate pending invites ──
    const { data: existingInvite } = await supabase
      .from('workspace_invitations')
      .select('id, status')
      .eq('workspace_id', body.workspaceId)
      .eq('email', body.email.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      throw new ValidationError('A pending invitation already exists for this email');
    }

    // ── 3. Check if user is already a member ──
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', body.workspaceId)
      .eq('email', body.email.toLowerCase())
      .maybeSingle();

    if (existingMember) {
      throw new ValidationError('User is already a member of this workspace');
    }

    // ── 4. Generate invitation token ──
    const inviteToken = jwt.sign(
      {
        sub: invitedByUserId,
        email: body.email.toLowerCase(),
        workspace_id: body.workspaceId,
        role: body.role,
        type: 'workspace_invite',
      },
      config.jwt.secret,
      { expiresIn: '7d' },
    );

    // ── 5. Create invitation record ──
    const { data: invitation, error: inviteError } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: body.workspaceId,
        email: body.email.toLowerCase(),
        role: body.role,
        invited_by: invitedByUserId,
        token_hash: inviteToken,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single();

    if (inviteError || !invitation) {
      throw new AppError('INVITE_CREATE_FAILED', 'Failed to create invitation', 500);
    }

    // ── 6. Log audit event ──
    await supabase.from('audit_log').insert({
      workspace_id: body.workspaceId,
      actor_type: 'user',
      actor_id: invitedByUserId,
      actor_name: invitedByEmail,
      action: `Invited ${body.email} as ${body.role}`,
      action_category: 'member_invite',
      source: 'api',
      ip_address: req.ip,
      details: { invited_email: body.email, role: body.role },
    });

    res.status(201).json({
      success: true,
      data: {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expires_at,
        },
        message: 'Invitation sent successfully',
      },
    });
  }),
);

/**
 * POST /auth/accept-invite
 *
 * Accept a workspace invitation. Creates a new user account
 * (if needed) and adds them to the workspace.
 *
 * @body { token: string, password: string, name: string }
 * @returns { user, workspace, token, refresh_token }
 */
router.post(
  '/accept-invite',
  asyncHandler(async (req, res) => {
    const body = acceptInviteSchema.parse(req.body);

    // ── 1. Verify the invitation token ──
    let payload: {
      sub: string;
      email: string;
      workspace_id: string;
      role: string;
      type: string;
    };
    try {
      payload = jwt.verify(body.token, config.jwt.secret, {
        clockTolerance: 60,
      }) as typeof payload;
    } catch {
      throw new UnauthorizedError('Invalid or expired invitation token');
    }

    if (payload.type !== 'workspace_invite') {
      throw new UnauthorizedError('Invalid invitation token');
    }

    // ── 2. Look up the invitation record ──
    const { data: invitation, error: inviteError } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('token_hash', body.token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      throw new UnauthorizedError('Invitation not found or already used');
    }

    // ── 3. Check expiry ──
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('workspace_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      throw new UnauthorizedError('Invitation has expired');
    }

    let userId: string;
    let userRecord: User;

    // ── 4a. Check if user already exists ──
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', payload.email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      // User exists — just use their account
      userId = existingUser.id;
      userRecord = existingUser as User;

      // Ensure they have a Supabase Auth identity
      const { data: existingAuthUser } = await supabase.auth.admin.getUserById(userId);
      if (!existingAuthUser.user) {
        // Create auth user if missing
        const { error: createAuthError } = await supabase.auth.admin.createUser({
          email: payload.email,
          password: body.password,
          email_confirm: true,
          user_metadata: { name: body.name },
        });
        if (createAuthError) {
          throw new AppError('AUTH_CREATE_FAILED', 'Failed to create auth identity', 500);
        }
      }
    } else {
      // ── 4b. Create new Supabase Auth user ──
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: payload.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { name: body.name },
      });

      if (authError || !authData.user) {
        throw new AppError(
          'AUTH_SIGNUP_FAILED',
          authError?.message ?? 'Failed to create user account',
          400,
        );
      }

      userId = authData.user.id;

      // ── 5. Create user profile ──
      const { data: newUser, error: profileError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: payload.email.toLowerCase(),
          name: body.name,
        })
        .select()
        .single();

      if (profileError || !newUser) {
        await supabase.auth.admin.deleteUser(userId);
        throw new AppError('PROFILE_CREATE_FAILED', 'Failed to create user profile', 500);
      }

      userRecord = newUser as User;
    }

    // ── 6. Check if already a member ──
    const { data: existingMembership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', payload.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingMembership) {
      // Add to workspace
      const { error: memberError } = await supabase.from('workspace_members').insert({
        workspace_id: payload.workspace_id,
        user_id: userId,
        role: payload.role as WorkspaceRole,
      });

      if (memberError) {
        throw new AppError('MEMBER_ADD_FAILED', 'Failed to add member to workspace', 500);
      }
    }

    // ── 7. Mark invitation as accepted ──
    await supabase
      .from('workspace_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
      })
      .eq('id', invitation.id);

    // ── 8. Fetch workspace ──
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', payload.workspace_id)
      .single();

    if (wsError || !workspace) {
      throw new NotFoundError('Workspace');
    }

    // ── 9. Generate tokens ──
    const token = signAccessToken(userId, payload.email, payload.workspace_id, payload.role);
    const refreshToken = signRefreshToken(userId);

    // ── 10. Log audit event ──
    await supabase.from('audit_log').insert({
      workspace_id: payload.workspace_id,
      actor_type: 'user',
      actor_id: userId,
      actor_name: userRecord.name ?? body.name,
      action: 'Accepted workspace invitation',
      action_category: 'member_invite_accepted',
      source: 'api',
      ip_address: req.ip,
      details: { invited_email: payload.email, role: payload.role },
    });

    const response: TokenResponse = buildTokenResponse(
      userRecord,
      workspace as Workspace,
      token,
      refreshToken,
    );

    res.status(201).json({ success: true, data: response });
  }),
);

/**
 * POST /auth/signout
 *
 * Sign the current user out. Since JWTs are stateless, the client
 * is responsible for deleting stored tokens. This endpoint can be
 * used to log the sign-out event server-side.
 *
 * @header Authorization: Bearer <token>
 * @returns { message: string }
 */
router.post(
  '/signout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const workspaceId = req.workspaceId!;

    // Log the sign-out event
    await supabase.from('audit_log').insert({
      workspace_id: workspaceId,
      actor_type: 'user',
      actor_id: userId,
      action: 'User signed out',
      action_category: 'user_logout',
      source: 'api',
      ip_address: req.ip,
    });

    res.json({ success: true, data: { message: 'Signed out successfully' } });
  }),
);

export default router;
