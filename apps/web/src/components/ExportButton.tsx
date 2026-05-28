// ============================================================================
// ExportButton — Reusable dropdown export button (CSV / Excel / PDF)
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Table,
  ChevronDown,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useExport, type ExportType } from '@/hooks/useExport';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ExportColumnMap {
  /** Key = data property name, Value = display header */
  [key: string]: string;
}

export interface ExportButtonProps {
  /** Data array for client-side export */
  data?: Record<string, unknown>[];
  /** Column mapping (optional — auto-detected if omitted) */
  columns?: ExportColumnMap;
  /** Report ID for backend export (used instead of data if provided) */
  reportId?: string;
  /** Default filename without extension */
  filename?: string;
  /** Sheet name for Excel exports */
  sheetName?: string;
  /** PDF title for print header */
  pdfTitle?: string;
  /** Button label text */
  label?: string;
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Called when export succeeds */
  onSuccess?: (format: ExportType, filename: string) => void;
  /** Called when export fails */
  onError?: (format: ExportType, error: string) => void;
  /** Extra className */
  className?: string;
  /** Disable the button */
  disabled?: boolean;
  /** Which formats to show in dropdown */
  formats?: ExportType[];
}

// ─── Format Config ─────────────────────────────────────────────────────────

interface FormatConfig {
  type: ExportType;
  label: string;
  icon: React.ElementType;
  color: string;
  activeColor: string;
  bgActive: string;
  borderActive: string;
}

const FORMAT_CONFIGS: FormatConfig[] = [
  {
    type: 'csv',
    label: 'Export as CSV',
    icon: Table,
    color: 'text-green-400',
    activeColor: 'text-green-300',
    bgActive: 'bg-green-500/10',
    borderActive: 'border-green-500/30',
  },
  {
    type: 'excel',
    label: 'Export as Excel',
    icon: FileSpreadsheet,
    color: 'text-emerald-400',
    activeColor: 'text-emerald-300',
    bgActive: 'bg-emerald-500/10',
    borderActive: 'border-emerald-500/30',
  },
  {
    type: 'pdf',
    label: 'Export as PDF',
    icon: FileText,
    color: 'text-red-400',
    activeColor: 'text-red-300',
    bgActive: 'bg-red-500/10',
    borderActive: 'border-red-500/30',
  },
];

// ─── Size Classes ──────────────────────────────────────────────────────────

const SIZE_CLASSES = {
  sm: {
    btn: 'h-7 gap-1.5 px-2.5 text-xs',
    icon: 'h-3.5 w-3.5',
    chevron: 'h-3 w-3',
    menu: 'min-w-[170px]',
    item: 'gap-2 px-2.5 py-1.5 text-xs',
    itemIcon: 'h-3.5 w-3.5',
    spinner: 'h-3.5 w-3.5',
  },
  md: {
    btn: 'h-9 gap-2 px-3.5 text-sm',
    icon: 'h-4 w-4',
    chevron: 'h-3.5 w-3.5',
    menu: 'min-w-[190px]',
    item: 'gap-2.5 px-3 py-2 text-sm',
    itemIcon: 'h-4 w-4',
    spinner: 'h-4 w-4',
  },
  lg: {
    btn: 'h-10 gap-2 px-4 text-sm',
    icon: 'h-4.5 w-4.5',
    chevron: 'h-4 w-4',
    menu: 'min-w-[200px]',
    item: 'gap-2.5 px-3 py-2 text-sm',
    itemIcon: 'h-4 w-4',
    spinner: 'h-4 w-4',
  },
};

