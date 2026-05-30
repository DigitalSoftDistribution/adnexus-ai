import { useState, useCallback, useRef, useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info" | "draft" | "destructive" | "default";

export interface Toast {
  id: string;
  type?: ToastType;
  variant?: ToastType;
  title: string;
  description?: string;
  message?: string;
  duration?: number;
  link?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastState extends Toast {
  createdAt: number;
  remaining: number;
  isPaused: boolean;
}

const DEFAULT_DURATION = 5000;
const MAX_TOASTS = 5;

let globalToasts: ToastState[] = [];
let globalListeners: ((toasts: ToastState[]) => void)[] = [];

function emitChange() {
  globalListeners.forEach((listener) => listener([...globalToasts]));
}

function pushToast(toast: ToastState) {
  globalToasts = [toast, ...globalToasts].slice(0, MAX_TOASTS);
  emitChange();
}

function removeToast(id: string) {
  globalToasts = globalToasts.filter((t) => t.id !== id);
  emitChange();
}

function clearAllToasts() {
  globalToasts = [];
  emitChange();
}

function updateToast(id: string, updates: Partial<ToastState>) {
  globalToasts = globalToasts.map((t) => (t.id === id ? { ...t, ...updates } : t));
  emitChange();
}

function subscribe(listener: (toasts: ToastState[]) => void) {
  globalListeners = [...globalListeners, listener];
  return () => {
    globalListeners = globalListeners.filter((l) => l !== listener);
  };
}

export function toast(options: Omit<Toast, "id">): string {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const duration = options.duration ?? DEFAULT_DURATION;
  const toastState: ToastState = {
    ...options,
    type: options.type ?? options.variant ?? "info",
    description: options.description ?? options.message,
    id,
    duration,
    createdAt: Date.now(),
    remaining: duration,
    isPaused: false,
  };
  pushToast(toastState);
  return id;
}

toast.success = (title: string, description?: string, opts?: Partial<Omit<Toast, "type" | "title" | "description">>) =>
  toast({ type: "success", title, description, ...opts });

toast.error = (title: string, description?: string, opts?: Partial<Omit<Toast, "type" | "title" | "description">>) =>
  toast({ type: "error", title, description, ...opts });

toast.warning = (title: string, description?: string, opts?: Partial<Omit<Toast, "type" | "title" | "description">>) =>
  toast({ type: "warning", title, description, ...opts });

toast.info = (title: string, description?: string, opts?: Partial<Omit<Toast, "type" | "title" | "description">>) =>
  toast({ type: "info", title, description, ...opts });

toast.draft = (title: string, description?: string, opts?: Partial<Omit<Toast, "type" | "title" | "description">>) =>
  toast({ type: "draft", title, description, ...opts });

toast.dismiss = (id: string) => removeToast(id);
toast.dismissAll = () => clearAllToasts();

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>(globalToasts);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pausedAtRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const unsubscribe = subscribe(setToasts);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      globalToasts.forEach((t) => {
        if (t.isPaused) return;

        const elapsed = now - t.createdAt;
        const adjustedElapsed = elapsed - (t.duration! - t.remaining);
        const remaining = Math.max(0, t.remaining - 16);

        if (remaining <= 0) {
          removeToast(t.id);
        } else {
          updateToast(t.id, { remaining });
        }
      });
    };

    const interval = setInterval(tick, 16);
    return () => clearInterval(interval);
  }, []);

  const addToast = useCallback((options: Omit<Toast, "id">) => {
    return toast(options);
  }, []);

  const remove = useCallback((id: string) => {
    removeToast(id);
  }, []);

  const removeAll = useCallback(() => {
    clearAllToasts();
  }, []);

  const pauseToast = useCallback((id: string) => {
    pausedAtRef.current[id] = Date.now();
    updateToast(id, { isPaused: true });
  }, []);

  const resumeToast = useCallback((id: string) => {
    const pausedAt = pausedAtRef.current[id];
    if (pausedAt) {
      const pausedDuration = Date.now() - pausedAt;
      const t = globalToasts.find((toast) => toast.id === id);
      if (t) {
        updateToast(id, {
          isPaused: false,
          createdAt: t.createdAt + pausedDuration,
        });
      } else {
        updateToast(id, { isPaused: false });
      }
      delete pausedAtRef.current[id];
    }
  }, []);

  return {
    toasts,
    addToast,
    remove,
    removeAll,
    pauseToast,
    resumeToast,
    toast,
  };
}

export default useToast;
