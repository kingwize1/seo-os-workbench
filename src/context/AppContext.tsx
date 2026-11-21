import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { OsWindowState, SessionSnapshot, ThemeId } from '@shared/types';
import { api } from '@/lib/api';
import type { DeskBootstrapData } from '@/lib/sandboxEngine';

interface AppContextValue {
  session: SessionSnapshot | null;
  loadingSession: boolean;
  desk: DeskBootstrapData | null;
  loadingDesk: boolean;
  deskError: string | null;
  activeClientId: string | null;
  setActiveClientId: (id: string) => void;
  theme: ThemeId;
  setTheme: (theme: ThemeId) => Promise<void>;
  is3DMode: boolean;
  setIs3DMode: (v: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  windows: OsWindowState[];
  openWindow: (win: Omit<OsWindowState, 'id' | 'x' | 'y' | 'width' | 'height' | 'minimized' | 'maximized' | 'zIndex'>) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  toggleMinimizeWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  refreshSession: () => Promise<SessionSnapshot>;
  refreshDesk: () => Promise<void>;
  toast: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [desk, setDesk] = useState<DeskBootstrapData | null>(null);
  const [loadingDesk, setLoadingDesk] = useState(false);
  const [deskError, setDeskError] = useState<string | null>(null);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [theme, setThemeState] = useState<ThemeId>('cosmos');

  const prefersReduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 960;

  const [reducedMotion, setReducedMotion] = useState<boolean>(prefersReduced);
  const [is3DMode, setIs3DMode] = useState<boolean>(!prefersReduced && !isSmallScreen);
  const [windows, setWindows] = useState<OsWindowState[]>([]);
  const [zCounter, setZCounter] = useState(40);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 4200);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const refreshSession = useCallback(async () => {
    setLoadingSession(true);
    try {
      const snap = await api.getSession();
      setSession(snap);
      if (snap.businessWorkspace?.activeTheme) {
        setThemeState(snap.businessWorkspace.activeTheme);
      }
      return snap;
    } finally {
      setLoadingSession(false);
    }
  }, []);

  const refreshDesk = useCallback(async () => {
    setLoadingDesk(true);
    setDeskError(null);
    try {
      const data = await api.getDeskBootstrap();
      setDesk(data);
      if (data.businessWorkspace.activeTheme) {
        setThemeState(data.businessWorkspace.activeTheme);
      }
      setActiveClientId((prev) => {
        if (prev && data.clients.some((c) => c.id === prev)) return prev;
        return data.clients[0]?.id ?? null;
      });
    } catch (err) {
      setDesk(null);
      setDeskError(err instanceof Error ? err.message : 'Unable to load SEO OS Desk');
    } finally {
      setLoadingDesk(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const setTheme = useCallback(
    async (next: ThemeId) => {
      setThemeState(next);
      document.documentElement.setAttribute('data-theme', next);
      if (session?.entitlement?.status === 'TRIAL_INCLUDED' || session?.entitlement?.status === 'ACTIVE') {
        try {
          await api.setTheme(next);
        } catch {
          // Theme still applies locally
        }
      }
    },
    [session]
  );

  const openWindow = useCallback(
    (win: Omit<OsWindowState, 'id' | 'x' | 'y' | 'width' | 'height' | 'minimized' | 'maximized' | 'zIndex'>) => {
      setZCounter((z) => z + 1);
      setWindows((prev) => {
        const existing = prev.find((w) => w.kind === win.kind && w.entityId === win.entityId);
        if (existing) {
          return prev.map((w) =>
            w.id === existing.id ? { ...w, minimized: false, zIndex: zCounter + 1 } : w
          );
        }
        const offset = (prev.length % 5) * 28;
        return [
          ...prev,
          {
            ...win,
            id: `win_${win.kind}_${win.entityId}`,
            x: 80 + offset,
            y: 72 + offset,
            width: 680,
            height: 480,
            minimized: false,
            maximized: false,
            zIndex: zCounter + 1,
          },
        ];
      });
    },
    [zCounter]
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const focusWindow = useCallback(
    (id: string) => {
      setZCounter((z) => z + 1);
      setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, zIndex: zCounter + 1 } : w)));
    },
    [zCounter]
  );

  const toggleMinimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w)));
  }, []);

  const toggleMaximizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)));
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, x, y } : w)));
  }, []);

  return (
    <AppContext.Provider
      value={{
        session,
        loadingSession,
        desk,
        loadingDesk,
        deskError,
        activeClientId,
        setActiveClientId,
        theme,
        setTheme,
        is3DMode,
        setIs3DMode,
        reducedMotion,
        setReducedMotion,
        windows,
        openWindow,
        closeWindow,
        focusWindow,
        toggleMinimizeWindow,
        toggleMaximizeWindow,
        moveWindow,
        refreshSession,
        refreshDesk,
        toast,
        showToast,
      }}
    >
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 right-5 z-[200] max-w-md rounded-xl border border-cyan-400/40 bg-slate-950/95 px-4 py-3 text-sm text-cyan-100 shadow-2xl shadow-cyan-950/50 backdrop-blur"
        >
          {toast}
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
