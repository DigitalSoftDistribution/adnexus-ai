import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  Trash2,
  Share2,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  Calendar,
  Filter,
  Columns,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  History,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface ExportType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  formats: ('CSV' | 'Excel' | 'PDF')[];
  color: string;
  defaultColumns: string[];
}

interface ExportHistoryItem {
  id: string;
  name: string;
  type: string;
  format: 'CSV' | 'PDF' | 'Excel';
  rows: number;
  size: string;
  status: 'Ready' | 'Processing' | 'Expired';
  created: string;
  expires: string;
}

interface ScheduledExport {
  id: string;
  name: string;
  frequency: string;
  format: string;
  next: string;
  active: boolean;
}

/* ------------------------------------------------------------------ */
/*  MOCK DATA                                                          */
/* ------------------------------------------------------------------ */

const exportTypes: ExportType[] = [
  {
    id: 'campaigns-csv',
    name: 'Campaigns CSV',
    description: 'Full campaign data with performance metrics, status, and budget info. Best for spreadsheet analysis.',
    icon: <FileText size={24} />,
    formats: ['CSV', 'Excel'],
    color: '#2563EB',
    defaultColumns: ['Name', 'Status', 'Platform', 'Budget', 'Spend', 'CTR', 'CPC', 'Conversions', 'CPA', 'ROAS'],
  },
  {
    id: 'campaigns-excel',
    name: 'Campaigns Excel',
    description: 'Multi-sheet workbook with campaigns, ad sets, and ads on separate tabs. Includes charts.',
    icon: <FileSpreadsheet size={24} />,
    formats: ['Excel'],
    color: '#10B981',
    defaultColumns: ['Name', 'Status', 'Platform', 'Budget', 'Spend', 'CTR', 'CPC', 'Conversions', 'CPA', 'ROAS', 'Frequency', 'Impressions'],
  },
  {
    id: 'insights-csv',
    name: 'Insights CSV',
    description: 'AI-generated insights, anomaly alerts, and optimization recommendations.',
    icon: <Sparkles size={24} />,
    formats: ['CSV', 'Excel'],
    color: '#8B5CF6',
    defaultColumns: ['Date', 'Insight Type', 'Severity', 'Campaign', 'Description', 'Recommended Action'],
  },
  {
    id: 'audit-log-csv',
    name: 'Audit Log CSV',
    description: 'Complete audit trail of all changes, approvals, and agent actions across your account.',
    icon: <History size={24} />,
    formats: ['CSV', 'Excel'],
    color: '#F59E0B',
    defaultColumns: ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Old Value', 'New Value'],
  },
  {
    id: 'report-pdf',
    name: 'Report PDF',
    description: 'Branded white-label report with charts, tables, and AI insights. Ready to share with clients.',
    icon: <FileDown size={24} />,
    formats: ['PDF'],
    color: '#EF4444',
    defaultColumns: ['Executive Summary', 'Platform Performance', 'Campaign Breakdown', 'AI Insights'],
  },
];

const exportHistory: ExportHistoryItem[] = [
  { id: '1', name: 'campaigns-full-2026-05-20', type: 'Campaigns CSV', format: 'CSV', rows: 420, size: '2.1 MB', status: 'Ready', created: 'May 20, 2026 at 10:30 AM', expires: 'May 27' },
  { id: '2', name: 'insights-week-of-may-13', type: 'Insights CSV', format: 'CSV', rows: 156, size: '840 KB', status: 'Ready', created: 'May 19, 2026 at 9:15 AM', expires: 'May 26' },
  { id: '3', name: 'q2-performance-report', type: 'Report PDF', format: 'PDF', rows: 1, size: '5.2 MB', status: 'Ready', created: 'May 18, 2026 at 4:00 PM', expires: 'May 25' },
  { id: '4', name: 'audit-log-may-2026', type: 'Audit Log CSV', format: 'CSV', rows: 15240, size: '8.4 MB', status: 'Ready', created: 'May 17, 2026 at 11:00 AM', expires: 'May 24' },
  { id: '5', name: 'campaigns-excel-backup', type: 'Campaigns Excel', format: 'Excel', rows: 420, size: '12.1 MB', status: 'Expired', created: 'May 10, 2026 at 8:00 AM', expires: 'May 17' },
  { id: '6', name: 'cross-platform-insights', type: 'Insights CSV', format: 'CSV', rows: 89, size: '340 KB', status: 'Ready', created: 'May 16, 2026 at 2:30 PM', expires: 'May 23' },
  { id: '7', name: 'weekly-client-report', type: 'Report PDF', format: 'PDF', rows: 1, size: '4.8 MB', status: 'Ready', created: 'May 15, 2026 at 5:00 PM', expires: 'May 22' },
  { id: '8', name: 'campaigns-full-export', type: 'Campaigns Excel', format: 'Excel', rows: 45000, size: '28 MB', status: 'Ready', created: 'May 14, 2026 at 10:00 AM', expires: 'May 21' },
];

