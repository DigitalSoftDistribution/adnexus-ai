import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface UIState {
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  commandPaletteOpen: boolean
  globalSearchOpen: boolean
  toasts: ToastItem[]
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMobileSidebarOpen: (open: boolean) => void
  toggleMobileSidebar: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setGlobalSearchOpen: (open: boolean) => void
  showToast: (toast: Omit<ToastItem, 'id'>) => void
  clearToast: (id: string) => void
  clearAllToasts: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      commandPaletteOpen: false,
      globalSearchOpen: false,
      toasts: [],
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
      toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
      showToast: (toast) =>
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }],
        })),
      clearToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
      clearAllToasts: () => set({ toasts: [] }),
    }),
    {
      name: 'adnexus-ui-state',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
)
