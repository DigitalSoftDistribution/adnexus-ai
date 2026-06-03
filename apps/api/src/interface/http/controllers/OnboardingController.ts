import type { Container } from '../../../application/services/Container';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';

export function createOnboardingController(container: Container) {
  return {
    status: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.getOnboardingStatus.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    setStep: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.setOnboardingStep.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
        step: req.body?.step ?? '',
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),

    complete: asyncHandler<AuthenticatedRequest>(async (req, res) => {
      const result = await container.completeOnboarding.execute({
        workspaceId: req.user!.workspaceId,
        userRole: req.user!.role,
      });
      if (!result.success) throw result.error;
      res.json({ success: true, data: result.data });
    }),
  };
}
