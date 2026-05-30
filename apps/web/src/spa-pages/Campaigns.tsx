// @ts-nocheck
import { useState, useCallback, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Pause, Copy, X, Check, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight,
  LayoutList, LayoutGrid, Eye, Edit, Play, Download, ArrowUpDown,
  Facebook, Globe, Music2, Ghost, MoreVertical, RefreshCw, Wifi, WifiOff
} from 'lucide-react';
import { campaignsApi } from '../lib/api';
import type { Campaign, CreateCampaignInput as ApiCreateCampaignInput } from '../lib/api';
import { useCampaignStore } from '../stores';
import { useToast } from '../hooks/useToast';
import { useRealtime } from '../hooks/useRealtime';
import {
  TextInput,
  SelectField,
  SubmitButton,
  FormSection,
} from '@/components/forms';
import { createCampaignSchema, type CreateCampaignInput } from '@/lib/validation';
import SEO from '../components/SEO';

/* ============================================================
   TYPES & CONSTANTS
   ============================================================ */

type SortKey = keyof Campaign | null;
type SortDir = 'asc' | 'desc';

const PLATFORM_COLORS: Record<Campaign['platform'], string> = {
  Meta: '#1877F2',
  Google: '#DB4437',
  TikTok: '#00F2EA',
  Snap: '#FFFC00',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Active:  { bg: 'rgba(16,185,129,0.12)', text: '#10B981', dot: '#10B981' },
  Paused:  { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', dot: '#F59E0B' },
  Ended:   { bg: 'rgba(120,120,120,0.15)', text: '#9CA3AF', dot: '#6B7280' },
  Draft:   { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6', dot: '#3B82F6' },
};

const PLATFORM_OPTIONS: Campaign['platform'][] = ['Meta', 'Google', 'TikTok', 'Snap'];
const STATUS_OPTIONS: string[] = ['Active', 'Paused', 'Ended'];
const OBJECTIVE_OPTIONS: string[] = ['Awareness', 'Traffic', 'Conversions', 'App Installs', 'Engagement', 'Lead Generation'];
const BID_STRATEGIES: string[] = ['Lowest Cost', 'Cost Cap', 'Bid Cap', 'Minimum ROAS'];
const AGE_RANGES: string[] = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+', '18-65+'];
const GENDER_OPTIONS: string[] = ['All', 'Male', 'Female'];
const INTEREST_OPTIONS: string[] = ['Shopping', 'Fashion', 'Technology', 'Gaming', 'Sports', 'Travel', 'Food', 'Entertainment', 'Business', 'Health'];

/* ============================================================
   SUMMARY TYPE
   ============================================================ */

interface CampaignSummaryData {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCtr: number;
  avgRoas: number;
  platformBreakdown: Record<string, { count: number; spend: number }>;
  statusBreakdown: Record<string, number>;
}

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

function formatCurrency(n: number | null): string {
  if (n === null || n === undefined || isNaN(n)) return '---';
  return '$' + n.toLocaleString('en-US');
}

function formatPercent(n: number | null): string {
  if (n === null || n === undefined || isNaN(n)) return '---';
  return n.toFixed(1) + '%';
}

function formatNumber(n: number | null): string {
  if (n === null || n === undefined || isNaN(n)) return '---';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('en-US');
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

function PlatformIcon({ platform, size = 14 }: { platform: Campaign['platform']; size?: number }) {
  const props = { size, style: { color: PLATFORM_COLORS[platform] } };
  switch (platform) {
    case 'Meta': return <Facebook {...props} />;
    case 'Google': return <Globe {...props} />;
    case 'TikTok': return <Music2 {...props} />;
    case 'Snap': return <Ghost {...props} />;
  }
}

function PlatformBadge({ platform }: { platform: Campaign['platform'] }) {
  const color = PLATFORM_COLORS[platform];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: color + '22', color }}
    >
      <PlatformIcon platform={platform} size={12} />
      {platform}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.Draft;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {status}
    </span>
  );
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (!values.length) return <div className="h-8 w-24 bg-white/5 rounded" />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * 96;
    const y = 28 - ((v - min) / range) * 22;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 96 32" className="h-8 w-24" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.split(' ').pop() && (
        <circle cx={pts.split(' ').pop()?.split(',')[0]} cy={pts.split(' ').pop()?.split(',')[1]} r="2" fill={color} />
      )}
    </svg>
  );
}

function SortHeader({ label, sortKey, currentSort, dir, onSort }: {
  label: string; sortKey: SortKey; currentSort: SortKey; dir?: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = currentSort === sortKey;
  const ariaSort = active
    ? (dir === 'asc' ? 'ascending' : 'descending')
    : 'none';
  return (
    <th scope="col" aria-sort={ariaSort} className="px-3 text-left">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors hover:opacity-80 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/40 rounded px-0.5 -ml-0.5"
        style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        aria-label={`Sort by ${label}${active ? ` — sorted ${dir === 'asc' ? 'ascending' : 'descending'}` : ''}`}
        type="button"
      >
        {label}
        <ArrowUpDown
          size={10}
          className={cn(active ? 'opacity-100' : 'opacity-30')}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="h-[52px]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4">
          <div className="h-3 rounded bg-white/5 animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
        </td>
      ))}
    </tr>
  );
}

