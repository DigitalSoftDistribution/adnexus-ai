import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import { createDraftController } from './DraftController';
import { expressErrorHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/requireAuth';
import { DraftExecutionDisabledError } from '../../../application/use-cases/draft/ExecuteDraftUseCase';

const makeResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
  } as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };

  res.status.mockReturnValue(res);
  return res;
};

describe('DraftController.execute', () => {
  it('returns an explicit disabled execution error without success payload', async () => {
    const execute = vi.fn().mockResolvedValue({ success: false, error: new DraftExecutionDisabledError() });
    const controller = createDraftController({ executeDraft: { execute } } as never);
    const req = {
      params: { id: 'draft-1' },
      user: { id: 'user-1', workspaceId: 'ws-1', role: 'editor' },
    } as unknown as AuthenticatedRequest;
    const res = makeResponse();
    let capturedError: Error | undefined;

    controller.execute(req, res, ((err?: unknown) => {
      capturedError = err instanceof Error ? err : undefined;
    }) as never);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.json).not.toHaveBeenCalled();
    expect(capturedError).toBeInstanceOf(DraftExecutionDisabledError);

    expressErrorHandler(capturedError!, req, res, vi.fn());

    expect(execute).toHaveBeenCalledWith({
      draftId: 'draft-1',
      workspaceId: 'ws-1',
      executedBy: 'user-1',
      userRole: 'editor',
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'DRAFT_EXECUTION_DISABLED',
        message: expect.stringContaining('Platform execution is disabled'),
        details: {
          executionMode: 'review_only',
          platformApplied: false,
          limitation: 'v1_pilot_platform_execution_disabled',
        },
      },
    });
  });
});
