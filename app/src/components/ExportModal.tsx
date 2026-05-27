// @ts-nocheck
import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  FileSpreadsheet,
  Table,
  ExternalLink,
  MessageSquare,
  Download,
  Calendar,
  ChevronDown,
  Eye,
  Check,
  FileBarChart,
  BarChart3,
  Sparkles,
  ClipboardList,
  Megaphone,
  Image,
  Bot,
  Clock,
  Layers,
  Shield,
  PieChart,
  AlignLeft,
  Settings,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ExportFormat =
  | "pdf"
  | "csv"
  | "excel"
  | "google-sheets"
  | "slack";

export interface ExportConfig {
  format: ExportFormat;
  dateRange: string;
  customStartDate: string;
  customEndDate: string;
  selectedData: string[];
  includeOptions: string[];
}

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => void;
  defaultFormat?: ExportFormat;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FORMATS: {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    id: "pdf",
    label: "PDF Report",
    description: "Professional formatted report",
    icon: FileText,
    color: "text-red-400",
  },
  {
    id: "csv",
    label: "CSV",
    description: "Raw comma-separated values",
    icon: Table,
    color: "text-green-400",
  },
  {
    id: "excel",
    label: "Excel",
    description: "Microsoft Excel workbook",
    icon: FileSpreadsheet,
    color: "text-emerald-400",
  },
  {
    id: "google-sheets",
    label: "Google Sheets",
    description: "Export to Google Sheets",
    icon: ExternalLink,
    color: "text-blue-400",
  },
  {
    id: "slack",
    label: "Slack Message",
    description: "Send as Slack message",
    icon: MessageSquare,
    color: "text-purple-400",
  },
];

const DATE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 Days" },
  { id: "last30", label: "Last 30 Days" },
  { id: "custom", label: "Custom" },
];

const DATA_SECTIONS = [
  { id: "kpis", label: "KPIs", icon: BarChart3 },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "ads", label: "Ads", icon: Image },
  { id: "charts", label: "Charts", icon: PieChart },
  { id: "ai-insights", label: "AI Insights", icon: Sparkles },
  { id: "audit-log", label: "Audit Log", icon: ClipboardList },
];