const VARIANT_CLASSES = {
  primary:
    'bg-[#c3f53b] text-[#0a0a0a] hover:bg-[#b1e535] active:bg-[#9ed02f] disabled:opacity-40',
  secondary:
    'border border-gray-600/40 bg-[#1a1a1a] text-gray-300 hover:bg-[#222] hover:text-gray-100 active:bg-[#2a2a2a]',
  ghost:
    'bg-transparent text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200 active:bg-[#222]',
};

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Reusable export button with dropdown menu for CSV, Excel, and PDF.
 *
 * Supports two modes:
 * 1. **Client-side**: Pass `data` array — exports locally using PapaParse / SheetJS / window.print
 * 2. **Backend export**: Pass `reportId` — calls `POST /api/v1/reports/:id/export`
 *
 * @example
 * ```tsx
 * // Client-side CSV export of campaign data
 * <ExportButton
 *   data={campaigns}
 *   columns={{ name: 'Campaign', spend: 'Spend', roas: 'ROAS' }}
 *   filename="campaigns"
 * />
 *
 * // Backend report export
 * <ExportButton reportId="abc-123" filename="q1-report" />
 *
 * // Small secondary variant, Excel only
 * <ExportButton
 *   data={rows}
 *   formats={['excel']}
 *   size="sm"
 *   variant="secondary"
 *   label="Download"
 * />
 * ```
 */
