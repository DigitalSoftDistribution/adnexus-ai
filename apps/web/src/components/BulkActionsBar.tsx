/**
 * BulkActionsBar.tsx
 *
 * A fixed bottom toolbar that appears when 1+ items are selected in a table.
 * Provides bulk actions: Pause, Resume, Duplicate, Export, Delete.
 *
 * Features:
 *   - Slides up from bottom via Framer Motion when visible
 *   - Dark background with lime top border accent
 *   - Responsive layout: selected count (left), actions (center), clear (right)
 *   - Each action has a Lucide icon + label
 *   - Reduced motion support
 */

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  CheckSquare,
  Pause,
  Play,
  Copy,
  Download,
  Trash2,
  X,
} from 'lucide-react'

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

export interface BulkActionsBarProps {
  /** Number of selected items — drives visibility & label */
  selectedCount: number
  /** Called when Pause action is clicked */
  onPause: () => void
  /** Called when Resume action is clicked */
  onResume: () => void
  /** Called when Duplicate action is clicked */
  onDuplicate: () => void
  /** Called when Export action is clicked */
  onExport: () => void
  /** Called when Delete action is clicked */
  onDelete: () => void
  /** Called when Clear Selection is clicked */
  onClear: () => void
  /** Whether the bar is visible (slides up when true) */
  visible: boolean
}

/* ──────────────────────────────────────────────
   Action button config
   ────────────────────────────────────────────── */

interface ActionConfig {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  onClick: () => void
  danger?: boolean
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function BulkActionsBar({
  selectedCount,
  onPause,
  onResume,
  onDuplicate,
  onExport,
  onDelete,
  onClear,
  visible,
}: BulkActionsBarProps) {
  const reducedMotion = useReducedMotion()

  const actions: ActionConfig[] = [
    { label: 'Pause', icon: Pause, onClick: onPause },
    { label: 'Resume', icon: Play, onClick: onResume },
    { label: 'Duplicate', icon: Copy, onClick: onDuplicate },
    { label: 'Export', icon: Download, onClick: onExport },
    { label: 'Delete', icon: Trash2, onClick: onDelete, danger: true },
  ]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="toolbar"
          aria-label="Bulk actions"
          initial={reducedMotion ? false : { y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reducedMotion ? undefined : { y: 80, opacity: 0 }}
          transition={{
            type: 'spring',
            damping: 26,
            stiffness: 280,
            mass: 0.8,
          }}
          className="
            fixed bottom-0 left-0 right-0 z-50
            flex items-center justify-between
            px-4 sm:px-6 py-3
            border-t
          "
          style={{
            background: '#111318',
            borderColor: '#c3f53b',
            borderWidth: '1px 0 0 0',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.45)',
          }}
        >
          {/* ── Left: selected count ── */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <CheckSquare
              size={18}
              strokeWidth={2}
              className="shrink-0"
              style={{ color: '#c3f53b' }}
              aria-hidden="true"
            />
            <span
              className="text-[13px] sm:text-sm font-semibold whitespace-nowrap"
              style={{ color: '#FFFFFF' }}
            >
              {selectedCount} selected
            </span>
          </div>

          {/* ── Center: action buttons ── */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto">
            {actions.map(({ label, icon: Icon, onClick, danger }) => (
              <motion.button
                key={label}
                type="button"
                onClick={onClick}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="
                  flex items-center gap-1.5
                  h-8 sm:h-9
                  px-2 sm:px-3
                  rounded-lg
                  text-[12px] sm:text-[13px] font-medium
                  whitespace-nowrap
                  transition-colors duration-150
                  focus:outline-none focus:ring-2 focus:ring-[#c3f53b] focus:ring-offset-2 focus:ring-offset-[#111318]
                "
                style={{
                  color: danger ? '#EF4444' : '#FFFFFF',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = danger
                    ? 'rgba(239,68,68,0.12)'
                    : 'rgba(255,255,255,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <Icon
                  size={15}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">{label}</span>
              </motion.button>
            ))}
          </div>

          {/* ── Right: clear selection ── */}
          <motion.button
            type="button"
            onClick={onClear}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="
              flex items-center gap-1.5
              h-8 sm:h-9
              px-2 sm:px-3
              rounded-lg
              text-[12px] sm:text-[13px] font-medium
              whitespace-nowrap
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-[#c3f53b] focus:ring-offset-2 focus:ring-offset-[#111318]
            "
            style={{ color: '#8A8F98', background: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFFFFF'
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8A8F98'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <X
              size={15}
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Clear Selection</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
