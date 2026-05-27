// @ts-nocheck
import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, FileImage, FileVideo, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import axios from 'axios';

// ─── Types ───────────────────────────────────────────────────────

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  size: number;
  created_at: string;
  thumbnail_url?: string;
}

interface UploadQueueItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  uploadedFile?: UploadedFile;
}

interface CreativeUploaderProps {
  /** API base URL */
  apiBaseUrl?: string;
  /** Auth token for API requests */
  authToken?: string;
  /** Callback when uploads complete */
  onUploadComplete?: (files: UploadedFile[]) => void;
  /** Callback when user cancels */
  onCancel?: () => void;
  /** Maximum file size in MB (default: 50) */
  maxFileSizeMB?: number;
  /** Accepted MIME types */
  accept?: string[];
  /** Allow multiple files (default: true) */
  multiple?: boolean;
  /** Additional className */
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────

const DEFAULT_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'video/mp4',
  'video/quicktime',
];

const ACCEPT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

const MAX_FILE_SIZE_MB = 50;
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for progress simulation

// ─── Helpers ─────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function getFileType(mime: string): 'image' | 'video' {
  return mime.startsWith('image/') ? 'image' : 'video';
}

function getAcceptExtensions(accept: string[]): string {
  return accept
    .map((m) => ACCEPT_MAP[m])
    .filter(Boolean)
    .join(', ');
}

// ─── Component ───────────────────────────────────────────────────

