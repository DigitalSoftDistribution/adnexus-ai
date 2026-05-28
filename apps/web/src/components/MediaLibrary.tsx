import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Trash2,
  FileImage,
  FileVideo,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  Type,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import axios from 'axios';

// ─── Types ───────────────────────────────────────────────────────

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  size: number;
  created_at: string;
  thumbnail_url?: string;
  metadata?: Record<string, any>;
}

interface MediaLibraryProps {
  /** API base URL */
  apiBaseUrl?: string;
  /** Auth token for API requests */
  authToken?: string;
  /** Callback when user selects asset(s) */
  onSelect?: (assets: MediaAsset[]) => void;
  /** Enable multi-select (default: true) */
  multiSelect?: boolean;
  /** Pre-selected asset IDs */
  selectedIds?: string[];
  /** Maximum number of selectable assets */
  maxSelect?: number;
  /** Show select button (default: true) */
  showSelectButton?: boolean;
  /** Additional className */
  className?: string;
  /** Refresh trigger */
  refreshKey?: number;
}

interface FilterState {
  search: string;
  type: 'all' | 'image' | 'video';
  dateRange: 'all' | 'today' | 'week' | 'month';
  sortBy: 'newest' | 'oldest' | 'name' | 'size';
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDateRangeStart(range: FilterState['dateRange']): Date | null {
  const now = new Date();
  switch (range) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo;
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo;
    default:
      return null;
  }
}

const ITEMS_PER_PAGE = 20;

// ─── Component ───────────────────────────────────────────────────

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  apiBaseUrl = '',
  authToken,
  onSelect,
  multiSelect = true,
  selectedIds = [],
  maxSelect,
  showSelectButton = true,
  className = '',
  refreshKey = 0,
}) => {
  // ── State ──────────────────────────────────────────────────────

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'all',
    dateRange: 'all',
    sortBy: 'newest',
  });
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // ── Load data ──────────────────────────────────────────────────

  useEffect(() => {
    setSelected(new Set(selectedIds));
  }, [selectedIds]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${apiBaseUrl}/uploads`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      setAssets(response.data?.data || response.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load media library');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authToken]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets, refreshKey]);

  // ── Filtering & Sorting ────────────────────────────────────────

  const filteredAssets = useMemo(() => {
    let result = [...assets];

    // Search by name
    if (filters.search.trim()) {
      const term = filters.search.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(term));
    }

    // Filter by type
    if (filters.type !== 'all') {
      result = result.filter((a) => a.type === filters.type);
    }

    // Filter by date range
    const dateStart = getDateRangeStart(filters.dateRange);
    if (dateStart) {
      result = result.filter((a) => new Date(a.created_at) >= dateStart);
    }

    // Sort
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.size - a.size;
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [assets, filters]);

  // ── Pagination ─────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / ITEMS_PER_PAGE));
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAssets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAssets, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // ── Selection ──────────────────────────────────────────────────

  const toggleSelect = useCallback(
    (asset: MediaAsset) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(asset.id)) {
          next.delete(asset.id);
        } else {
          if (!multiSelect) {
            return new Set([asset.id]);
          }
          if (maxSelect && next.size >= maxSelect) {
            return prev; // max reached
          }
          next.add(asset.id);
        }
        return next;
      });
    },
    [multiSelect, maxSelect]
  );

  const handleSelectClick = useCallback(() => {
    const selectedAssets = assets.filter((a) => selected.has(a.id));
    onSelect?.(selectedAssets);
  }, [assets, selected, onSelect]);

  // ── Delete ─────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await axios.delete(`${apiBaseUrl}/uploads/${id}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        setAssets((prev) => prev.filter((a) => a.id !== id));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setDeleteConfirm(null);
        if (previewAsset?.id === id) setPreviewAsset(null);
      } catch (err: any) {
        alert(err?.response?.data?.message || 'Failed to delete asset');
      } finally {
        setDeletingId(null);
      }
    },
    [apiBaseUrl, authToken, previewAsset]
  );

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className={`w-full ${className}`}>
      {/* ── Header: Search + Filters ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by file name..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {filters.search && (
            <button
              onClick={() => setFilters((f) => ({ ...f, search: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`
            flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl border transition-all
            ${showFilters
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }
          `}
        >
          <Filter size={14} />
          Filters
        </button>

        {selected.size > 0 && showSelectButton && (
          <button
            onClick={handleSelectClick}
            className="flex items-center gap-2 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Check size={14} />
            Use Selected ({selected.size})
          </button>
        )}
      </div>

      {/* ── Filter Panel ───────────────────────────────────────── */}
      {showFilters && (
        <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap gap-4">
          {/* Type filter */}
          <div className="flex items-center gap-2">
            <Type size={14} className="text-gray-400" />
            <select
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as FilterState['type'] }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
            </select>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-400" />
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters((f) => ({ ...f, dateRange: e.target.value as FilterState['dateRange'] }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Sort:</span>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value as FilterState['sortBy'] }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
              <option value="size">Size (Largest)</option>
            </select>
          </div>

          {/* Clear filters */}
          <button
            onClick={() =>
              setFilters({ search: '', type: 'all', dateRange: 'all', sortBy: 'newest' })
            }
            className="text-xs text-gray-500 hover:text-red-500 transition-colors ml-auto"
          >
            Reset all
          </button>
        </div>
      )}

      {/* ── Results Count ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {filteredAssets.length} {filteredAssets.length === 1 ? 'asset' : 'assets'}
          {filteredAssets.length !== assets.length && (
            <span className="text-gray-400"> (of {assets.length})</span>
          )}
        </p>
      </div>

      {/* ── Loading State ──────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      )}

      {/* ── Error State ────────────────────────────────────────── */}
      {!loading && error && (
        <div className="text-center py-16">
          <AlertTriangle size={32} className="mx-auto mb-3 text-red-400" />
          <p className="text-sm text-gray-600 mb-2">{error}</p>
          <button
            onClick={fetchAssets}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Empty State ────────────────────────────────────────── */}
      {!loading && !error && filteredAssets.length === 0 && (
        <div className="text-center py-16">
          <Search size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 mb-1">No assets found</p>
          <p className="text-xs text-gray-400">
            {assets.length > 0
              ? 'Try adjusting your filters'
              : 'Upload files to see them here'}
          </p>
        </div>
      )}

      {/* ── Asset Grid ─────────────────────────────────────────── */}
      {!loading && !error && filteredAssets.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {paginatedAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                isSelected={selected.has(asset.id)}
                isDeleting={deletingId === asset.id}
                onToggleSelect={() => toggleSelect(asset)}
                onPreview={() => setPreviewAsset(asset)}
                onDelete={() => setDeleteConfirm(asset.id)}
                multiSelect={multiSelect}
              />
            ))}
          </div>

          {/* ── Pagination ─────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm text-gray-500 px-3">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Preview Modal ──────────────────────────────────────── */}
      {previewAsset && (
        <PreviewModal
          asset={previewAsset}
          onClose={() => setPreviewAsset(null)}
          onDelete={() => setDeleteConfirm(previewAsset.id)}
          isSelected={selected.has(previewAsset.id)}
          onToggleSelect={() => toggleSelect(previewAsset)}
        />
      )}

      {/* ── Delete Confirmation ────────────────────────────────── */}
      {deleteConfirm && (
        <DeleteConfirmModal
          assetName={assets.find((a) => a.id === deleteConfirm)?.name || ''}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          isDeleting={deletingId === deleteConfirm}
        />
      )}
    </div>
  );
};

