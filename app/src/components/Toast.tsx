// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastConfig: Record<ToastType, { icon: React.ReactNode; borderColor: string; iconColor: string; progressColor: string }> = {
  success: {
    icon: <Check className="w-5 h-5" />,
    borderColor: 'border-l-[#c3f53b]',
    iconColor: 'text-[#c3f53b]',
    progressColor: 'bg-[#c3f53b]',
  },
  error: {
    icon: <X className="w-5 h-5" />,
    borderColor: 'border-l-[#ef4444]',
    iconColor: 'text-[#ef4444]',
    progressColor: 'bg-[#ef4444]',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    borderColor: 'border-l-[#f59e0b]',
    iconColor: 'text-[#f59e0b]',
    progressColor: 'bg-[#f59e0b]',
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    borderColor: 'border-l-[#3b82f6]',
    iconColor: 'text-[#3b82f6]',
    progressColor: 'bg-[#3b82f6]',
  },
};

export default function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(duration);
  const config = toastConfig[type];

  const handleClose = useCallback(() => {
    onClose(id);
  }, [id, onClose]);

  useEffect(() => {
    if (duration <= 0) return;

    const tickRate = 16;
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      if (isPaused) {
        startTimeRef.current = Date.now();
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
      startTimeRef.current = Date.now();

      const remainingPercent = (remainingRef.current / duration) * 100;
      setProgress(remainingPercent);

      if (remainingRef.current <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleClose();
      }
    }, tickRate);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [duration, isPaused, handleClose]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => {
    setIsPaused(false);
    startTimeRef.current = Date.now();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 120, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClose}
      className={`
        relative w-full max-w-[400px] overflow-hidden rounded-lg border border-[rgba(255,255,255,0.06)]
        border-l-4 ${config.borderColor} bg-[#0a0a0a] shadow-lg cursor-pointer
        transition-shadow hover:shadow-xl
      `}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`flex-shrink-0 mt-0.5 ${config.iconColor}`} aria-hidden="true">
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">{title}</p>
          {message && (
            <p className="mt-1 text-sm text-[#8A8F98] leading-relaxed">{message}</p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="flex-shrink-0 -mr-1 -mt-1 p-1 rounded-md text-[#555B66] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          aria-label="Dismiss notification"
          type="button"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[rgba(255,255,255,0.04)]">
          <motion.div
            className={`h-full ${config.progressColor} opacity-60`}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0 }}
          />
        </div>
      )}
    </motion.div>
  );
}