const INCLUDE_OPTIONS = [
  { id: "brand-logo", label: "Brand Logo", icon: Shield },
  { id: "executive-summary", label: "Executive Summary", icon: AlignLeft },
  { id: "platform-breakdown", label: "Platform Breakdown", icon: Layers },
  { id: "raw-data", label: "Raw Data", icon: Settings },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

/* ------------------------------------------------------------------ */
/*  Helper: compute preset dates                                       */
/* ------------------------------------------------------------------ */

function getPresetDates(presetId: string): string {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (presetId) {
    case "today": {
      const d = fmt(today);
      return `${d} \u2013 ${d}`;
    }
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const d = fmt(y);
      return `${d} \u2013 ${d}`;
    }
    case "last7": {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return `${fmt(s)} \u2013 ${fmt(today)}`;
    }
    case "last30": {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return `${fmt(s)} \u2013 ${fmt(today)}`;
    }
    default:
      return "Select date range";
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  defaultFormat = "pdf",
}) => {
  const [format, setFormat] = useState<ExportFormat>(defaultFormat);
  const [dateRange, setDateRange] = useState("last7");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedData, setSelectedData] = useState<string[]>([
    "kpis",
    "campaigns",
    "charts",
  ]);
  const [includeOptions, setIncludeOptions] = useState<string[]>([
    "executive-summary",
    "platform-breakdown",
  ]);
  const [isExporting, setIsExporting] = useState(false);

  /* ── toggle helpers ── */
  const toggleDataItem = useCallback((id: string) => {
    setSelectedData((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleIncludeOption = useCallback((id: string) => {
    setIncludeOptions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const selectAllData = useCallback(() => {
    setSelectedData(DATA_SECTIONS.map((s) => s.id));
  }, []);

  const deselectAllData = useCallback(() => {
    setSelectedData([]);
  }, []);

  /* ── export handler ── */
  const handleExport = useCallback(() => {
    setIsExporting(true);
    const config: ExportConfig = {
      format,
      dateRange,
      customStartDate,
      customEndDate,
      selectedData,
      includeOptions,
    };
    onExport(config);
    setTimeout(() => {
      setIsExporting(false);
      onClose();
    }, 1200);
  }, [
    format,
    dateRange,
    customStartDate,
    customEndDate,
    selectedData,
    includeOptions,
    onExport,
    onClose,
  ]);

  /* ── date summary for preview ── */
  const dateSummary = useMemo(() => {
    if (dateRange === "custom" && customStartDate && customEndDate) {
      return `${customStartDate} \u2013 ${customEndDate}`;
    }
    return getPresetDates(dateRange);
  }, [dateRange, customStartDate, customEndDate]);

  /* ── format icon for preview ── */
  const activeFormat = FORMATS.find((f) => f.id === format)!;

  /* ── keyboard: close on escape ── */
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  /* ── reset state on open ── */
  React.useEffect(() => {
    if (isOpen) {
      setFormat(defaultFormat);
      setDateRange("last7");
      setCustomStartDate("");
      setCustomEndDate("");
      setSelectedData(["kpis", "campaigns", "charts"]);
      setIncludeOptions(["executive-summary", "platform-breakdown"]);
      setIsExporting(false);
    }
  }, [isOpen, defaultFormat]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-[720px] max-h-[90vh] overflow-y-auto rounded-xl border border-gray-700/50 bg-[#0f172a] shadow-2xl"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15">
                  <Download className="h-4.5 w-4.5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-100">
                    Export / Share
                  </h2>
                  <p className="text-xs text-gray-400">
                    Configure your export settings
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <motion.div
              className="space-y-6 px-6 py-5"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* ── Section 1: Format Selection ── */}
              <motion.section variants={itemVariants}>
                <h3 className="mb-3 text-sm font-medium text-gray-300">
                  Export Format
                </h3>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {FORMATS.map((f) => {
                    const Icon = f.icon;
                    const isActive = format === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFormat(f.id)}
                        className={`relative flex flex-col items-center gap-2 rounded-lg border px-3 py-3.5 text-center transition-all ${
                          isActive
                            ? "border-indigo-500/60 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                            : "border-gray-700/40 bg-gray-800/30 hover:border-gray-600/60 hover:bg-gray-800/50"
                        }`}
                      >
                        {isActive && (
                          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </span>
                        )}
                        <Icon
                          className={`h-5 w-5 ${
                            isActive ? f.color : "text-gray-500"
                          }`}
                        />
                        <div>
                          <p
                            className={`text-xs font-medium ${
                              isActive ? "text-gray-100" : "text-gray-400"
                            }`}
                          >
                            {f.label}
                          </p>
                          <p className="mt-0.5 text-[10px] text-gray-500">
                            {f.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.section>

              {/* ── Section 2: Date Range ── */}
              <motion.section variants={itemVariants}>
                <h3 className="mb-3 text-sm font-medium text-gray-300">
                  Date Range
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {DATE_PRESETS.map((preset) => {
                    const isActive = dateRange === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setDateRange(preset.id)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                          isActive
                            ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40"
                            : "bg-gray-800/50 text-gray-400 ring-1 ring-gray-700/40 hover:bg-gray-700/40 hover:text-gray-300"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom date pickers */}
                <AnimatePresence>
                  {dateRange === "custom" && (
                    <motion.div
                      className="mt-3 flex items-center gap-3"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="relative flex-1">
                        <Calendar className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full rounded-lg border border-gray-700/50 bg-gray-800/50 py-2 pl-8 pr-3 text-xs text-gray-200 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                        />
                      </div>
                      <span className="text-xs text-gray-500">to</span>
                      <div className="relative flex-1">
                        <Calendar className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full rounded-lg border border-gray-700/50 bg-gray-800/50 py-2 pl-8 pr-3 text-xs text-gray-200 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>

              {/* ── Section 3: Data Selection ── */}
              <motion.section variants={itemVariants}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-300">
                    Data to Include
                  </h3>
                  <div className="flex gap-1.5">
                    <button
                      onClick={selectAllData}
                      className="text-[10px] font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                    >
                      All
                    </button>
                    <span className="text-gray-600">|</span>
                    <button
                      onClick={deselectAllData}
                      className="text-[10px] font-medium text-gray-500 transition-colors hover:text-gray-400"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {DATA_SECTIONS.map((item) => {
                    const Icon = item.icon;
                    const checked = selectedData.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all ${
                          checked
                            ? "border-indigo-500/40 bg-indigo-500/8"
                            : "border-gray-700/35 bg-gray-800/25 hover:border-gray-600/50"
                        }`}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-all ${
                            checked
                              ? "border-indigo-500 bg-indigo-500"
                              : "border-gray-600 bg-transparent"
                          }`}
                        >
                          {checked && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggleDataItem(item.id)}
                        />
                        <Icon
                          className={`h-3.5 w-3.5 ${
                            checked ? "text-indigo-300" : "text-gray-500"
                          }`}
                        />
                        <span
                          className={`text-xs font-medium ${
                            checked ? "text-gray-200" : "text-gray-400"
                          }`}
                        >
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </motion.section>

              {/* ── Section 4: Include Options ── */}
              <motion.section variants={itemVariants}>
                <h3 className="mb-3 text-sm font-medium text-gray-300">
                  Include Options
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {INCLUDE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const checked = includeOptions.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all ${
                          checked
                            ? "border-indigo-500/40 bg-indigo-500/8"
                            : "border-gray-700/35 bg-gray-800/25 hover:border-gray-600/50"
                        }`}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-all ${
                            checked
                              ? "border-indigo-500 bg-indigo-500"
                              : "border-gray-600 bg-transparent"
                          }`}
                        >
                          {checked && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggleIncludeOption(opt.id)}
                        />
                        <Icon
                          className={`h-3.5 w-3.5 ${
                            checked ? "text-indigo-300" : "text-gray-500"
                          }`}
                        />
                        <span
                          className={`text-xs font-medium ${
                            checked ? "text-gray-200" : "text-gray-400"
                          }`}
                        >
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </motion.section>

              {/* ── Section 5: Preview ── */}
              <motion.section variants={itemVariants}>
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-300">
                  <Eye className="h-3.5 w-3.5 text-gray-500" />
                  Preview
                </h3>
                <div className="rounded-lg border border-gray-700/40 bg-gray-900/50 p-4">
                  <div className="flex items-center gap-3 border-b border-gray-700/30 pb-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        format === "pdf"
                          ? "bg-red-500/10"
                          : format === "csv"
                          ? "bg-green-500/10"
                          : format === "excel"
                          ? "bg-emerald-500/10"
                          : format === "google-sheets"
                          ? "bg-blue-500/10"
                          : "bg-purple-500/10"
                      }`}
                    >
                      <activeFormat.icon
                        className={`h-5 w-5 ${activeFormat.color}`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-200">
                        {activeFormat.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activeFormat.description}
                      </p>
                    </div>
                    <span className="rounded-md bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                      {format.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        Date Range
                      </span>
                      <span className="text-xs font-medium text-gray-300">
                        {dateSummary}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <FileBarChart className="h-3 w-3" />
                        Data Sections
                      </span>
                      <span className="text-xs font-medium text-indigo-300">
                        {selectedData.length} of {DATA_SECTIONS.length}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {selectedData.length > 0 ? (
                        selectedData.map((id) => {
                          const item = DATA_SECTIONS.find((s) => s.id === id);
                          if (!item) return null;
                          const ItemIcon = item.icon;
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300"
                            >
                              <ItemIcon className="h-2.5 w-2.5" />
                              {item.label}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-gray-600">
                          No sections selected
                        </span>
                      )}
                    </div>

                    {includeOptions.length > 0 && (
                      <>
                        <div className="flex items-center justify-between pt-1">
                          <span className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Layers className="h-3 w-3" />
                            Extra Options
                          </span>
                          <span className="text-xs font-medium text-indigo-300">
                            {includeOptions.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {includeOptions.map((id) => {
                            const opt = INCLUDE_OPTIONS.find((o) => o.id === id);
                            if (!opt) return null;
                            return (
                              <span
                                key={id}
                                className="inline-flex items-center gap-1 rounded-md bg-gray-700/30 px-2 py-0.5 text-[10px] font-medium text-gray-400"
                              >
                                {opt.label}
                              </span>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Mini preview visualization */}
                  <div className="mt-4 rounded-md bg-gray-800/40 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-2.5 w-24 rounded bg-gray-700/60" />
                      <div className="h-2.5 w-12 rounded bg-gray-700/40" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-full rounded bg-gray-700/30" />
                        <div className="h-1.5 w-16 rounded bg-gray-700/20" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-3/4 rounded bg-gray-700/30" />
                        <div className="h-1.5 w-12 rounded bg-gray-700/20" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-5/6 rounded bg-gray-700/30" />
                        <div className="h-1.5 w-20 rounded bg-gray-700/20" />
                      </div>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <div className="h-1.5 w-8 rounded bg-gray-700/25" />
                      <div className="h-1.5 w-8 rounded bg-gray-700/25" />
                      <div className="h-1.5 w-8 rounded bg-gray-700/25" />
                    </div>
                  </div>
                </div>
              </motion.section>
            </motion.div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-700/50 px-6 py-4">
              <div className="text-xs text-gray-500">
                {selectedData.length > 0 ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-emerald-500" />
                    {selectedData.length} sections ready
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-500" />
                    Select at least one section
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-gray-600/40 bg-transparent px-4 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-700/30 hover:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={selectedData.length === 0 || isExporting}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isExporting ? (
                    <>
                      <motion.div
                        className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ExportModal;
