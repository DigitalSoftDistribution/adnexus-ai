import type { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../lib/errors';

/**
 * Verify that a campaign belongs to the user's workspace.
 * Prevents IDOR (Insecure Direct Object Reference) attacks.
 */
export async function verifyCampaignOwnership(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const workspaceId = req.workspaceId;
    const campaignId = req.params.id;

    if (!workspaceId || !campaignId) {
      throw new UnauthorizedError('Missing workspace or campaign ID');
    }

    const { rows } = await query<{ id: string }>(
      `SELECT c.id
       FROM campaigns c
       JOIN ad_accounts a ON a.id = c.ad_account_id
       WHERE c.id = $1 AND a.workspace_id = $2
       LIMIT 1`,
      [campaignId, workspaceId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Campaign');
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Verify that an ad belongs to the user's workspace.
 */
export async function verifyAdOwnership(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const workspaceId = req.workspaceId;
    const adId = req.params.id;

    if (!workspaceId || !adId) {
      throw new UnauthorizedError('Missing workspace or ad ID');
    }

    const { rows } = await query<{ id: string }>(
      `SELECT ads.id
       FROM ads
       JOIN adsets ON adsets.id = ads.adset_id
       JOIN campaigns c ON c.id = adsets.campaign_id
       JOIN ad_accounts a ON a.id = c.ad_account_id
       WHERE ads.id = $1 AND a.workspace_id = $2
       LIMIT 1`,
      [adId, workspaceId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Ad');
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Verify that a draft belongs to the user's workspace.
 */
export async function verifyDraftOwnership(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const workspaceId = req.workspaceId;
    const draftId = req.params.id;

    if (!workspaceId || !draftId) {
      throw new UnauthorizedError('Missing workspace or draft ID');
    }

    const { rows } = await query<{ id: string }>(
      `SELECT id FROM drafts
       WHERE id = $1 AND workspace_id = $2
       LIMIT 1`,
      [draftId, workspaceId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Draft');
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Verify that the user can manage the target role.
 * Owners can assign any role. Admins cannot assign owner.
 * Prevents role promotion vulnerabilities.
 */
export function requireRoleManagement(targetRole: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.workspaceId) {
        throw new UnauthorizedError();
      }

      const { rows } = await query<{ role: string }>(
        `SELECT role FROM workspace_members
         WHERE workspace_id = $1 AND user_id = $2
         LIMIT 1`,
        [req.workspaceId, req.user.sub],
      );

      const userRole = rows[0]?.role;

      if (!userRole) {
        throw new ForbiddenError('Not a member of this workspace');
      }

      // Owner can do anything
      if (userRole === 'owner') {
        return next();
      }

      // Admin can assign admin, analyst, viewer but NOT owner
      if (userRole === 'admin') {
        if (targetRole === 'owner') {
          throw new ForbiddenError('Only workspace owners can assign owner role');
        }
        return next();
      }

      // Analyst and viewer cannot manage roles
      throw new ForbiddenError('Insufficient permissions to manage roles');
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Prevent self-role changes.
 */
export function preventSelfRoleChange(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const targetUserId = req.params.userId || req.body.userId;
  if (targetUserId && targetUserId === req.user?.sub) {
    return next(new ForbiddenError('Cannot change your own role'));
  }
  next();
}
