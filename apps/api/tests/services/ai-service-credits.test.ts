import { jest } from '@jest/globals';

jest.mock('../../src/lib/supabase', () => {
  const from = jest.fn();
  return { supabase: { from } };
});

import { deductCredits } from '../../src/services/ai-service';
import { AppError } from '../../src/lib/errors';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockFrom = (jest.requireMock('../../src/lib/supabase') as any).supabase.from as jest.Mock;
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('deductCredits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws INSUFFICIENT_CREDITS when the workspace balance is too low', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'ai_credits') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { remaining: 5, credits_used: 45 },
                error: null,
              }),
            }),
          }),
        };
      }
      return { insert: jest.fn().mockResolvedValue({ error: null }) };
    });

    await expect(deductCredits('ws-1', 'morning_brief', 10)).rejects.toMatchObject({
      code: 'INSUFFICIENT_CREDITS',
      statusCode: 402,
    });
  });

  it('deducts credits and logs usage when balance is sufficient', async () => {
    const updateEq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq: updateEq });
    const insert = jest.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'ai_credits') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { remaining: 100, credits_used: 0 },
                error: null,
              }),
            }),
          }),
          update,
        };
      }
      if (table === 'credit_usage_log') {
        return { insert };
      }
      return {};
    });

    const result = await deductCredits('ws-1', 'creative_analysis', 25);

    expect(result).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        credits_used: 25,
        remaining: 75,
      }),
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: 'ws-1',
        feature: 'creative_analysis',
        credits_used: 25,
      }),
    );
  });

  it('rejects non-positive credit amounts', async () => {
    await expect(deductCredits('ws-1', 'morning_brief', 0)).rejects.toBeInstanceOf(AppError);
  });
});
