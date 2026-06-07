import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useExport } from '@/src/hooks/useExport';

describe('useExport exportReport', () => {
  beforeEach(() => {
    localStorage.setItem('adnexus_token', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('creates a real v2 export job instead of using the mock SPA client', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: 'export-1', fileUrl: null },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useExport());

    let exportResult;
    await act(async () => {
      exportResult = await result.current.exportReport({ reportId: 'report-1', format: 'excel' });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v2/exports',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'report-report-1.xlsx',
          entity: 'reports',
          format: 'xlsx',
          filters: { reportId: 'report-1' },
        }),
        headers: expect.any(Headers),
      }),
    );
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(exportResult).toEqual({
      success: true,
      filename: 'report-report-1.xlsx',
      exportId: 'export-1',
      downloadUrl: undefined,
    });
  });
});
