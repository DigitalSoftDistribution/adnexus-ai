import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import {
  FileText, Download, Calendar, ChevronDown, CheckCircle,
  Plus, Layout, BarChart3, PieChart as PieIcon, TrendingUp,
  Send, Edit, Trash2,
  Palette, Type, AlignLeft, ToggleLeft, ToggleRight,
  Sparkles, Clock, ChevronRight,
  BookOpen, DollarSign,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  DESIGN CONSTANTS                                                    */
/* ------------------------------------------------------------------ */
const C = {
  accent: '#2563EB',
  metaBlue: '#1877F2',
  googleRed: '#EA4335',
  tiktokCyan: '#00f2ea',
  snapYellow: '#FFFC00',
  statusActive: '#10B981',
  statusWarning: '#F59E0B',
  statusError: '#EF4444',
  statusInfo: '#3B82F6',
};

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */
type ReportType = 'weekly' | 'monthly' | 'custom';
type ReportStatus = 'Active' | 'Draft';

interface ScheduledReport {
  id: string;
  name: string;
  client: string;
  type: ReportType;
  schedule: string;
  lastSent: string;
  nextSend: string;
  status: ReportStatus;
}

interface SavedTemplate {
  id: string;
  name: string;
  client: string;
  sections: string[];
  lastUsed: string;
  color: string;
}

/* ------------------------------------------------------------------ */
/*  MOCK DATA                                                           */
/* ------------------------------------------------------------------ */
const COLOR_SWATCHES = [
  '#2563EB', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

const TEMPLATES = [
  {
    id: 'weekly',
    name: 'Weekly Performance',
    description: 'Full campaign overview with KPIs, trends, and platform breakdown',
    icon: <BarChart3 size={24} />,
    color: C.accent,
    sections: ['Executive Summary', 'Platform Performance', 'Campaign Breakdown', 'Budget Pacing', 'Week-over-week'],
  },
  {
    id: 'monthly',
    name: 'Monthly Executive Summary',
    description: 'High-level metrics for client stakeholders',
    icon: <Layout size={24} />,
    color: C.statusActive,
    sections: ['Executive Summary', 'Platform Performance', 'Goals Progress', 'AI Insights'],
  },
  {
    id: 'custom',
    name: 'Custom Report',
    description: 'Build your own report from scratch',
    icon: <Plus size={24} />,
    color: C.statusWarning,
    sections: [],
  },
];

const REPORT_SECTIONS = [
  { key: 'coverPage', label: 'Cover Page', icon: <FileText size={14} /> },
  { key: 'tableOfContents', label: 'Table of Contents', icon: <BookOpen size={14} /> },
  { key: 'execSummary', label: 'Executive Summary', icon: <Layout size={14} /> },
  { key: 'platformPerf', label: 'Platform Performance', icon: <BarChart3 size={14} /> },
  { key: 'campaignBreak', label: 'Campaign Breakdown', icon: <PieIcon size={14} /> },
  { key: 'creativePerf', label: 'Creative Performance', icon: <Sparkles size={14} /> },
  { key: 'budgetPacing', label: 'Budget Pacing', icon: <DollarSign size={14} /> },
  { key: 'aiInsights', label: 'AI Insights & Recommendations', icon: <TrendingUp size={14} /> },
  { key: 'goalsProgress', label: 'Goals Progress', icon: <CheckCircle size={14} /> },
  { key: 'weekOverWeek', label: 'Week-over-week comparison', icon: <TrendingUp size={14} /> },
];

const INITIAL_SCHEDULED: ScheduledReport[] = [
  { id: '1', name: 'Acme Weekly', client: 'Acme Corp', type: 'weekly', schedule: 'Every Friday', lastSent: 'May 16', nextSend: 'May 23', status: 'Active' },
  { id: '2', name: 'BrightShop Monthly', client: 'BrightShop', type: 'monthly', schedule: '1st of month', lastSent: 'May 1', nextSend: 'Jun 1', status: 'Active' },
  { id: '3', name: 'TechStart Q2 Review', client: 'TechStart', type: 'custom', schedule: 'May 30', lastSent: '', nextSend: 'May 30', status: 'Draft' },
];

const INITIAL_TEMPLATES: SavedTemplate[] = [
  { id: 't1', name: 'Weekly Standard', client: 'Acme Corp', sections: ['Executive Summary', 'Platform Performance', 'Campaign Breakdown', 'Budget Pacing'], lastUsed: 'May 20', color: '#2563EB' },
  { id: 't2', name: 'Monthly Executive', client: 'BrightShop', sections: ['Executive Summary', 'Goals Progress', 'AI Insights'], lastUsed: 'May 15', color: '#10B981' },
  { id: 't3', name: 'Creative Review', client: 'TechStart', sections: ['Creative Performance', 'AI Insights', 'Week-over-week'], lastUsed: 'May 10', color: '#F59E0B' },
];

const CLIENTS = ['Acme Corp', 'BrightShop', 'TechStart', 'GreenLife', 'FitBrand', 'LuxeGoods', 'PlayGames', 'EduPlus'];

/* ------------------------------------------------------------------ */
/*  UTILITY COMPONENTS                                                  */
/* ------------------------------------------------------------------ */
function ToggleSwitch({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-2 transition-colors duration-150">
      {active ? (
        <ToggleRight size={20} style={{ color: C.statusActive }} />
      ) : (
        <ToggleLeft size={20} style={{ color: 'var(--text-tertiary)' }} />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                           */
/* ------------------------------------------------------------------ */
export default function WhiteLabelReports() {
  const [brandColor, setBrandColor] = useState(C.accent);
  const [reportTitle, setReportTitle] = useState('{client_name} — Weekly Performance Report — {date}');
  const [footerText, setFooterText] = useState('Prepared by AgencyAlpha | www.agencyalpha.com | Confidential');
  const [headerText, setHeaderText] = useState('AgencyAlpha Marketing Analytics');
  const [showPlatformLogos, setShowPlatformLogos] = useState(true);
  const [showAiInsights, setShowAiInsights] = useState(true);
  const [showCost, setShowCost] = useState(true);
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [showCoverPage, setShowCoverPage] = useState(true);
  const [showTableOfContents, setShowTableOfContents] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [, setSelectedTemplate] = useState<string | null>(null);
  const [reportName, setReportName] = useState('');
  const [reportClient, setReportClient] = useState(CLIENTS[0]);
  const [reportType, setReportType] = useState<ReportType>('weekly');
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({
    coverPage: true, tableOfContents: true, execSummary: true, platformPerf: true, campaignBreak: true, budgetPacing: true, weekOverWeek: true,
  });
  const [dateRange, setDateRange] = useState('Last 7 days');
  const [scheduled] = useState<ScheduledReport[]>(INITIAL_SCHEDULED);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>(INITIAL_TEMPLATES);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showGenerated, setShowGenerated] = useState(false);

  const openBuilder = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = TEMPLATES.find(t => t.id === templateId);
    if (tmpl) {
      setReportName(`${reportClient} — ${tmpl.name}`);
      setReportType(templateId as ReportType);
      const secs: Record<string, boolean> = {};
      REPORT_SECTIONS.forEach(s => { secs[s.key] = tmpl.sections.includes(s.label) || templateId === 'custom'; });
      setSelectedSections(secs);
    }
    setBuilderOpen(true);
    setShowGenerated(false);
  };

  const toggleSection = (key: string) => {
    setSelectedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const generateSample = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setShowGenerated(true);
    }, 2000);
  };

  const interpretedTitle = reportTitle
    .replace('{client_name}', reportClient)
    .replace('{date}', 'May 23, 2026');

  return (
    <>
    <SEO
      title="White-Label Reports"
      description="Create and customize white-label reports for your clients. Add your branding, logos, and custom color schemes."
      keywords="white-label reports, branded reports, client reports, custom branding"
    />
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        {/* ---- HEADER ---- */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-space text-[36px] font-semibold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
              White-Label Reports
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Create branded reports for your clients
            </p>
          </div>
          <button
            onClick={() => openBuilder('custom')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-150 hover:scale-[1.02]"
            style={{ background: C.accent, boxShadow: '0 0 30px rgba(37,99,235,0.2)' }}
          >
            <Plus size={16} />
            New Report
          </button>
        </div>

        {/* ---- BRANDING CONFIG ---- */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
          className="card-surface p-6 mb-8"
        >
          <h3 className="text-sm font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Branding Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Logo Upload */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Agency Logo</label>
              <div
                className="w-full h-20 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 hover:opacity-80"
                style={{ background: `linear-gradient(135deg, ${brandColor}30, ${brandColor}10)`, border: `2px dashed ${brandColor}50` }}
              >
                <span className="text-2xl font-bold" style={{ color: brandColor, fontFamily: 'Space Grotesk' }}>AA</span>
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Primary Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map(c => (
                  <button
                    key={c}
                    onClick={() => setBrandColor(c)}
                    className="w-7 h-7 rounded-full transition-transform duration-150 hover:scale-110"
                    style={{
                      background: c,
                      border: brandColor === c ? '2px solid white' : '2px solid transparent',
                      boxShadow: brandColor === c ? `0 0 8px ${c}80` : 'none',
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <Palette size={14} style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="bg-transparent text-[12px] outline-none flex-1 font-mono-data"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* Header Text */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Header Text</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <Type size={14} style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  className="bg-transparent text-[12px] outline-none flex-1"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mt-3 mb-2 block" style={{ color: 'var(--text-secondary)' }}>Title Template</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <FileText size={14} style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="bg-transparent text-[12px] outline-none flex-1"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              <span className="text-[10px] mt-1 block" style={{ color: 'var(--text-tertiary)' }}>Use {'{client_name}'} and {'{date}'}</span>
            </div>

            {/* Footer Text */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Footer Text</label>
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <AlignLeft size={14} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="bg-transparent text-[12px] outline-none flex-1"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>

          {/* Toggles row */}
          <div className="flex flex-wrap gap-6 mt-5 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <ToggleSwitch active={showCoverPage} onToggle={() => setShowCoverPage(!showCoverPage)} />
              <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Cover page</span>
            </div>
            <div className="flex items-center gap-2">
              <ToggleSwitch active={showTableOfContents} onToggle={() => setShowTableOfContents(!showTableOfContents)} />
              <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Table of contents</span>
            </div>
            <div className="flex items-center gap-2">
              <ToggleSwitch active={showPlatformLogos} onToggle={() => setShowPlatformLogos(!showPlatformLogos)} />
              <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Platform logos</span>
            </div>
            <div className="flex items-center gap-2">
              <ToggleSwitch active={showAiInsights} onToggle={() => setShowAiInsights(!showAiInsights)} />
              <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>AI insights</span>
            </div>
            <div className="flex items-center gap-2">
              <ToggleSwitch active={showCost} onToggle={() => setShowCost(!showCost)} />
              <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Cost breakdown</span>
            </div>
            <div className="flex items-center gap-2">
              <ToggleSwitch active={showBenchmarks} onToggle={() => setShowBenchmarks(!showBenchmarks)} />
              <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Benchmarks</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg text-[12px] font-medium text-white transition-all duration-150 hover:scale-[1.02]"
              style={{ background: C.accent }}
            >
              Save Branding
            </button>
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Changes auto-save to preview</span>
          </div>
        </motion.div>

        {/* ---- TEMPLATE CARDS ---- */}
        <AnimatePresence>
          {!builderOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8"
            >
              {TEMPLATES.map((tmpl, idx) => (
                <motion.div
                  key={tmpl.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.08, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                  whileHover={{ y: -2, borderColor: 'var(--border-active)' }}
                  onClick={() => openBuilder(tmpl.id)}
                  className="card-surface p-5 flex flex-col gap-4 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${tmpl.color}15`, color: tmpl.color }}>
                      {tmpl.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tmpl.name}</h4>
                    </div>
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tmpl.description}</p>
                  {/* Mini preview thumbnail */}
                  <div className="rounded-lg p-3 flex-1" style={{ background: 'white', minHeight: '120px' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold" style={{ background: brandColor, color: 'white' }}>AA</div>
                      <span className="text-[8px] font-semibold" style={{ color: '#333' }}>AgencyAlpha Report</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-1.5 rounded" style={{ background: '#eee', width: '70%' }} />
                      <div className="h-1.5 rounded" style={{ background: '#eee', width: '50%' }} />
                      <div className="h-1.5 rounded" style={{ background: '#eee', width: '60%' }} />
                      <div className="flex gap-1 mt-2">
                        <div className="h-8 flex-1 rounded" style={{ background: '#f5f5f5' }} />
                        <div className="h-8 flex-1 rounded" style={{ background: '#f5f5f5' }} />
                      </div>
                    </div>
                  </div>
                  <button
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-[12px] font-medium transition-all duration-150"
                    style={{ background: `${tmpl.color}10`, color: tmpl.color, border: `1px solid ${tmpl.color}20` }}
                  >
                    Use Template
                    <ChevronRight size={12} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- REPORT BUILDER ---- */}
        <AnimatePresence>
          {builderOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Report Builder</h3>
                  {generating && (
                    <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--accent)' }}>
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </span>
                  )}
                  {showGenerated && !generating && (
                    <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: '#10B981' }}>
                      <CheckCircle size={12} /> Sample ready
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={generateSample}
                    disabled={generating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: C.accent, color: 'white' }}
                  >
                    <Sparkles size={12} />
                    Generate Sample
                  </button>
                  <button
                    onClick={() => setBuilderOpen(false)}
                    className="text-[12px] px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Close Builder
                  </button>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-5" style={{ minHeight: '600px' }}>
                {/* LEFT — Configuration */}
                <div className="w-full lg:w-[35%] card-surface p-5 flex flex-col gap-5">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Report Name</label>
                    <input
                      type="text"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div className="relative">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Client</label>
                    <button
                      onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px]"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                    >
                      {reportClient}
                      <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
                    </button>
                    <AnimatePresence>
                      {clientDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-10"
                          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                        >
                          {CLIENTS.map(c => (
                            <button
                              key={c}
                              onClick={() => { setReportClient(c); setClientDropdownOpen(false); }}
                              className="w-full text-left px-3 py-2 text-[12px] transition-colors hover:bg-[var(--bg-hover)]"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {c}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Report Type</label>
                    <div className="flex gap-2">
                      {(['weekly', 'monthly', 'custom'] as ReportType[]).map(t => (
                        <button
                          key={t}
                          onClick={() => setReportType(t)}
                          className="px-3 py-1.5 rounded-full text-[12px] font-medium capitalize transition-all duration-150"
                          style={{
                            background: reportType === t ? `${C.accent}15` : 'var(--bg-secondary)',
                            color: reportType === t ? C.accent : 'var(--text-tertiary)',
                            border: `1px solid ${reportType === t ? `${C.accent}40` : 'var(--border-subtle)'}`,
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Sections</label>
                    <div className="flex flex-col gap-1.5">
                      {REPORT_SECTIONS.map(sec => (
                        <label key={sec.key} className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-[var(--bg-hover)]">
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center transition-all duration-150"
                            style={{
                              background: selectedSections[sec.key] ? C.accent : 'transparent',
                              border: `1px solid ${selectedSections[sec.key] ? C.accent : 'var(--border-subtle)'}`,
                            }}
                            onClick={() => toggleSection(sec.key)}
                          >
                            {selectedSections[sec.key] && <CheckCircle size={12} className="text-white" />}
                          </div>
                          <span className="mr-auto text-[12px]" style={{ color: 'var(--text-primary)' }}>{sec.label}</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{sec.icon}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Date Range</label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                      <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
                      <input
                        type="text"
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="bg-transparent text-[12px] outline-none flex-1"
                        style={{ color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div className="mt-auto flex gap-2">
                    <button
                      onClick={() => {
                        const newTmpl: SavedTemplate = {
                          id: `t${Date.now()}`,
                          name: reportName,
                          client: reportClient,
                          sections: REPORT_SECTIONS.filter(s => selectedSections[s.key]).map(s => s.label),
                          lastUsed: 'Just now',
                          color: brandColor,
                        };
                        setSavedTemplates(prev => [newTmpl, ...prev]);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-medium transition-all duration-150 border"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                    >
                      <Download size={14} /> Save Template
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-150 hover:scale-[1.01]"
                      style={{ background: C.accent }}
                    >
                      <FileText size={16} />
                      Generate Report
                    </button>
                  </div>
                </div>

                {/* RIGHT — Live Preview */}
                <div className="w-full lg:w-[65%] card-surface p-0 overflow-hidden flex flex-col" style={{ background: 'white' }}>
                  {/* Preview Header */}
                  <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #eee' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ background: brandColor }}>AA</div>
                      <div>
                        <h4 className="text-[13px] font-semibold" style={{ color: '#111' }}>{interpretedTitle}</h4>
                        <span className="text-[10px]" style={{ color: '#888' }}>{reportClient} — {dateRange}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: brandColor + '15', color: brandColor }}>Preview</span>
                    </div>
                  </div>

                  {/* Preview Body */}
                  <div className="flex-1 p-6 overflow-y-auto" style={{ background: 'white' }}>
                    {/* Cover Page */}
                    <AnimatePresence>
                      {showCoverPage && selectedSections.coverPage && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center py-8">
                          <div className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center text-xl font-bold text-white" style={{ background: brandColor }}>AA</div>
                          <h2 className="text-xl font-bold mb-1" style={{ color: '#111' }}>{headerText}</h2>
                          <p className="text-sm mb-1" style={{ color: '#666' }}>{interpretedTitle}</p>
                          <p className="text-xs" style={{ color: '#999' }}>{reportClient} — Prepared {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* TOC */}
                    <AnimatePresence>
                      {showTableOfContents && selectedSections.tableOfContents && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: brandColor }}>Contents</h5>
                          <div className="space-y-1.5">
                            {REPORT_SECTIONS.filter(s => selectedSections[s.key]).map((s, i) => (
                              <div key={s.key} className="flex items-center justify-between text-[11px] py-1" style={{ borderBottom: '1px dotted #eee' }}>
                                <span style={{ color: '#555' }}>{s.label}</span>
                                <span style={{ color: '#999' }}>{i + 1}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {selectedSections.execSummary && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: brandColor }}>Executive Summary</h5>
                          <div className="grid grid-cols-4 gap-3">
                            {[
                              { label: 'Total Spend', value: '$24,580', trend: '+8%' },
                              { label: 'ROAS', value: '3.82x', trend: '+12%' },
                              { label: 'Conversions', value: '1,247', trend: '+5%' },
                              { label: 'CTR', value: '2.41%', trend: '-2%' },
                            ].map(kpi => (
                              <div key={kpi.label} className="rounded-lg p-3" style={{ background: '#f8f9fa' }}>
                                <span className="text-[9px] uppercase tracking-wider" style={{ color: '#888' }}>{kpi.label}</span>
                                <div className="flex items-end gap-1.5 mt-1">
                                  <span className="text-[14px] font-bold" style={{ color: '#111' }}>{kpi.value}</span>
                                  <span className="text-[9px]" style={{ color: kpi.trend.startsWith('+') ? '#10B981' : '#EF4444' }}>{kpi.trend}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {selectedSections.platformPerf && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: brandColor }}>Platform Performance</h5>
                          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #eee' }}>
                            <table className="w-full text-[10px]">
                              <thead>
                                <tr style={{ background: '#f8f9fa' }}>
                                  <th scope="col" className="text-left px-3 py-2 font-semibold" style={{ color: '#666' }}>Platform</th>
                                  <th scope="col" className="text-right px-3 py-2 font-semibold" style={{ color: '#666' }}>Spend</th>
                                  <th scope="col" className="text-right px-3 py-2 font-semibold" style={{ color: '#666' }}>ROAS</th>
                                  <th scope="col" className="text-right px-3 py-2 font-semibold" style={{ color: '#666' }}>Conv.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { name: 'Meta', color: C.metaBlue, spend: '$12,400', roas: '4.1x', conv: '684' },
                                  { name: 'Google', color: C.googleRed, spend: '$7,200', roas: '3.5x', conv: '342' },
                                  { name: 'TikTok', color: C.tiktokCyan, spend: '$3,800', roas: '3.2x', conv: '156' },
                                  { name: 'Snap', color: C.snapYellow, spend: '$1,180', roas: '2.8x', conv: '65' },
                                ].map(p => (
                                  <tr key={p.name} style={{ borderTop: '1px solid #eee' }}>
                                    <td className="px-3 py-2 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                                      <span style={{ color: '#333' }}>{p.name}</span>
                                    </td>
                                    <td className="text-right px-3 py-2 font-medium" style={{ color: '#333' }}>{p.spend}</td>
                                    <td className="text-right px-3 py-2 font-medium" style={{ color: '#333' }}>{p.roas}</td>
                                    <td className="text-right px-3 py-2" style={{ color: '#666' }}>{p.conv}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {selectedSections.budgetPacing && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: brandColor }}>Budget Pacing</h5>
                          <div className="flex flex-col gap-2">
                            {[
                              { label: 'Total Budget', current: 65, color: brandColor },
                              { label: 'Meta', current: 82, color: C.metaBlue },
                              { label: 'Google', current: 48, color: C.googleRed },
                            ].map(bp => (
                              <div key={bp.label} className="flex items-center gap-3">
                                <span className="text-[10px] w-16" style={{ color: '#666' }}>{bp.label}</span>
                                <div className="flex-1 h-2 rounded-full" style={{ background: '#eee' }}>
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${bp.current}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full rounded-full"
                                    style={{ background: bp.color }}
                                  />
                                </div>
                                <span className="text-[10px] w-8 text-right" style={{ color: '#666' }}>{bp.current}%</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {selectedSections.aiInsights && showAiInsights && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-6 rounded-lg p-4"
                          style={{ background: '#f0f7ff', border: '1px solid #dbeafe' }}
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles size={12} style={{ color: C.accent }} />
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.accent }}>AI Insights</span>
                          </div>
                          <p className="text-[11px] leading-relaxed" style={{ color: '#374151' }}>
                            Consider shifting 15% of Meta budget to Google Ads. Meta CPA has increased 22% this week while Google CTR is up 18%. Retargeting audiences on Meta show fatigue — refresh creative assets.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Placeholder for empty */}
                    {Object.values(selectedSections).every(v => !v) && (
                      <div className="flex items-center justify-center h-40">
                        <span className="text-[12px]" style={{ color: '#bbb' }}>Select sections to preview</span>
                      </div>
                    )}
                  </div>

                  {/* Preview Footer */}
                  <div className="px-6 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #eee', background: '#fafafa' }}>
                    <span className="text-[9px]" style={{ color: '#aaa' }}>{footerText}</span>
                    <div className="flex items-center gap-2">
                      {showPlatformLogos && (
                        <div className="flex gap-1">
                          {['M', 'G', 'T', 'S'].map(l => (
                            <span key={l} className="text-[8px] font-bold w-4 h-4 rounded flex items-center justify-center" style={{ background: '#eee', color: '#888' }}>{l}</span>
                          ))}
                        </div>
                      )}
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium text-white transition-all duration-150 hover:opacity-90"
                        style={{ background: brandColor }}
                      >
                        <Download size={12} />
                        Download PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- SAVED TEMPLATES ---- */}
        {!builderOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="card-surface p-5 mb-8 overflow-x-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Saved Templates</h3>
              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{savedTemplates.length} templates</span>
            </div>
            <table className="w-full" style={{ minWidth: '600px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th scope="col" className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] rounded-tl-lg" style={{ color: 'var(--text-secondary)' }}>Name</th>
                  <th scope="col" className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Client</th>
                  <th scope="col" className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Sections</th>
                  <th scope="col" className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Last Used</th>
                  <th scope="col" className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] rounded-tr-lg" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedTemplates.map((tmpl: typeof savedTemplates[0], idx: number) => (
                  <tr
                    key={tmpl.id}
                    className="transition-colors duration-100 hover:bg-[var(--bg-hover)]"
                    style={{ borderBottom: idx < savedTemplates.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: tmpl.color }} />
                        <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{tmpl.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{tmpl.client}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tmpl.sections.slice(0, 3).map(s => (
                          <span key={s} className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>{s}</span>
                        ))}
                        {tmpl.sections.length > 3 && (
                          <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>+{tmpl.sections.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{tmpl.lastUsed}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded transition-colors hover:bg-[var(--bg-hover)]" style={{ color: 'var(--accent)' }} title="Use">
                          <FileText size={14} />
                        </button>
                        <button className="p-1.5 rounded transition-colors hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-secondary)' }}>
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setSavedTemplates(prev => prev.filter(t => t.id !== tmpl.id))}
                          className="p-1.5 rounded transition-colors hover:bg-red-500/10"
                          style={{ color: '#EF4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* ---- SCHEDULED REPORTS TABLE ---- */}
        {!builderOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="card-surface p-5 overflow-x-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Scheduled Reports</h3>
              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{scheduled.length} scheduled</span>
            </div>
            <table className="w-full" style={{ minWidth: '700px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th scope="col" className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] rounded-tl-lg" style={{ color: 'var(--text-secondary)' }}>Report Name</th>
                  <th scope="col" className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Client</th>
                  <th scope="col" className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Type</th>
                  <th scope="col" className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Schedule</th>
                  <th scope="col" className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Next Send</th>
                  <th scope="col" className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th scope="col" className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] rounded-tr-lg" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduled.map((rep: typeof scheduled[0], idx: number) => (
                  <tr
                    key={rep.id}
                    className="transition-colors duration-100 hover:bg-[var(--bg-hover)]"
                    style={{ borderBottom: idx < scheduled.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{rep.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{rep.client}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                        style={{
                          background: rep.type === 'weekly' ? `${C.accent}15` : rep.type === 'monthly' ? `${C.statusActive}15` : `${C.statusWarning}15`,
                          color: rep.type === 'weekly' ? C.accent : rep.type === 'monthly' ? C.statusActive : C.statusWarning,
                        }}
                      >
                        {rep.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{rep.schedule}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{rep.nextSend}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          background: rep.status === 'Active' ? `${C.statusActive}15` : `${C.statusInfo}15`,
                          color: rep.status === 'Active' ? C.statusActive : C.statusInfo,
                        }}
                      >
                        {rep.status === 'Active' ? <CheckCircle size={10} /> : <Clock size={10} />}
                        {rep.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 rounded transition-colors hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-secondary)' }}>
                          <Edit size={14} />
                        </button>
                        <button className="p-1.5 rounded transition-colors hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-secondary)' }}>
                          <Send size={14} />
                        </button>
                        <button className="p-1.5 rounded transition-colors hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-tertiary)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </div>
    </>
  );
}