/* ============================================================
   ERROR STATE
   ============================================================ */

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
        <AlertTriangle size={24} style={{ color: '#EF4444' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Failed to load campaigns</p>
      <p className="text-xs max-w-[320px] text-center" style={{ color: 'var(--text-tertiary)' }}>{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 h-8 px-4 rounded-lg text-xs font-medium transition-all hover:opacity-80 mt-1"
        style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
        type="button"
      >
        <RefreshCw size={13} /> Try Again
      </button>
    </div>
  );
}

/* ============================================================
   LIST VIEW
   ============================================================ */

function ListView({
  campaigns, selectedIds, sortKey, sortDir, isLoading, error, onRetry,
  onSort, onToggleSelect, onToggleSelectAll, onAction,
}: {
  campaigns: Campaign[]; selectedIds: Set<string>; sortKey: SortKey; sortDir: SortDir;
  isLoading: boolean; error: string | null; onRetry: () => void;
  onSort: (k: SortKey) => void; onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void; onAction: (action: string, campaign: Campaign) => void;
}) {
  const allSelected = campaigns.length > 0 && campaigns.every((c) => selectedIds.has(c.id));
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (error) {
    return (
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1300px]">
          <thead>
            <tr className="h-[48px]" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <th scope="col" className="w-10 px-3">
                <button
                  onClick={onToggleSelectAll}
                  className={cn('w-4 h-4 rounded border flex items-center justify-center transition-all', allSelected && 'bg-[#2563EB] border-[#2563EB]')}
                  style={{ borderColor: allSelected ? '#2563EB' : 'var(--border-subtle)' }}
                  aria-label={allSelected ? 'Deselect all campaigns' : 'Select all campaigns'}
                  type="button"
                >
                  {allSelected && <Check size={10} className="text-white" aria-hidden="true" />}
                </button>
              </th>
              <SortHeader label="Campaign" sortKey="name" currentSort={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="Platform" sortKey="platform" currentSort={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="Status" sortKey="status" currentSort={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="Objective" sortKey="objective" currentSort={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="Budget" sortKey="budget" currentSort={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="Spend" sortKey="spend" currentSort={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="Impressions" sortKey="impressions" currentSort={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="Clicks" sortKey="clicks" currentSort={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="CTR" sortKey="ctr" currentSort={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="Conv." sortKey="conversions" currentSort={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="CPA" sortKey="cpa" currentSort={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="ROAS" sortKey="roas" currentSort={sortKey} dir={sortDir} onSort={onSort} />
              <th scope="col" className="w-10 px-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={14} />)
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Search size={32} style={{ color: 'var(--text-muted)' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>No campaigns found</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              campaigns.map((campaign, i) => {
                const isSelected = selectedIds.has(campaign.id);
                return (
                  <motion.tr
                    key={campaign.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: i * 0.02 }}
                    className="h-[52px] group transition-colors duration-100 cursor-pointer"
                    style={{
                      background: isSelected ? 'rgba(37,99,235,0.05)' : 'transparent',
                      borderLeft: isSelected ? '2px solid #2563EB' : '2px solid transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleSelect(campaign.id); }}
                        className={cn('w-4 h-4 rounded border flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50', isSelected && 'bg-[#2563EB] border-[#2563EB]')}
                        style={{ borderColor: isSelected ? '#2563EB' : 'var(--border-subtle)' }}
                        aria-label={isSelected ? `Deselect ${campaign.name}` : `Select ${campaign.name}`}
                        type="button"
                      >
                        {isSelected && <Check size={10} className="text-white" aria-hidden="true" />}
                      </button>
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PLATFORM_COLORS[campaign.platform] }} />
                        <span className="text-[13px] font-medium truncate max-w-[180px]" style={{ color: 'var(--text-primary)' }}>{campaign.name}</span>
                      </div>
                    </td>
                    <td className="px-3"><PlatformBadge platform={campaign.platform} /></td>
                    <td className="px-3"><StatusBadge status={campaign.status} /></td>
                    <td className="px-3"><span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{campaign.objective}</span></td>
                    <td className="px-3">
                      <span className="font-mono-data text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(campaign.budget)}</span>
                      <span className="text-[10px] ml-1" style={{ color: 'var(--text-tertiary)' }}>{campaign.budgetType.toLowerCase()}</span>
                    </td>
                    <td className="px-3"><span className="font-mono-data text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(campaign.spend)}</span></td>
                    <td className="px-3"><span className="font-mono-data text-[12px]" style={{ color: 'var(--text-secondary)' }}>{formatNumber(campaign.impressions)}</span></td>
                    <td className="px-3"><span className="font-mono-data text-[12px]" style={{ color: 'var(--text-secondary)' }}>{formatNumber(campaign.clicks)}</span></td>
                    <td className="px-3">
                      <span className="font-mono-data text-[12px] font-medium" style={{ color: (campaign.ctr ?? 0) > 2 ? '#10B981' : (campaign.ctr ?? 0) < 1 ? '#F59E0B' : 'var(--text-secondary)' }}>
                        {formatPercent(campaign.ctr)}
                      </span>
                    </td>
                    <td className="px-3"><span className="font-mono-data text-[12px]" style={{ color: 'var(--text-secondary)' }}>{formatNumber(campaign.conversions)}</span></td>
                    <td className="px-3"><span className="font-mono-data text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(campaign.cpa)}</span></td>
                    <td className="px-3">
                      <span className="font-mono-data text-[12px] font-bold" style={{ color: (campaign.roas ?? 0) > 3 ? '#10B981' : (campaign.roas ?? 0) >= 2 ? 'var(--text-primary)' : (campaign.roas ?? 0) > 0 ? '#F59E0B' : 'var(--text-tertiary)' }}>
                        {campaign.roas !== null ? campaign.roas.toFixed(1) + 'x' : '---'}
                      </span>
                    </td>
                    <td className="px-2 relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === campaign.id ? null : campaign.id)}
                        className="p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/40"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        aria-label={`Open actions menu for ${campaign.name}`}
                        aria-expanded={openMenuId === campaign.id}
                        type="button"
                      >
                        <MoreVertical size={14} aria-hidden="true" />
                      </button>
                      <AnimatePresence>
                        {openMenuId === campaign.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-2 top-10 z-30 w-40 rounded-lg py-1.5 shadow-xl"
                            style={{ background: '#1a1a1a', border: '1px solid var(--border-subtle)' }}
                          >
                            <button onClick={() => { onAction('view', campaign); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-white/5" style={{ color: 'var(--text-primary)' }}><Eye size={13} /> View</button>
                            <button onClick={() => { onAction('edit', campaign); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-white/5" style={{ color: 'var(--text-primary)' }}><Edit size={13} /> Edit</button>
                            <button onClick={() => { onAction(campaign.status === 'Active' ? 'pause' : 'resume', campaign); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-white/5" style={{ color: 'var(--text-primary)' }}>{campaign.status === 'Active' ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Resume</>}</button>
                            <button onClick={() => { onAction('duplicate', campaign); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-white/5" style={{ color: 'var(--text-primary)' }}><Copy size={13} /> Duplicate</button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {openMenuId && <div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />}
    </div>
  );
}

/* ============================================================
   GRID VIEW
   ============================================================ */

function GridView({ campaigns, selectedIds, isLoading, error, onRetry, onToggleSelect, onAction }: {
  campaigns: Campaign[]; selectedIds: Set<string>; isLoading: boolean; error: string | null; onRetry: () => void;
  onToggleSelect: (id: string) => void; onAction: (action: string, campaign: Campaign) => void;
}) {
  if (error) {
    return (
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div className="h-4 rounded bg-white/5 w-3/4 mb-3" />
            <div className="h-3 rounded bg-white/5 w-1/2 mb-4" />
            <div className="h-16 rounded bg-white/5 mb-3" />
            <div className="grid grid-cols-3 gap-2"><div className="h-8 rounded bg-white/5" /><div className="h-8 rounded bg-white/5" /><div className="h-8 rounded bg-white/5" /></div>
          </div>
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Search size={32} style={{ color: 'var(--text-muted)' }} />
        <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>No campaigns found</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {campaigns.map((campaign, i) => {
        const isSelected = selectedIds.has(campaign.id);
        const sparkData = [campaign.spend * 0.2, campaign.spend * 0.35, campaign.spend * 0.5, campaign.spend * 0.7, campaign.spend * 0.6, campaign.spend * 0.85, campaign.spend * 0.9, campaign.spend];
        return (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            className="rounded-xl p-4 transition-colors cursor-pointer group relative"
            style={{
              background: isSelected ? 'rgba(37,99,235,0.05)' : 'var(--bg-elevated)',
              border: isSelected ? '1px solid rgba(37,99,235,0.3)' : '1px solid var(--border-subtle)',
            }}
            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => onToggleSelect(campaign.id)}
                  className={cn('w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50', isSelected && 'bg-[#2563EB] border-[#2563EB]')}
                  style={{ borderColor: isSelected ? '#2563EB' : 'var(--border-subtle)' }}
                  aria-label={isSelected ? `Deselect ${campaign.name}` : `Select ${campaign.name}`}
                  type="button"
                >
                  {isSelected && <Check size={10} className="text-white" aria-hidden="true" />}
                </button>
                <h3 className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{campaign.name}</h3>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <PlatformBadge platform={campaign.platform} />
              <StatusBadge status={campaign.status} />
            </div>
            <div className="mb-3 flex justify-center"><MiniSparkline values={sparkData} color={PLATFORM_COLORS[campaign.platform]} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Spend</div>
                <div className="font-mono-data text-[12px] font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{formatCurrency(campaign.spend)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>ROAS</div>
                <div className="font-mono-data text-[12px] font-bold mt-0.5" style={{ color: (campaign.roas ?? 0) > 3 ? '#10B981' : 'var(--text-primary)' }}>{campaign.roas !== null ? campaign.roas.toFixed(1) + 'x' : '---'}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>CTR</div>
                <div className="font-mono-data text-[12px] font-semibold mt-0.5" style={{ color: (campaign.ctr ?? 0) > 2 ? '#10B981' : 'var(--text-secondary)' }}>{formatPercent(campaign.ctr)}</div>
              </div>
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" role="group" aria-label={`Actions for ${campaign.name}`}>
              <button onClick={() => onAction('edit', campaign)} className="p-1.5 rounded-md transition-colors focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/40" style={{ color: 'var(--text-secondary)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} aria-label={`Edit ${campaign.name}`} type="button"><Edit size={12} aria-hidden="true" /></button>
              <button onClick={() => onAction('duplicate', campaign)} className="p-1.5 rounded-md transition-colors focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/40" style={{ color: 'var(--text-secondary)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} aria-label={`Duplicate ${campaign.name}`} type="button"><Copy size={12} aria-hidden="true" /></button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ============================================================
   CREATE CAMPAIGN MODAL (using form components + Zod)
   ============================================================ */

const CREATE_STEPS = ['Basics', 'Budget', 'Targeting', 'Review'] as const;

const PLATFORM_SELECT_OPTIONS = PLATFORM_OPTIONS.map((p) => ({ value: p, label: p }));
const OBJECTIVE_SELECT_OPTIONS = OBJECTIVE_OPTIONS.map((o) => ({ value: o, label: o }));
const BID_STRATEGY_OPTIONS = BID_STRATEGIES.map((s) => ({ value: s, label: s }));
const AGE_RANGE_OPTIONS = AGE_RANGES.map((a) => ({ value: a, label: a }));
const GENDER_SELECT_OPTIONS = GENDER_OPTIONS.map((g) => ({ value: g, label: g }));

function CreateCampaignModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (data: ApiCreateCampaignInput) => Promise<void> }) {
  const [step, setStep] = useState(0);

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
    trigger,
    setValue,
  } = useForm<CreateCampaignInput>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: '',
      platform: 'Meta',
      objective: 'Conversions',
      budgetType: 'Daily',
      budget: 100,
      bidStrategy: 'Lowest Cost',
      ageRange: '18-65+',
      gender: 'All',
      locations: ['United States'],
      interests: [],
    },
  });

  const values = watch();

  const handleNext = async () => {
    if (step === 0) {
      const valid = await trigger(['name', 'platform', 'objective']);
      if (!valid) return;
    }
    if (step === 1) {
      const valid = await trigger(['budget', 'bidStrategy']);
      if (!valid) return;
    }
    setStep((s) => Math.min(s + 1, CREATE_STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async (data: CreateCampaignInput) => {
    await onCreate(data as unknown as ApiCreateCampaignInput);
    setStep(0);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
            className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto rounded-xl"
            style={{ background: '#1a1a1a', border: '1px solid var(--border-subtle)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>New Campaign</h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>All campaigns start as drafts for safety</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c3f53b]/40"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Close create campaign modal"
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="px-5 pb-4">
              <div className="flex items-center gap-2">
                {CREATE_STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors"
                      style={{ background: i <= step ? '#2563EB' : 'var(--bg-hover)', color: i <= step ? 'white' : 'var(--text-tertiary)' }}
                    >
                      {i < step ? <Check size={12} /> : i + 1}
                    </div>
                    <span className="text-[11px] font-medium hidden sm:block" style={{ color: i <= step ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{s}</span>
                    {i < CREATE_STEPS.length - 1 && <div className="flex-1 h-px" style={{ background: i < step ? '#2563EB' : 'var(--border-subtle)' }} />}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="px-5 pb-5 space-y-4">
                {/* STEP 0: Basics */}
                {step === 0 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                    <div className="space-y-4">
                      <FormSection title="Campaign Details" description="Enter the basic information for your campaign" />

                      <TextInput
                        label="Campaign Name"
                        name="name"
                        type="text"
                        placeholder="e.g., Summer Sale 2026"
                        register={register}
                        error={errors.name?.message}
                        required
                        disabled={isSubmitting}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <Controller
                          name="platform"
                          control={control}
                          render={({ field }) => (
                            <SelectField
                              label="Platform"
                              name="platform"
                              options={PLATFORM_SELECT_OPTIONS}
                              value={field.value}
                              onChange={field.onChange}
                              error={errors.platform?.message}
                              required
                              disabled={isSubmitting}
                            />
                          )}
                        />
                        <Controller
                          name="objective"
                          control={control}
                          render={({ field }) => (
                            <SelectField
                              label="Objective"
                              name="objective"
                              options={OBJECTIVE_SELECT_OPTIONS}
                              value={field.value}
                              onChange={field.onChange}
                              error={errors.objective?.message}
                              required
                              disabled={isSubmitting}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 1: Budget */}
                {step === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                    <div className="space-y-4">
                      <FormSection title="Budget Settings" description="Set your campaign budget and bidding strategy" />

                      <div>
                        <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Budget Type</label>
                        <Controller
                          name="budgetType"
                          control={control}
                          render={({ field }: { field: { value: 'Daily' | 'Lifetime'; onChange: (v: 'Daily' | 'Lifetime') => void } }) => (
                            <div className="flex gap-2">
                              {(['Daily', 'Lifetime'] as const).map((bt) => (
                                <button
                                  key={bt}
                                  type="button"
                                  onClick={() => field.onChange(bt)}
                                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                                  style={{
                                    background: field.value === bt ? '#2563EB' : 'var(--bg-hover)',
                                    color: field.value === bt ? 'white' : 'var(--text-secondary)',
                                    border: field.value === bt ? 'none' : '1px solid var(--border-subtle)',
                                  }}
                                >
                                  {field.value === bt && <Check size={14} />}{bt}
                                </button>
                              ))}
                            </div>
                          )}
                        />
                      </div>

                      <Controller
                        name="budget"
                        control={control}
                        render={({ field }) => (
                          <TextInput
                            label="Budget Amount"
                            name="budget"
                            type="number"
                            placeholder="500"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                            error={errors.budget?.message}
                            required
                            disabled={isSubmitting}
                          />
                        )}
                      />

                      <Controller
                        name="bidStrategy"
                        control={control}
                        render={({ field }) => (
                          <SelectField
                            label="Bid Strategy"
                            name="bidStrategy"
                            options={BID_STRATEGY_OPTIONS}
                            value={field.value}
                            onChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        )}
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Targeting */}
                {step === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                    <div className="space-y-4">
                      <FormSection title="Audience Targeting" description="Define who will see your campaign" />

                      <div className="grid grid-cols-2 gap-3">
                        <Controller
                          name="ageRange"
                          control={control}
                          render={({ field }) => (
                            <SelectField
                              label="Age Range"
                              name="ageRange"
                              options={AGE_RANGE_OPTIONS}
                              value={field.value}
                              onChange={field.onChange}
                              disabled={isSubmitting}
                            />
                          )}
                        />
                        <Controller
                          name="gender"
                          control={control}
                          render={({ field }) => (
                            <SelectField
                              label="Gender"
                              name="gender"
                              options={GENDER_SELECT_OPTIONS}
                              value={field.value}
                              onChange={field.onChange}
                              disabled={isSubmitting}
                            />
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Locations</label>
                        <Controller
                          name="locations"
                          control={control}
                          render={({ field }: { field: { value: string[]; onChange: (v: string[]) => void } }) => (
                            <input
                              value={field.value?.join(', ')}
                              onChange={(e) => field.onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                              type="text"
                              placeholder="United States, Canada, UK"
                              className="w-full h-10 px-3 rounded-lg text-sm outline-none border border-white/10 bg-[#1a1a1a] text-white placeholder:text-white/25 focus:border-[#c3f53b] focus:ring-1 focus:ring-[#c3f53b]/20 transition-all"
                              disabled={isSubmitting}
                            />
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Interests</label>
                        <Controller
                          name="interests"
                          control={control}
                          render={({ field }: { field: { value: string[]; onChange: (v: string[]) => void } }) => (
                            <div className="flex flex-wrap gap-2">
                              {INTEREST_OPTIONS.map((interest) => {
                                const selected = field.value?.includes(interest);
                                return (
                                  <button
                                    key={interest}
                                    type="button"
                                    onClick={() => { field.onChange(selected ? field.value?.filter((v) => v !== interest) : [...(field.value || []), interest]); }}
                                    className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all"
                                    style={{ background: selected ? '#2563EB' : 'var(--bg-hover)', color: selected ? 'white' : 'var(--text-secondary)', border: selected ? 'none' : '1px solid var(--border-subtle)' }}
                                  >
                                    {interest}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Review */}
                {step === 3 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                    <div className="rounded-lg p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center justify-between"><span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Campaign Name</span><span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{values.name}</span></div>
                      <div className="flex items-center justify-between"><span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Platform</span><span className="flex items-center gap-1"><PlatformIcon platform={values.platform} size={12} /><span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{values.platform}</span></span></div>
                      <div className="flex items-center justify-between"><span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Objective</span><span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{values.objective}</span></div>
                      <div className="h-px" style={{ background: 'var(--border-subtle)' }} />
                      <div className="flex items-center justify-between"><span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Budget</span><span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>${values.budget} {values.budgetType.toLowerCase()}</span></div>
                      <div className="flex items-center justify-between"><span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Bid Strategy</span><span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{values.bidStrategy}</span></div>
                      <div className="h-px" style={{ background: 'var(--border-subtle)' }} />
                      <div className="flex items-center justify-between"><span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Targeting</span><span className="text-[13px] font-medium text-right" style={{ color: 'var(--text-primary)' }}>{values.gender}, {values.ageRange}</span></div>
                      <div className="flex items-center justify-between"><span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Locations</span><span className="text-[12px] font-medium text-right" style={{ color: 'var(--text-primary)' }}>{values.locations?.join(', ')}</span></div>
                      {values.interests && values.interests.length > 0 && (
                        <div className="flex items-center justify-between"><span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Interests</span><span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{values.interests.join(', ')}</span></div>
                      )}
                      <div className="mt-3 p-2.5 rounded-lg flex items-center gap-2" style={{ background: 'rgba(59,130,246,0.1)' }}>
                        <AlertTriangle size={14} style={{ color: '#3B82F6' }} />
                        <span className="text-[11px] font-medium" style={{ color: '#3B82F6' }}>This campaign will be created as a DRAFT. Review and activate later.</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 pt-2">
                  {step > 0 && (
                    <SubmitButton
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={handleBack}
                      fullWidth={false}
                    >
                      Back
                    </SubmitButton>
                  )}
                  {step < CREATE_STEPS.length - 1 ? (
                    <SubmitButton
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={handleNext}
                      className="flex-1 !bg-[#2563EB]"
                    >
                      Continue
                    </SubmitButton>
                  ) : (
                    <SubmitButton
                      type="submit"
                      loading={isSubmitting}
                      disabled={isSubmitting}
                      variant="primary"
                      size="md"
                      className="flex-1 !bg-[#2563EB]"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Campaign'}
                    </SubmitButton>
                  )}
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   MAIN CAMPAIGNS PAGE
   ============================================================ */

export default function Campaigns() {
  const { toast } = useToast();
  const realtime = useRealtime({ enabled: true });
  const {
    campaigns, total, page, limit, totalPages, isLoading, isCreating,
    filters, selectedIds, viewMode,
    setFilters, setPage, setViewMode, toggleSelection, setSelectedIds, clearSelection,
    setCampaigns, setLoading, setCreating,
  } = useCampaignStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CampaignSummaryData | null>(null);
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);

  /* ---- Debounced search (300ms) ---- */
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      const next = searchInput.trim();
      const curr = (filters.search || '').trim();
      if (next !== curr) {
        setFilters({ search: next || undefined });
        setPage(1);
      }
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchInput, setFilters, setPage]);

  /* ---- Fetch campaigns from API ---- */
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await campaignsApi.list({
        search: filters.search || undefined,
        platform: filters.platform === 'all' ? undefined : filters.platform,
        status: filters.status === 'all' ? undefined : filters.status,
        sortBy: sortKey || undefined,
        sortDir: sortDir || 'desc',
        page,
        limit,
      });
      setCampaigns(res.data, res.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load campaigns. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters, sortKey, sortDir, page, limit, setLoading, setCampaigns]);

  /* ---- Fetch summary ---- */
  const fetchSummary = useCallback(async () => {
    setIsFetchingSummary(true);
    try {
      const data = await campaignsApi.summary();
      setSummary(data);
    } catch (err) {
      console.warn('Failed to fetch summary:', err);
    } finally {
      setIsFetchingSummary(false);
    }
  }, []);

  /* ---- Initial fetch + refetch on filter/sort/page changes ---- */
  useEffect(() => {
    fetchCampaigns();
    fetchSummary();
  }, [fetchCampaigns, fetchSummary]);

  /* ---- Listen to real-time campaign updates ---- */
  useEffect(() => {
    const handler = () => {
      fetchCampaigns();
      fetchSummary();
    };
    window.addEventListener('invalidate:campaigns', handler);
    return () => window.removeEventListener('invalidate:campaigns', handler);
  }, [fetchCampaigns, fetchSummary]);

  /* ---- Sort ---- */
  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  /* ---- Selection ---- */
  const handleToggleSelect = useCallback((id: string) => toggleSelection(id), [toggleSelection]);
  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.size === campaigns.length && campaigns.length > 0) clearSelection();
    else setSelectedIds(new Set(campaigns.map((c: Campaign) => c.id)));
  }, [campaigns, selectedIds.size, clearSelection, setSelectedIds]);

  /* ---- Row actions ---- */
  const handleAction = useCallback(async (action: string, campaign: Campaign) => {
    switch (action) {
      case 'view':
        toast({ title: campaign.name, description: `Platform: ${campaign.platform} | Status: ${campaign.status}`, variant: 'info' });
        break;
      case 'edit': {
        try {
          await campaignsApi.update(campaign.id, { status: 'Draft' });
          toast({ title: 'Edit draft created for approval', description: `A draft edit for "${campaign.name}" has been submitted for review.`, variant: 'success' });
          fetchCampaigns();
          fetchSummary();
        } catch { toast({ title: 'Failed to create edit draft', variant: 'destructive' }); }
        break;
      }
      case 'pause': {
        try {
          await campaignsApi.update(campaign.id, { status: 'Draft' });
          toast({ title: 'Pause draft created for approval', description: `A draft to pause "${campaign.name}" has been submitted for review.`, variant: 'success' });
          fetchCampaigns();
          fetchSummary();
        } catch { toast({ title: 'Failed to pause campaign', variant: 'destructive' }); }
        break;
      }
      case 'resume': {
        try {
          await campaignsApi.update(campaign.id, { status: 'Active' });
          toast({ title: 'Resume draft created for approval', description: `A draft to resume "${campaign.name}" has been submitted for review.`, variant: 'success' });
          fetchCampaigns();
          fetchSummary();
        } catch { toast({ title: 'Failed to resume campaign', variant: 'destructive' }); }
        break;
      }
      case 'duplicate': {
        try {
          await campaignsApi.duplicate(campaign.id);
          toast({ title: 'Campaign duplicated', description: `Draft copy of "${campaign.name}" created.`, variant: 'success' });
          fetchCampaigns();
          fetchSummary();
        } catch { toast({ title: 'Failed to duplicate campaign', variant: 'destructive' }); }
        break;
      }
    }
  }, [toast, fetchCampaigns, fetchSummary]);

  /* ---- Create campaign ---- */
  const handleCreate = useCallback(async (data: ApiCreateCampaignInput) => {
    setCreating(true);
    try {
      await campaignsApi.create(data);
      toast({ title: 'Draft created for approval', description: `"${data.name}" has been created as a draft. Review and activate when ready.`, variant: 'success' });
      fetchCampaigns();
      fetchSummary();
    } catch {
      toast({ title: 'Failed to create campaign', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }, [fetchCampaigns, fetchSummary, setCreating, toast]);

  /* ---- Bulk actions ---- */
  const handleBulkPause = async () => {
    try {
      await campaignsApi.bulkPause(Array.from(selectedIds));
      toast({ title: 'Pause drafts created for approval', description: `${selectedIds.size} campaign(s) submitted for review.`, variant: 'success' });
      clearSelection(); fetchCampaigns(); fetchSummary();
    } catch { toast({ title: 'Failed to pause campaigns', variant: 'destructive' }); }
  };

  const handleBulkDuplicate = async () => {
    try {
      await campaignsApi.bulkDuplicate(Array.from(selectedIds));
      toast({ title: 'Campaigns duplicated', description: `${selectedIds.size} campaign(s) duplicated as drafts.`, variant: 'success' });
      clearSelection(); fetchCampaigns(); fetchSummary();
    } catch { toast({ title: 'Failed to duplicate campaigns', variant: 'destructive' }); }
  };

  const handleBulkExport = async () => {
    try {
      const csv = await campaignsApi.export(Array.from(selectedIds));
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaigns-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export complete', description: `${selectedIds.size} campaign(s) exported to CSV.`, variant: 'success' });
      clearSelection();
    } catch { toast({ title: 'Failed to export campaigns', variant: 'destructive' }); }
  };

  const platformTabs = ['All', ...PLATFORM_OPTIONS] as const;
  const statusOptions = ['All', ...STATUS_OPTIONS] as const;

  return (
    <>
    <SEO
      title="Campaigns"
      description="Create, manage, and optimize advertising campaigns across Meta, Google, TikTok, and more. Launch AI-optimized campaigns with intelligent targeting."
      keywords="campaign management, ad campaigns, PPC campaigns, social media campaigns, campaign creation"
    />
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto min-h-screen">
      {/* ===== Header ===== */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-space text-[26px] sm:text-[28px] font-semibold" style={{ color: 'var(--text-primary)' }}>Campaigns</h1>
            <span className="inline-flex items-center px-2.5 h-5 rounded-full text-[11px] font-medium" style={{ background: 'var(--bg-hover)', color: 'var(--text-tertiary)' }}>{isFetchingSummary ? '...' : (summary?.totalCampaigns ?? total)}</span>
            {/* Realtime indicator */}
            <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full text-[10px] font-medium" style={{ background: realtime.connected ? 'rgba(16,185,129,0.1)' : 'rgba(120,120,120,0.1)', color: realtime.connected ? '#10B981' : '#9CA3AF' }}>
              {realtime.connected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {realtime.connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            disabled={isCreating}
            className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#2563EB' }}
          >
            <Plus size={16} />{isCreating ? 'Creating...' : 'New Campaign'}
          </button>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {[
              { label: 'Total Spend', value: formatCurrency(summary.totalSpend) },
              { label: 'Active', value: String(summary.activeCampaigns) },
              { label: 'Impressions', value: formatNumber(summary.totalImpressions) },
              { label: 'Clicks', value: formatNumber(summary.totalClicks) },
              { label: 'Conversions', value: formatNumber(summary.totalConversions) },
              { label: 'Avg ROAS', value: summary.avgRoas ? summary.avgRoas.toFixed(1) + 'x' : '---' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</div>
                <div className="font-mono-data text-[13px] font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg text-sm outline-none transition-all focus:border-[#2563EB]/50"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Platform tabs */}
          <div className="flex items-center gap-1">
            {platformTabs.map((p) => (
              <button
                key={p}
                onClick={() => { setFilters({ platform: p }); setPage(1); }}
                className="h-8 px-3 rounded-full text-[11px] font-semibold transition-all inline-flex items-center gap-1.5"
                style={{
                  background: filters.platform === p ? (p === 'All' ? '#2563EB' : PLATFORM_COLORS[p as Campaign['platform']] + '30') : 'transparent',
                  color: filters.platform === p ? (p === 'All' ? 'white' : PLATFORM_COLORS[p as Campaign['platform']]) : 'var(--text-secondary)',
                  border: filters.platform === p ? 'none' : '1px solid var(--border-subtle)',
                }}
              >
                {p !== 'All' && <span className="w-1.5 h-1.5 rounded-full" style={{ background: PLATFORM_COLORS[p as Campaign['platform']] }} />}{p}
              </button>
            ))}
          </div>

          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="h-8 px-3 rounded-full text-[11px] font-semibold transition-all inline-flex items-center gap-1.5"
              style={{ background: filters.status && filters.status !== 'All' ? (STATUS_COLORS[filters.status]?.bg || 'transparent') : 'transparent', color: filters.status && filters.status !== 'All' ? (STATUS_COLORS[filters.status]?.text || 'var(--text-secondary)') : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              {filters.status && filters.status !== 'All' && <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[filters.status]?.dot || 'var(--text-tertiary)' }} />}
              {filters.status || 'All'}<ChevronDown size={10} />
            </button>
            <AnimatePresence>
              {statusDropdownOpen && (
                <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }} transition={{ duration: 0.1 }}
                  className="absolute top-10 left-0 z-30 w-36 rounded-lg py-1.5 shadow-xl" style={{ background: '#1a1a1a', border: '1px solid var(--border-subtle)' }}>
                  {statusOptions.map((s) => (
                    <button key={s} onClick={() => { setFilters({ status: s }); setStatusDropdownOpen(false); setPage(1); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-white/5" style={{ color: filters.status === s ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {s !== 'All' && <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[s]?.dot || 'var(--text-tertiary)' }} />}{s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center rounded-lg p-0.5" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40', viewMode === 'list' && 'bg-[#2563EB] text-white')}
              style={{ color: viewMode === 'list' ? 'white' : 'var(--text-secondary)' }}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              type="button"
            >
              <LayoutList size={14} aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40', viewMode === 'grid' && 'bg-[#2563EB] text-white')}
              style={{ color: viewMode === 'grid' ? 'white' : 'var(--text-secondary)' }}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              type="button"
            >
              <LayoutGrid size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ===== Bulk Actions Bar ===== */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3 h-auto min-h-[44px] px-4 py-2 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(37,99,235,0.3)' }}>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedIds.size} selected</span>
                <div className="flex items-center gap-2">
                  <button onClick={handleBulkPause} className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-all hover:opacity-80" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}><Pause size={13} /> Pause</button>
                  <button onClick={handleBulkDuplicate} className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-all hover:opacity-80" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}><Copy size={13} /> Duplicate</button>
                  <button onClick={handleBulkExport} className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-all hover:opacity-80" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}><Download size={13} /> Export CSV</button>
                </div>
              </div>
              <button onClick={clearSelection} className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80" style={{ color: 'var(--text-secondary)' }}><X size={13} /> Clear</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Main Content ===== */}
      {viewMode === 'list' ? (
        <ListView campaigns={campaigns} selectedIds={selectedIds} sortKey={sortKey} sortDir={sortDir} isLoading={isLoading} error={error} onRetry={fetchCampaigns} onSort={handleSort} onToggleSelect={handleToggleSelect} onToggleSelectAll={handleToggleSelectAll} onAction={handleAction} />
      ) : (
        <GridView campaigns={campaigns} selectedIds={selectedIds} isLoading={isLoading} error={error} onRetry={fetchCampaigns} onToggleSelect={handleToggleSelect} onAction={handleAction} />
      )}

      {/* ===== Pagination ===== */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded-md transition-all disabled:opacity-30" style={{ color: 'var(--text-secondary)' }}><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1;
              const isActive = pageNum === page;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)} className="w-7 h-7 rounded-md text-[12px] font-medium transition-all"
                  style={{ background: isActive ? '#2563EB' : 'transparent', color: isActive ? 'white' : 'var(--text-secondary)' }}>
                  {pageNum}
                </button>
              );
            })}
            <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded-md transition-all disabled:opacity-30" style={{ color: 'var(--text-secondary)' }}><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* ===== Create Campaign Modal ===== */}
      <CreateCampaignModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreate} />
    </div>
    </>
  );
}
