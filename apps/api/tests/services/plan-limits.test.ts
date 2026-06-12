import { jest } from '@jest/globals';
import { assertCampaignQuota, assertCreativeQuota } from '../../src/services/plan-limits';
import { ForbiddenError } from '../../src/lib/errors';

jest.mock('../../src/db/connection', () => ({
  query: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockQuery = (jest.requireMock('../../src/db/connection') as any).query as jest.Mock;
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('plan-limits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assertCampaignQuota', () => {
    it('throws when campaigns plus pending drafts meet the plan limit', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ plan: 'free' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });

      await expect(assertCampaignQuota('ws-1')).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('allows creation when below the plan limit', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ plan: 'free' }] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      await expect(assertCampaignQuota('ws-1')).resolves.toBeUndefined();
    });
  });

  describe('assertCreativeQuota', () => {
    it('throws when monthly creative usage plus pending uploads meet the quota', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ plan: 'free' }] })
        .mockResolvedValueOnce({ rows: [{ creatives_used: 4, creatives_total: 5 }] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      await expect(assertCreativeQuota('ws-1')).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('allows creative uploads when quota headroom remains', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ plan: 'free' }] })
        .mockResolvedValueOnce({ rows: [{ creatives_used: 1, creatives_total: 5 }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await expect(assertCreativeQuota('ws-1')).resolves.toBeUndefined();
    });
  });
});
