import { jest } from '@jest/globals';
import { ensureApiKeysSchema } from '../../src/infrastructure/database/ensureApiKeysSchema';
import { query } from '../../src/infrastructure/database/connection';

jest.mock('../../src/infrastructure/database/connection', () => ({
  query: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('ensureApiKeysSchema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
  });

  it('adds api_keys.platforms idempotently before reads', async () => {
    await ensureApiKeysSchema();
    await ensureApiKeysSchema();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('ADD COLUMN IF NOT EXISTS platforms JSONB');
  });
});