const initialScheduled: ScheduledExport[] = [
  { id: '1', name: 'Weekly Campaign Summary', frequency: 'Every Monday 8 AM', format: 'CSV', next: 'May 26', active: true },
  { id: '2', name: 'Monthly Full Backup', frequency: '1st of month', format: 'Excel', next: 'Jun 1', active: true },
  { id: '3', name: 'Daily Metrics Dump', frequency: 'Every day 11 PM', format: 'CSV', next: 'Tonight', active: false },
];

const platforms = ['Meta', 'Google', 'TikTok', 'Snap'];
const statuses = ['Active', 'Paused', 'Draft', 'Error'];

/* ------------------------------------------------------------------ */
/*  FORMAT ICON                                                        */
/* ------------------------------------------------------------------ */

function FormatIcon({ format, size = 16 }: { format: string; size?: number }) {
  if (format === 'CSV') return <FileText size={size} style={{ color: '#10B981' }} />;
  if (format === 'PDF') return <FileDown size={size} style={{ color: '#EF4444' }} />;
  return <FileSpreadsheet size={size} style={{ color: '#3B82F6' }} />;
}

/* ------------------------------------------------------------------ */
/*  STATUS BADGE                                                       */
/* ------------------------------------------------------------------ */

function ExportStatusBadge({ status }: { status: string }) {
  if (status === 'Ready') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
        <CheckCircle2 size={10} /> Ready
      </span>
    );
  }
  if (status === 'Processing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
        <Loader2 size={10} className="animate-spin" /> Processing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'rgba(85,91,102,0.15)', color: 'var(--text-tertiary)' }}>
      <Clock size={10} /> Expired
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */

export default function ExportCenter() {
  const [selectedExportType, setSelectedExportType] = useState<ExportType | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['Meta', 'Google']);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['Active']);
  const [dateRange, setDateRange] = useState('Last 30 days');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(exportTypes[0].defaultColumns);
  const [selectedFormat, setSelectedFormat] = useState<'CSV' | 'Excel' | 'PDF'>('CSV');
  const [generating, setGenerating] = useState(false);
  const [generatedFile, setGeneratedFile] = useState<{ name: string; url: string; size: string } | null>(null);
  const [scheduled, setScheduled] = useState<ScheduledExport[]>(initialScheduled);

  const togglePlatform = (p: string) => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleStatus = (s: string) => setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const toggleColumn = (c: string) => setSelectedColumns(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  const toggleScheduled = (id: string) => setScheduled(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));

  const selectExportType = (et: ExportType) => {
    setSelectedExportType(et);
    setSelectedColumns(et.defaultColumns);
    setSelectedFormat(et.formats[0]);
    setGeneratedFile(null);
  };

  const generateExport = () => {
    setGenerating(true);
    setGeneratedFile(null);
    setTimeout(() => {
      setGenerating(false);
      const ext = selectedFormat === 'Excel' ? 'xlsx' : selectedFormat === 'PDF' ? 'pdf' : 'csv';
      const name = `${selectedExportType?.id || 'export'}-${new Date().toISOString().slice(0, 10)}.${ext}`;
      setGeneratedFile({ name, url: '#', size: `${(Math.random() * 5 + 0.5).toFixed(1)} MB` });
    }, 3000);
  };

  const allColumns = selectedExportType?.defaultColumns || exportTypes[0].defaultColumns;

  return (
    <>
    <SEO
      title="Export Center"
      description="Export campaign data, reports, and analytics in multiple formats. Download CSV, Excel, PDF, and PowerPoint reports."
      keywords="export, data export, report download, CSV, Excel, PDF export"
    />
    <div className="min-h-[100dvh] px-4 py-6 md:px-8" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
        className="mb-6"
      >
        <h1 className="font-space text-3xl font-bold tracking-tight md:text-4xl" style={{ color: 'var(--text-primary)' }}>
          Export Center
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Export campaign data, reports, and audit logs in bulk
        </p>
      </motion.div>

      {/* ===== EXPORT TYPE CARDS ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-6"
      >
        <h2 className="font-space text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Select Export Type</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {exportTypes.map((et, i) => (
            <motion.button
              key={et.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => selectExportType(et)}
              className="rounded-xl p-4 text-left transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: selectedExportType?.id === et.id ? `${et.color}10` : 'var(--bg-elevated)',
                border: `1.5px solid ${selectedExportType?.id === et.id ? et.color : 'var(--border-subtle)'}`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: `${et.color}15`, color: et.color }}>
                  {et.icon}
                </div>
                {selectedExportType?.id === et.id && <CheckCircle2 size={16} style={{ color: et.color }} />}
              </div>
              <h3 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{et.name}</h3>
              <p className="text-[10px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>{et.description}</p>
              <div className="flex gap-1">
                {et.formats.map(f => (
                  <span key={f} className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>{f}</span>
                ))}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* LEFT: Configuration + Generate */}
        <div className="flex-1 space-y-6">
          <AnimatePresence mode="wait">
            {selectedExportType && (
              <motion.div
                key={selectedExportType.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="card-surface p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: `${selectedExportType.color}15`, color: selectedExportType.color }}>
                      {selectedExportType.icon}
                    </div>
                    <div>
                      <h2 className="font-space text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Configure Export</h2>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{selectedExportType.name}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedExportType(null); setGeneratedFile(null); }} className="rounded p-1 hover:bg-white/5" style={{ color: 'var(--text-tertiary)' }}>
                    <X size={16} />
                  </button>
                </div>

                {/* Format Selection */}
                {selectedExportType.formats.length > 1 && (
                  <div className="mb-4">
                    <label className="mb-2 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Format</label>
                    <div className="flex gap-2">
                      {selectedExportType.formats.map(f => (
                        <button
                          key={f}
                          onClick={() => setSelectedFormat(f)}
                          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all"
                          style={{
                            borderColor: selectedFormat === f ? selectedExportType.color : 'var(--border-subtle)',
                            background: selectedFormat === f ? `${selectedExportType.color}10` : 'var(--bg-secondary)',
                            color: selectedFormat === f ? selectedExportType.color : 'var(--text-secondary)',
                          }}
                        >
                          <FormatIcon format={f} />
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date Range */}
                <div className="mb-4">
                  <label className="mb-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    <Calendar size={12} /> Date Range
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Last 7 days', 'Last 30 days', 'Last 90 days', 'This month', 'Last month', 'Custom'].map(d => (
                      <button
                        key={d}
                        onClick={() => setDateRange(d)}
                        className="rounded-full px-3 py-1 text-xs font-medium transition-all"
                        style={{
                          background: dateRange === d ? selectedExportType.color : 'var(--bg-secondary)',
                          color: dateRange === d ? '#fff' : 'var(--text-secondary)',
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platforms (only for campaign/insight exports) */}
                {(selectedExportType.id.includes('campaign') || selectedExportType.id.includes('insight')) && (
                  <div className="mb-4">
                    <label className="mb-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      <Filter size={12} /> Platforms
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {platforms.map(p => (
                        <button
                          key={p}
                          onClick={() => togglePlatform(p)}
                          className="rounded-full px-3 py-1 text-xs font-medium transition-all"
                          style={{
                            background: selectedPlatforms.includes(p) ? selectedExportType.color : 'var(--bg-secondary)',
                            color: selectedPlatforms.includes(p) ? '#fff' : 'var(--text-secondary)',
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Statuses */}
                {(selectedExportType.id.includes('campaign')) && (
                  <div className="mb-4">
                    <label className="mb-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      <Filter size={12} /> Campaign Status
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {statuses.map(s => (
                        <button
                          key={s}
                          onClick={() => toggleStatus(s)}
                          className="rounded-full px-3 py-1 text-xs font-medium transition-all"
                          style={{
                            background: selectedStatuses.includes(s) ? selectedExportType.color : 'var(--bg-secondary)',
                            color: selectedStatuses.includes(s) ? '#fff' : 'var(--text-secondary)',
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Columns */}
                <div className="mb-4">
                  <label className="mb-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    <Columns size={12} /> Columns to Include
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allColumns.map(c => (
                      <button
                        key={c}
                        onClick={() => toggleColumn(c)}
                        className="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
                        style={{
                          background: selectedColumns.includes(c) ? `${selectedExportType.color}15` : 'var(--bg-secondary)',
                          color: selectedColumns.includes(c) ? selectedExportType.color : 'var(--text-secondary)',
                          border: `1px solid ${selectedColumns.includes(c) ? `${selectedExportType.color}40` : 'var(--border-subtle)'}`,
                        }}
                      >
                        {selectedColumns.includes(c) && <Check size={10} className="mr-1 inline" />}
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button + Result */}
                <div className="flex flex-wrap items-center gap-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={generateExport}
                    disabled={generating || selectedColumns.length === 0}
                    className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: selectedExportType.color, color: 'white' }}
                  >
                    {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {generating ? 'Generating...' : 'Generate Export'}
                  </button>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    ~{selectedExportType.id.includes('report') ? '1' : Math.floor(Math.random() * 500 + 100)} rows estimated
                  </span>
                </div>

                {/* Generated File Download */}
                <AnimatePresence>
                  {generatedFile && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 rounded-lg p-4 flex items-center gap-4"
                      style={{ background: `${selectedExportType.color}10`, border: `1px solid ${selectedExportType.color}30` }}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ background: `${selectedExportType.color}20`, color: selectedExportType.color }}>
                        <FormatIcon format={selectedFormat} size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{generatedFile.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{generatedFile.size} &middot; {selectedColumns.length} columns</p>
                      </div>
                      <button
                        onClick={() => alert('Downloading ' + generatedFile.name)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white transition-all hover:opacity-90"
                        style={{ background: selectedExportType.color }}
                      >
                        <Download size={12} /> Download
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {!selectedExportType && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card-surface p-8 text-center"
              >
                <Download size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Select an export type above to configure</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Choose from campaigns, insights, audit logs, or branded reports</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== EXPORT HISTORY ===== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="card-surface overflow-hidden"
          >
            <div className="border-b px-5 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
              <h2 className="font-space text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Exports</h2>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{exportHistory.length} exports</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Filename</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Type</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Format</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Size</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Created</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exportHistory.map((item, i) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-t transition-colors hover:bg-white/[0.02]"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <td className="px-4 py-3 font-mono-data text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{item.type}</td>
                      <td className="px-4 py-3"><FormatIcon format={item.format} /></td>
                      <td className="px-4 py-3 font-mono-data text-xs" style={{ color: 'var(--text-secondary)' }}>{item.size}</td>
                      <td className="px-4 py-3"><ExportStatusBadge status={item.status} /></td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{item.created}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {item.status === 'Ready' && (
                            <button className="rounded p-1 transition-colors hover:bg-white/5" style={{ color: 'var(--accent)' }} title="Download">
                              <Download size={14} />
                            </button>
                          )}
                          <button className="rounded p-1 transition-colors hover:bg-white/5" style={{ color: 'var(--text-secondary)' }} title="Share">
                            <Share2 size={14} />
                          </button>
                          <button className="rounded p-1 transition-colors hover:bg-red-500/10" style={{ color: '#EF4444' }} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* RIGHT: Scheduled Exports Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="w-full space-y-4 lg:w-80 shrink-0"
        >
          <div className="card-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-space text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Scheduled Exports</h3>
              <button className="rounded p-1 transition-colors hover:bg-white/5" style={{ color: 'var(--accent)' }}>
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {scheduled.map(s => (
                <div
                  key={s.id}
                  className="rounded-lg border p-3 transition-colors"
                  style={{ borderColor: 'var(--border-subtle)', background: s.active ? 'rgba(37,99,235,0.05)' : 'transparent' }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                    <button onClick={() => toggleScheduled(s.id)} style={{ color: s.active ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {s.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                  </div>
                  <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-1"><RefreshCw size={10} /> {s.frequency}</div>
                    <div className="flex items-center gap-1"><FormatIcon format={s.format as 'CSV'} /> {s.format}</div>
                    <div className="flex items-center gap-1"><Clock size={10} /> Next: {s.next}</div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button className="rounded p-1 transition-colors hover:bg-white/5" style={{ color: 'var(--text-tertiary)' }}>
                      <Edit3 size={12} />
                    </button>
                    <button className="rounded p-1 transition-colors hover:bg-red-500/10" style={{ color: '#EF4444' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
    </>
  );
}