// ─── Asset Card Sub-component ────────────────────────────────────

const AssetCard: React.FC<{
  asset: MediaAsset;
  isSelected: boolean;
  isDeleting: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onDelete: () => void;
  multiSelect: boolean;
}> = ({ asset, isSelected, isDeleting, onToggleSelect, onPreview, onDelete, multiSelect }) => {
  const isVideo = asset.type === 'video';
  const Icon = isVideo ? FileVideo : FileImage;

  return (
    <div
      className={`
        group relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all
        ${isSelected
          ? 'border-blue-500 shadow-md shadow-blue-100'
          : 'border-transparent hover:border-gray-200 hover:shadow-sm'
        }
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      {/* Selection checkbox */}
      {multiSelect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={`
            absolute top-2 left-2 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center
            transition-all
            ${isSelected
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'bg-white/80 border-gray-300 text-transparent group-hover:border-gray-400'
            }
          `}
        >
          <Check size={12} strokeWidth={3} />
        </button>
      )}

      {/* Thumbnail */}
      <div
        className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden"
        onClick={onPreview}
      >
        {asset.thumbnail_url || asset.url ? (
          <img
            src={asset.thumbnail_url || asset.url}
            alt={asset.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Icon size={28} className="text-gray-300" />
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-medium text-gray-700 truncate">{asset.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-gray-400">{formatBytes(asset.size)}</span>
          <span className="text-[10px] text-gray-400">{formatDate(asset.created_at)}</span>
        </div>
      </div>

      {/* Delete button (hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="
          absolute top-2 right-2 z-10 p-1.5 rounded-lg
          bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100
          hover:bg-red-50 hover:text-red-500 transition-all
        "
        title="Delete"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
};

// ─── Preview Modal ───────────────────────────────────────────────

const PreviewModal: React.FC<{
  asset: MediaAsset;
  onClose: () => void;
  onDelete: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}> = ({ asset, onClose, onDelete, isSelected, onToggleSelect }) => {
  const isVideo = asset.type === 'video';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-3xl max-h-[90vh] w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Media */}
        <div className="flex items-center justify-center bg-gray-900 max-h-[60vh] overflow-hidden">
          {isVideo ? (
            <video
              src={asset.url}
              controls
              className="max-w-full max-h-[60vh]"
              poster={asset.thumbnail_url}
            />
          ) : (
            <img
              src={asset.url}
              alt={asset.name}
              className="max-w-full max-h-[60vh] object-contain"
            />
          )}
        </div>

        {/* Info + Actions */}
        <div className="p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">{asset.name}</h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
            <span className="capitalize bg-gray-100 px-2 py-0.5 rounded-md text-xs">{asset.type}</span>
            <span>{formatBytes(asset.size)}</span>
            <span>Uploaded {formatDate(asset.created_at)}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSelect}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${isSelected
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {isSelected ? <Check size={14} /> : <span className="w-3.5 h-3.5 rounded border-2 border-gray-400" />}
              {isSelected ? 'Selected' : 'Select for Use'}
            </button>
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
              download
            >
              Download
            </a>
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-auto"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Confirmation Modal ───────────────────────────────────

const DeleteConfirmModal: React.FC<{
  assetName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}> = ({ assetName, onConfirm, onCancel, isDeleting }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">Delete Asset?</h4>
            <p className="text-xs text-gray-500">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg truncate">
          <span className="font-medium">{assetName}</span> will be permanently deleted.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="
              flex-1 px-4 py-2.5 text-sm text-white bg-red-600 rounded-xl
              hover:bg-red-700 disabled:opacity-50 transition-colors
              flex items-center justify-center gap-2
            "
          >
            {isDeleting && <Loader2 size={12} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaLibrary;