const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  columns,
  reportId,
  filename = 'export',
  sheetName = 'Data',
  pdfTitle,
  label = 'Export',
  size = 'md',
  variant = 'primary',
  onSuccess,
  onError,
  className = '',
  disabled = false,
  formats = ['csv', 'excel', 'pdf'],
}) => {
  const { exportData, exportReport, isExporting, lastError, reset } = useExport();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFormat, setActiveFormat] = useState<ExportType | null>(null);
  const [successFormat, setSuccessFormat] = useState<ExportType | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  const sizeCls = SIZE_CLASSES[size];
  const variantCls = VARIANT_CLASSES[variant];
  const filteredFormats = FORMAT_CONFIGS.filter((f) => formats.includes(f.type));

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        buttonRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Close menu on escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [menuOpen]);

  // Auto-clear success indicator after 2s
  useEffect(() => {
    if (!successFormat) return;
    const t = setTimeout(() => setSuccessFormat(null), 2000);
    return () => clearTimeout(t);
  }, [successFormat]);

  // Auto-clear error after 3s
  useEffect(() => {
    if (!lastError) return;
    const t = setTimeout(() => reset(), 3000);
    return () => clearTimeout(t);
  }, [lastError, reset]);

  const handleExport = useCallback(
    async (format: ExportType) => {
      setMenuOpen(false);
      setActiveFormat(format);
      setSuccessFormat(null);

      try {
        if (reportId) {
          // Backend export mode
          const result = await exportReport({
            reportId,
            format,
            filename,
          });

          if (result.success) {
            setSuccessFormat(format);
            onSuccess?.(format, result.filename);
          } else {
            onError?.(format, result.error || 'Export failed');
          }
        } else if (data && data.length > 0) {
          // Client-side export mode
          const result = await exportData({
            data,
            type: format,
            filename,
            columns,
            sheetName,
            pdfTitle,
          });

          if (result.success) {
            setSuccessFormat(format);
            onSuccess?.(format, result.filename);
          } else {
            onError?.(format, result.error || 'Export failed');
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        onError?.(format, error);
      } finally {
        setActiveFormat(null);
      }
    },
    [
      reportId,
      data,
      columns,
      filename,
      sheetName,
      pdfTitle,
      exportData,
      exportReport,
      onSuccess,
      onError,
    ]
  );

  const isDisabled = disabled || isExporting || (!data && !reportId);

  // If only one format, render a simple button (no dropdown)
  if (filteredFormats.length === 1) {
    const fmt = filteredFormats[0];
    const Icon =
      isExporting && activeFormat === fmt.type
        ? Loader2
        : successFormat === fmt.type
        ? Check
        : fmt.icon;
    const iconClasses =
      successFormat === fmt.type ? 'text-emerald-400' : fmt.color;

    return (
      <button
        onClick={() => handleExport(fmt.type)}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 ${variantCls} ${sizeCls.btn} ${className} ${
          isExporting ? 'cursor-wait opacity-80' : ''
        }`}
        title={`Export as ${fmt.label}`}
      >
        <Icon
          className={`${sizeCls.icon} ${iconClasses} ${
            isExporting && activeFormat === fmt.type ? 'animate-spin' : ''
          }`}
        />
        <span>
          {isExporting && activeFormat === fmt.type
            ? 'Exporting...'
            : successFormat === fmt.type
            ? 'Done!'
            : label}
        </span>
        {lastError && (
          <AlertCircle className="h-3.5 w-3.5 text-red-400" title={lastError} />
        )}
      </button>
    );
  }

  // Multi-format dropdown
  return (
    <div className={`relative inline-flex ${className}`} ref={buttonRef}>
      {/* Main export button */}
      <button
        onClick={() => {
          if (!isExporting) {
            // Default to first format on direct click
            handleExport(filteredFormats[0]?.type || 'csv');
          }
        }}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center rounded-l-lg font-medium transition-all duration-150 ${variantCls} ${sizeCls.btn} ${
          isDisabled ? 'cursor-not-allowed opacity-40' : ''
        } ${isExporting ? 'cursor-wait opacity-80' : ''}`}
      >
        {isExporting && activeFormat ? (
          <Loader2 className={`${sizeCls.icon} animate-spin`} />
        ) : successFormat ? (
          <Check className={`${sizeCls.icon} text-emerald-400`} />
        ) : (
          <Download className={sizeCls.icon} />
        )}
        <span>
          {isExporting && activeFormat
            ? `Exporting ${activeFormat.toUpperCase()}...`
            : successFormat
            ? 'Exported!'
            : lastError
            ? 'Error'
            : label}
        </span>
      </button>

      {/* Dropdown toggle */}
      <button
        onClick={() => setMenuOpen((p) => !p)}
        disabled={isDisabled || isExporting}
        className={`inline-flex items-center justify-center rounded-r-lg border-l border-black/10 font-medium transition-all duration-150 ${variantCls} ${
          size === 'sm' ? 'px-1.5' : size === 'md' ? 'px-2' : 'px-2.5'
        } ${isDisabled || isExporting ? 'cursor-not-allowed opacity-40' : ''}`}
        aria-label="Export options"
        aria-expanded={menuOpen}
      >
        <ChevronDown
          className={`${sizeCls.chevron} transition-transform duration-150 ${
            menuOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className={`absolute right-0 top-full z-[60] mt-1.5 ${sizeCls.menu} rounded-lg border border-gray-700/50 bg-[#141414] py-1 shadow-xl`}
          >
            {/* Arrow */}
            <div className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 rounded-[2px] border-l border-t border-gray-700/50 bg-[#141414]" />

            {/* Format options */}
            <div className="relative">
              {filteredFormats.map((fmt) => {
                const Icon = fmt.icon;
                const isActive = activeFormat === fmt.type;
                const isSuccess = successFormat === fmt.type;
                return (
                  <button
                    key={fmt.type}
                    onClick={() => handleExport(fmt.type)}
                    disabled={isExporting}
                    className={`relative flex w-full items-center ${sizeCls.item} text-left font-medium transition-all duration-100 ${
                      isActive
                        ? `${fmt.bgActive} ${fmt.activeColor}`
                        : isSuccess
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-gray-300 hover:bg-[#1e1e1e] hover:text-gray-100'
                    } ${isExporting && !isActive ? 'opacity-50' : ''}`}
                  >
                    {isActive ? (
                      <Loader2
                        className={`${sizeCls.itemIcon} ${fmt.activeColor} animate-spin`}
                      />
                    ) : isSuccess ? (
                      <Check className={`${sizeCls.itemIcon} text-emerald-400`} />
                    ) : (
                      <Icon className={`${sizeCls.itemIcon} ${fmt.color}`} />
                    )}
                    <span className="flex-1">{fmt.label}</span>
                    {isSuccess && (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </button>
                );
              })}

              {/* Divider */}
              <div className="my-1 border-t border-gray-700/40" />

              {/* Info row */}
              <div className="px-3 py-1.5 text-[10px] text-gray-500">
                {data ? (
                  <span>
                    {data.length.toLocaleString()} row{data.length !== 1 ? 's' : ''}
                  </span>
                ) : reportId ? (
                  <span>Report: {reportId.slice(0, 8)}...</span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    No data or report ID
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExportButton;
