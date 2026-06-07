// ============================================================================
// useExport — Unified export hook for CSV, Excel, PDF generation
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { authFetchJson } from '../lib/authFetch';

/** Supported export format types */
export type ExportType = 'csv' | 'excel' | 'pdf';

/** Options for client-side data export */
export interface ExportDataOptions {
  /** Array of data objects to export */
  data: Record<string, unknown>[];
  /** Export format */
  type: ExportType;
  /** Output filename without extension */
  filename?: string;
  /** Column order / filter. Keys are data property names, values are header labels */
  columns?: Record<string, string>;
  /** Sheet name for Excel exports */
  sheetName?: string;
  /** For PDF: title to show in print dialog */
  pdfTitle?: string;
}

/** Options for report export via backend API */
export interface ExportReportOptions {
  /** Report ID to export */
  reportId: string;
  /** Export format */
  format: ExportType;
  /** Optional custom filename */
  filename?: string;
}

/** Result of an export operation */
export interface ExportResult {
  /** Whether export succeeded */
  success: boolean;
  /** Generated blob URL (client-side exports) */
  url?: string;
  /** Backend download URL */
  downloadUrl?: string;
  /** Backend export job identifier */
  exportId?: string;
  /** Filename used */
  filename: string;
  /** Size in bytes */
  size?: number;
  /** Error message if failed */
  error?: string;
}

