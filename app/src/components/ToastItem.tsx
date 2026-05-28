import React, { useCallback } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  FileText,
  X,
} from "lucide-react";
import type { ToastState } from "../hooks/useToast";

const ICON_MAP = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  draft: FileText,
};

const TYPE_STYLES = {
  success: {
    iconColor: "text-lime-400",
    progressBar: "bg-lime-400",
    border: "border-lime-400/20",
    glow: "shadow-[0_0_12px_rgba(163,230,53,0.15)]",
  },
  error: {
    iconColor: "text-red-400",
    progressBar: "bg-red-400",
    border: "border-red-400/20",
    glow: "shadow-[0_0_12px_rgba(248,113,113,0.15)]",
  },
  warning: {
    iconColor: "text-amber-400",
    progressBar: "bg-amber-400",
    border: "border-amber-400/20",
    glow: "shadow-[0_0_12px_rgba(251,191,36,0.15)]",
  },
  info: {
    iconColor: "text-blue-400",
    progressBar: "bg-blue-400",
    border: "border-blue-400/20",
    glow: "shadow-[0_0_12px_rgba(96,165,250,0.15)]",
  },
  draft: {
    iconColor: "text-purple-400",
    progressBar: "bg-purple-400",
    border: "border-purple-400/20",
    glow: "shadow-[0_0_12px_rgba(192,132,252,0.15)]",
  },
};

interface ToastItemProps {
  toast: ToastState;
  onRemove: () => void;
  onPause: () => void;
  onResume: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({
  toast,
  onRemove,
  onPause,
  onResume,
}) => {
  const {
    type,
    title,
    description,
    duration,
    remaining,
    link,
    action,
  } = toast;

  const styles = TYPE_STYLES[type];
  const Icon = ICON_MAP[type];

  const progressPercent =
    duration && duration > 0 ? (remaining / duration) * 100 : 0;

  const handleClick = useCallback(() => {
    if (link) {
      window.location.href = link;
    }
  }, [link]);

  const handleActionClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      action?.onClick();
    },
    [action]
  );

  return (
    <motion.div
      role="alert"
      aria-label={`${type} notification: ${title}`}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onClick={handleClick}
      className={`
        relative overflow-hidden rounded-xl border ${styles.border} ${styles.glow}
        bg-zinc-900/95 backdrop-blur-md
        cursor-${link ? "pointer" : "default"}
        select-none
        transition-shadow duration-200
        hover:shadow-xl
      `}
    >
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={`w-5 h-5 ${styles.iconColor}`} aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100 leading-5">
            {title}
          </p>
          {description && (
            <p className="mt-1 text-xs text-zinc-400 leading-4 line-clamp-2">
              {description}
            </p>
          )}

          {action && (
            <button
              onClick={handleActionClick}
              className={`
                mt-2.5 inline-flex items-center gap-1.5
                px-3 py-1.5 rounded-lg text-xs font-medium
                border ${styles.border}
                ${styles.iconColor}
                bg-zinc-800/60 hover:bg-zinc-800
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-zinc-900
                ${type === "success" ? "focus:ring-lime-400" : ""}
                ${type === "error" ? "focus:ring-red-400" : ""}
                ${type === "warning" ? "focus:ring-amber-400" : ""}
                ${type === "info" ? "focus:ring-blue-400" : ""}
                ${type === "draft" ? "focus:ring-purple-400" : ""}
              `}
            >
              {action.label}
            </button>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Dismiss notification"
          className="
            flex-shrink-0 -mt-1 -mr-1 p-1.5 rounded-lg
            text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 focus:ring-offset-zinc-900
          "
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="relative h-[3px] bg-zinc-800">
        <motion.div
          className={`absolute inset-y-0 left-0 ${styles.progressBar} rounded-r-full`}
          style={{ width: `${progressPercent}%` }}
          initial={false}
          transition={{ duration: 0.016, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
};

export default ToastItem;
