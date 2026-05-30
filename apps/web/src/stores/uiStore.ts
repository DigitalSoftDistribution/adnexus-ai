// @ts-nocheck
// Re-export the canonical UI store from store/useUIStore
// This file exists for backward compatibility — pages importing from
// '../stores/uiStore' will get the same singleton instance as components
// importing from '../store/useUIStore'.
export { useUIStore } from '../store/useUIStore';

// Types originally defined in this file — kept for backward compatibility
// with the barrel file (stores/index.ts) and any direct importers.
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type SidebarMode = 'expanded' | 'collapsed' | 'hidden';
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  activeModal: string | null;
  modalData: unknown;
  modalSize: ModalSize;
  toast: Toast | null;
  isCommandPaletteOpen: boolean;
  isPageLoading: boolean;
  pageTitle: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  openModal: (modal: string, data?: unknown, size?: ModalSize) => void;
  closeModal: () => void;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  clearToast: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setPageLoading: (loading: boolean) => void;
  setPageTitle: (title: string) => void;
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; href?: string }>) => void;
}