/** Return type of useExport hook */
export interface UseExportReturn {
  /** Export local data array to CSV/Excel/PDF */
  exportData: (options: ExportDataOptions) => Promise<ExportResult>;
  /** Call backend to export a saved report */
  exportReport: (options: ExportReportOptions) => Promise<ExportResult>;
  /** Whether an export is in progress */
  isExporting: boolean;
  /** Current export format being processed */
  activeFormat: ExportType | null;
  /** Last export error */
  lastError: string | null;
  /** Last successful result */
  lastResult: ExportResult | null;
  /** Reset state */
  reset: () => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const MIME_TYPES: Record<ExportType, string> = {
  csv: 'text/csv;charset=utf-8;',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

const EXTENSIONS: Record<ExportType, string> = {
  csv: '.csv',
  excel: '.xlsx',
  pdf: '.pdf',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Trigger a browser download for a Blob */
function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadBlob(blob: Blob, filename: string): string {
  const url = window.URL.createObjectURL(blob);
  triggerDownload(url, filename);
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 100);
  return url;
}

/** Build ordered data using column map */
function normalizeData(
  data: Record<string, unknown>[],
  columns?: Record<string, string>
): { rows: Record<string, unknown>[]; headers: string[] } {
  if (!columns || Object.keys(columns).length === 0) {
    // Auto-detect columns from all keys in data
    const allKeys = new Set<string>();
    data.forEach((row) => Object.keys(row).forEach((k) => allKeys.add(k)));
    const headers = Array.from(allKeys);
    return { rows: data, headers };
  }

  const colKeys = Object.keys(columns);
  const headers = colKeys.map((k) => columns[k] || k);

  const rows = data.map((row) => {
    const out: Record<string, unknown> = {};
    colKeys.forEach((key, idx) => {
      const header = headers[idx];
      out[header] = row[key] ?? '';
    });
    return out;
  });

  return { rows, headers };
}

/** Export data to CSV via PapaParse */
function exportToCsv(
  data: Record<string, unknown>[],
  columns?: Record<string, string>
): { csv: string; filename: string } {
  const { rows } = normalizeData(data, columns);
  const csv = Papa.unparse(rows, {
    delimiter: ',',
    header: true,
    newline: '\n',
    skipEmptyLines: 'greedy',
  });
  return { csv, filename: '' };
}

/** Export data to Excel via SheetJS */
function exportToExcel(
  data: Record<string, unknown>[],
  sheetName?: string,
  columns?: Record<string, string>
): ArrayBuffer {
  const { rows } = normalizeData(data, columns);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    const maxDataWidth = rows.reduce((max, row) => {
      const val = String(row[key] ?? '');
      return Math.max(max, val.length);
    }, key.length);
    return { wch: Math.min(maxDataWidth + 2, 50) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Data');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}

/** Export data to PDF via window.print() */
function exportToPdf(
  data: Record<string, unknown>[],
  title?: string,
  columns?: Record<string, string>
): void {
  const { rows, headers } = normalizeData(data, columns);
  const pageTitle = title || 'Report';

  // Build printable HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${pageTitle}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11px;
          color: #1a1a1a;
          padding: 20px;
          margin: 0;
        }
        h1 { font-size: 16px; margin: 0 0 12px 0; }
        .meta { color: #666; font-size: 10px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th {
          background: #f3f4f6;
          border-bottom: 2px solid #d1d5db;
          padding: 8px 6px;
          text-align: left;
          font-weight: 600;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        td {
          border-bottom: 1px solid #e5e7eb;
          padding: 6px;
          font-size: 10px;
        }
        tr:nth-child(even) { background: #f9fafb; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
          tr { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>${pageTitle}</h1>
      <div class="meta">
        Generated: ${new Date().toLocaleString()}<br>
        Rows: ${rows.length.toLocaleString()}
      </div>
      <table>
        <thead>
          <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) =>
                `<tr>${headers
                  .map((h) => {
                    const val = row[h];
                    const isNum = typeof val === 'number';
                    return `<td${isNum ? ' class="num"' : ''}>${val ?? ''}</td>`;
                  })
                  .join('')}</tr>`
            )
            .join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  // Open print window
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Fallback: inline print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
    iframe.contentWindow?.document.write(html);
    iframe.contentWindow?.document.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 250);
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    // Don't close — let user save as PDF from print dialog
  }, 250);
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Unified export hook for client-side CSV/Excel/PDF generation
 * and backend report export API calls.
 *
 * @example
 * ```tsx
 * const { exportData, exportReport, isExporting } = useExport();
 *
 * // Client-side CSV export
 * await exportData({
 *   data: campaigns,
 *   type: 'csv',
 *   filename: 'campaigns',
 *   columns: { id: 'ID', name: 'Name', spend: 'Spend', roas: 'ROAS' },
 * });
 *
 * // Backend report export
 * await exportReport({ reportId: 'abc', format: 'xlsx' });
 * ```
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [activeFormat, setActiveFormat] = useState<ExportType | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ExportResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setIsExporting(false);
    setActiveFormat(null);
    setLastError(null);
    setLastResult(null);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  /**
   * Export a data array to CSV, Excel, or PDF (client-side).
   */
  const exportData = useCallback(
    async (options: ExportDataOptions): Promise<ExportResult> => {
      const { data, type, filename, columns, sheetName, pdfTitle } = options;

      if (!data || data.length === 0) {
        const error = 'No data to export';
        setLastError(error);
        return { success: false, filename: filename || 'export', error };
      }

      setIsExporting(true);
      setActiveFormat(type);
      setLastError(null);
      setLastResult(null);

      try {
        const safeName = (filename || 'export').replace(/[^a-zA-Z0-9_-]/g, '_');
        const ext = EXTENSIONS[type];
        const fullName = `${safeName}${ext}`;
        let result: ExportResult;

        switch (type) {
          case 'csv': {
            const { csv } = exportToCsv(data, columns);
            const blob = new Blob(['\uFEFF' + csv], { type: MIME_TYPES.csv });
            const url = downloadBlob(blob, fullName);
            result = {
              success: true,
              url,
              filename: fullName,
              size: blob.size,
            };
            break;
          }

          case 'excel': {
            const buffer = exportToExcel(data, sheetName, columns);
            const blob = new Blob([buffer], { type: MIME_TYPES.excel });
            const url = downloadBlob(blob, fullName);
            result = {
              success: true,
              url,
              filename: fullName,
              size: blob.size,
            };
            break;
          }

          case 'pdf': {
            exportToPdf(data, pdfTitle || safeName, columns);
            result = {
              success: true,
              filename: fullName,
            };
            break;
          }

          default: {
            const error = `Unsupported export type: ${type}`;
            setLastError(error);
            result = { success: false, filename: fullName, error };
          }
        }

        setLastResult(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        setLastError(error);
        const result: ExportResult = {
          success: false,
          filename: filename || 'export',
          error,
        };
        setLastResult(result);
        return result;
      } finally {
        setIsExporting(false);
        setActiveFormat(null);
      }
    },
    []
  );

  /**
   * Call the backend API to export a saved report.
   */
  const exportReport = useCallback(
    async (options: ExportReportOptions): Promise<ExportResult> => {
      const { reportId, format, filename } = options;

      setIsExporting(true);
      setActiveFormat(format);
      setLastError(null);
      setLastResult(null);

      abortRef.current = new AbortController();

      try {
        const backendFormat = format === 'excel' ? 'xlsx' : format;
        const exportName = filename || `report-${reportId}${EXTENSIONS[format]}`;
        const response = await authFetchJson<{
          id?: string;
          fileUrl?: string | null;
          file_url?: string | null;
        }>('/api/v2/exports', {
          method: 'POST',
          signal: abortRef.current.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: exportName,
            entity: 'reports',
            format: backendFormat,
            filters: { reportId },
          }),
        });

        const data = response.data;
        const downloadUrl = data?.fileUrl ?? data?.file_url ?? undefined;
        if (downloadUrl) {
          triggerDownload(downloadUrl, exportName);
        }
        const result: ExportResult = {
          success: true,
          filename: exportName,
          exportId: data?.id,
          downloadUrl: downloadUrl ?? undefined,
        };
        setLastResult(result);
        return result;
      } catch (err) {
        if (err instanceof Error && (err.name === 'CanceledError' || err.name === 'AbortError')) {
          const result: ExportResult = {
            success: false,
            filename: filename || `report-${reportId}`,
            error: 'Export cancelled',
          };
          setLastResult(result);
          return result;
        }

        const error = err instanceof Error ? err.message : String(err);
        setLastError(error);
        const result: ExportResult = {
          success: false,
          filename: filename || `report-${reportId}`,
          error,
        };
        setLastResult(result);
        return result;
      } finally {
        setIsExporting(false);
        setActiveFormat(null);
        abortRef.current = null;
      }
    },
    []
  );

  return {
    exportData,
    exportReport,
    isExporting,
    activeFormat,
    lastError,
    lastResult,
    reset,
  };
}

export default useExport;