export const CreativeUploader: React.FC<CreativeUploaderProps> = ({
  apiBaseUrl = '',
  authToken,
  onUploadComplete,
  onCancel,
  maxFileSizeMB = MAX_FILE_SIZE_MB,
  accept = DEFAULT_ACCEPT,
  multiple = true,
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxBytes = maxFileSizeMB * 1024 * 1024;

  // ── File validation ────────────────────────────────────────────

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!accept.includes(file.type)) {
        return `Unsupported file type. Accepted: ${getAcceptExtensions(accept)}`;
      }
      if (file.size > maxBytes) {
        return `File too large (${formatBytes(file.size)}). Max: ${maxFileSizeMB}MB`;
      }
      return null;
    },
    [accept, maxBytes, maxFileSizeMB]
  );

  // ── Add files to queue ─────────────────────────────────────────

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const fileList = Array.from(files);
      const newItems: UploadQueueItem[] = fileList.map((file) => {
        const error = validateFile(file);
        return {
          id: generateId(),
          file,
          progress: 0,
          status: error ? 'error' : 'pending',
          error: error || undefined,
        };
      });
      setQueue((prev) => [...prev, ...newItems]);

      // Auto-start valid uploads
      newItems.forEach((item) => {
        if (!item.error) {
          startUpload(item);
        }
      });
    },
    [validateFile]
  );

  // ── Upload logic ───────────────────────────────────────────────

  const startUpload = useCallback(
    async (item: UploadQueueItem) => {
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' as const } : q))
      );

      try {
        // Generate preview thumbnail for images
        let thumbnailUrl: string | undefined;
        if (getFileType(item.file.type) === 'image') {
          thumbnailUrl = await createImageThumbnail(item.file);
        }

        const formData = new FormData();
        formData.append('file', item.file);
        if (thumbnailUrl) {
          formData.append('thumbnail', thumbnailUrl);
        }

        const response = await axios.post(`${apiBaseUrl}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          onUploadProgress: (event) => {
            const percent = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
            setQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, progress: percent } : q))
            );
          },
        });

        const uploadedFile: UploadedFile = {
          id: response.data.id || generateId(),
          name: item.file.name,
          url: response.data.url || response.data.data?.url,
          type: getFileType(item.file.type),
          size: item.file.size,
          created_at: new Date().toISOString(),
          thumbnail_url: thumbnailUrl || response.data.thumbnail_url,
        };

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'done' as const, progress: 100, uploadedFile }
              : q
          )
        );

        onUploadComplete?.([uploadedFile]);
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: 'error' as const,
                  error: err?.response?.data?.message || 'Upload failed. Please try again.',
                }
              : q
          )
        );
      }
    },
    [apiBaseUrl, authToken, onUploadComplete]
  );

  // ── Thumbnail generation ───────────────────────────────────────

  const createImageThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  // ── Drag & drop handlers ───────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files);
      e.target.value = ''; // reset so same file can be re-selected
    },
    [addFiles]
  );

  // ── Queue management ───────────────────────────────────────────

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((q) => q.status !== 'done'));
  }, []);

  const retryUpload = useCallback(
    (id: string) => {
      const item = queue.find((q) => q.id === id);
      if (item) {
        setQueue((prev) =>
          prev.map((q) => (q.id === id ? { ...q, status: 'pending' as const, progress: 0, error: undefined } : q))
        );
        startUpload({ ...item, status: 'pending', progress: 0, error: undefined });
      }
    },
    [queue, startUpload]
  );

  const completedCount = queue.filter((q) => q.status === 'done').length;
  const errorCount = queue.filter((q) => q.status === 'error').length;
  const uploadingCount = queue.filter((q) => q.status === 'uploading').length;

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className={`w-full max-w-2xl ${className}`}>
      {/* ── Drop Zone ──────────────────────────────────────────── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
          transition-all duration-200 ease-out
          ${isDragOver
            ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-lg shadow-blue-100'
            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept.join(',')}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div
          className={`
            mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center
            transition-colors duration-200
            ${isDragOver ? 'bg-blue-100' : 'bg-gray-100'}
          `}
        >
          <Upload
            size={28}
            className={`transition-colors duration-200 ${isDragOver ? 'text-blue-600' : 'text-gray-400'}`}
          />
        </div>

        <p className="text-sm font-medium text-gray-700 mb-1">
          {isDragOver ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
        </p>
        <p className="text-xs text-gray-400">
          Supports: {getAcceptExtensions(accept)} • Max {maxFileSizeMB}MB per file
        </p>

        {isDragOver && (
          <div className="absolute inset-0 rounded-2xl border-2 border-blue-400 border-dashed animate-pulse pointer-events-none" />
        )}
      </div>

      {/* ── Upload Queue ───────────────────────────────────────── */}
      {queue.length > 0 && (
        <div className="mt-6 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Uploads ({queue.length})</span>
              {completedCount > 0 && (
                <span className="text-green-600 text-xs">{completedCount} completed</span>
              )}
              {errorCount > 0 && (
                <span className="text-red-500 text-xs">{errorCount} failed</span>
              )}
              {uploadingCount > 0 && (
                <span className="text-blue-500 text-xs flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  {uploadingCount} uploading
                </span>
              )}
            </div>
            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear completed
              </button>
            )}
          </div>

          {/* Queue items */}
          {queue.map((item) => (
            <UploadQueueCard
              key={item.id}
              item={item}
              onRemove={removeFromQueue}
              onRetry={retryUpload}
            />
          ))}
        </div>
      )}

      {/* ── Footer Actions ─────────────────────────────────────── */}
      {queue.length > 0 && (
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Upload Queue Card Sub-component ─────────────────────────────

const UploadQueueCard: React.FC<{
  item: UploadQueueItem;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}> = ({ item, onRemove, onRetry }) => {
  const isImage = getFileType(item.file.type) === 'image';
  const Icon = isImage ? FileImage : FileVideo;

  return (
    <div
      className={`
        relative flex items-center gap-3 p-3 rounded-xl border transition-all
        ${item.status === 'error'
          ? 'border-red-200 bg-red-50'
          : item.status === 'done'
            ? 'border-green-200 bg-green-50'
            : 'border-gray-200 bg-white'
        }
      `}
    >
      {/* Thumbnail / Icon */}
      <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
        {item.status === 'done' && item.uploadedFile?.thumbnail_url ? (
          <img
            src={item.uploadedFile.thumbnail_url}
            alt={item.file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon size={20} className="text-gray-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{formatBytes(item.file.size)}</span>
          {item.status === 'done' && (
            <span className="text-xs text-green-600 flex items-center gap-0.5">
              <CheckCircle2 size={10} /> Done
            </span>
          )}
          {item.status === 'error' && (
            <span className="text-xs text-red-500 flex items-center gap-0.5">
              <AlertCircle size={10} /> {item.error}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {item.status === 'uploading' && (
          <div className="mt-1.5">
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${item.progress}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 mt-0.5">{item.progress}%</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1">
        {item.status === 'error' && (
          <button
            onClick={() => onRetry(item.id)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Retry upload"
          >
            <Loader2 size={14} />
          </button>
        )}
        <button
          onClick={() => onRemove(item.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Remove"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default CreativeUploader;
