import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Bot,
  Box,
  Brain,
  Building2,
  Cpu,
  FileText,
  FolderKanban,
  Grid,
  LayoutDashboard,
  Lock,
  LogOut,
  Palette,
  Plug,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import { PRICING, SEO_OS_THEMES } from '@shared/constants';
import type { ThemeId } from '@shared/types';
import { useApp } from '@/context/AppContext';
import { api, isStaticSandboxMode } from '@/lib/api';
import { WindowManager } from './WindowManager';

const DOCK_ITEMS = [
  { to: '/desk', label: '3D Desk', icon: LayoutDashboard },
  { to: '/desk/orchestrator', label: 'Orchestrator', icon: Cpu },
  { to: '/desk/clients', label: 'Clients', icon: Building2 },
  { to: '/desk/coworkers', label: 'Coworkers', icon: Users },
  { to: '/desk/spaces', label: 'Spaces', icon: FolderKanban },
  { to: '/desk/tasks', label: 'Tasks', icon: Activity },
  { to: '/desk/brain', label: 'Brain', icon: Brain },
  { to: '/desk/reports', label: 'Reports', icon: FileText },
  { to: '/desk/integrations', label: 'Integrations', icon: Plug },
  { to: '/desk/admin', label: 'Admin', icon: Shield },
];

export function DeskShell({ children }: { children: React.ReactNode }) {
  const {
    session,
    loadingSession,
    desk,
    loadingDesk,
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
    toggleMinimizeWindow,
    refreshSession,
    refreshDesk,
    showToast,
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();

  const isEntitled =
    session?.entitlement?.status === 'TRIAL_INCLUDED' || session?.entitlement?.status === 'ACTIVE';

  useEffect(() => {
    if (!loadingSession && session?.authenticated && isEntitled && !desk && !loadingDesk) {
      void refreshDesk();
    }
  }, [loadingSession, session, isEntitled, desk, loadingDesk, refreshDesk]);

  // Strict server-side / entitlement gate UI
  if (!loadingSession && (!session?.authenticated || !isEntitled)) {
    const status = session?.entitlement?.status ?? 'INACTIVE';
    return (
      <div className="os-grid-bg flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="os-glass w-full max-w-xl rounded-2xl p-7 shadow-2xl">
          <div className="flex items-center gap-2.5 text-amber-300">
            <Lock className="h-5 w-5" />
            <span className="font-mono-tech text-xs uppercase tracking-wider">
              Business Workspace Entitlement Required · Status: {status}
            </span>
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold text-white">
            SEO OS Business Desk Is Gated by Verified Payment
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Access to the authenticated SEO OS Business Desk, multi-client workspaces, AI coworkers, and enterprise governance is granted only after a verified server-side payment event for the Business Setup offer:
          </p>
          <div className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
            <div className="font-semibold">{PRICING.summaryLine}</div>
            <p className="mt-1 text-xs text-cyan-200/80">
              One-time $997 setup fee paid first. First 2 months are included after setup. Ongoing $2,400/month subscription begins after the included two-month period.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/checkout"
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Start Business Setup ($997)
            </Link>
            <Link
              to="/personal"
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-100 hover:bg-white/10"
            >
              Join Free Personal Agent Waitlist
            </Link>
            {isStaticSandboxMode() && (
              <button
                type="button"
                onClick={async () => {
                  await api.signup({
                    email: 'demo.director@apexgrowth.example',
                    name: 'Alex Morgan',
                    password: 'DemoPassword123!',
                    organizationName: 'Apex Growth Partners',
                    autoActivateDemoEntitlement: true,
                  });
                  await refreshSession();
                  await refreshDesk();
                  showToast('Entered provisioned Static Demo Sandbox (Test Mode).');
                }}
                className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25"
              >
                Launch Provisioned Demo Sandbox (GitHub Pages Preview)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const pendingApprovals = desk?.approvals.filter((a) => a.status === 'PENDING') ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--os-bg)] text-slate-100">
      {/* Top SEO OS System Bar */}
      <header className="os-glass sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-3">
          <Link to="/desk" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--os-accent)] font-display text-xs font-extrabold text-slate-950">
              OS
            </span>
            <span className="font-display text-sm font-bold tracking-tight text-white">
              SEO OS <span className="text-[var(--os-accent)]">Workbench</span>
            </span>
          </Link>

          {/* Active Client Switcher */}
          {desk && desk.clients.length > 0 && (
            <select
              aria-label="Active client workspace"
              value={activeClientId ?? ''}
              onChange={(e) => setActiveClientId(e.target.value)}
              className="rounded-lg border border-white/15 bg-slate-950/90 px-2.5 py-1 text-xs font-medium text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              {desk.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.domain})
                </option>
              ))}
            </select>
          )}

          {/* Unmistakable Demo / Mock Adapter Indicator */}
          <span className="hidden items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 font-mono-tech text-[10px] font-semibold text-amber-200 md:inline-flex">
            <Sparkles className="h-3 w-3" />
            {isStaticSandboxMode() ? 'STATIC DEMO SANDBOX · MOCK ADAPTERS' : 'DEMO / MOCK ADAPTERS'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pending Approvals Trigger */}
          <button
            type="button"
            onClick={() =>
              openWindow({
                title: `Human Review & Approvals (${pendingApprovals.length} Pending)`,
                kind: 'APPROVAL',
                entityId: 'approvals_queue',
              })
            }
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              pendingApprovals.length > 0
                ? 'border-amber-400/50 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Approvals ({pendingApprovals.length})</span>
          </button>

          {/* 3D / Accessible 2D Toggle */}
          <button
            type="button"
            onClick={() => setIs3DMode(!is3DMode)}
            title="Toggle 3D spatial office vs accessible 2D desk"
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/10"
          >
            {is3DMode ? <Box className="h-3.5 w-3.5 text-cyan-300" /> : <Grid className="h-3.5 w-3.5 text-emerald-300" />}
            <span>{is3DMode ? '3D Office' : '2D Accessible'}</span>
          </button>

          {/* Reduced Motion Toggle */}
          <button
            type="button"
            onClick={() => setReducedMotion(!reducedMotion)}
            className={`hidden rounded-lg border px-2 py-1 text-[11px] sm:inline-flex ${
              reducedMotion
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            {reducedMotion ? 'Motion: Reduced' : 'Motion: On'}
          </button>

          {/* 7-Theme Switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-slate-950/80 px-2 py-1">
            <Palette className="h-3.5 w-3.5 text-[var(--os-accent)]" />
            <select
              aria-label="SEO OS Theme"
              value={theme}
              onChange={(e) => void setTheme(e.target.value as ThemeId)}
              className="bg-transparent text-xs text-slate-100 focus:outline-none"
            >
              {Object.values(SEO_OS_THEMES).map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-950 text-slate-100">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Switch to Isolated Personal Agent / Waitlist */}
          <Link
            to="/personal"
            className="hidden items-center gap-1 rounded-lg border border-violet-400/35 bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-200 hover:bg-violet-500/25 lg:inline-flex"
          >
            <Bot className="h-3.5 w-3.5" />
            Personal Waitlist
          </Link>

          <button
            type="button"
            onClick={async () => {
              await api.signout();
              await refreshSession();
              navigate('/');
            }}
            aria-label="Sign out"
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Main Workspace Viewport */}
      <main className="mx-auto w-full max-w-[1680px] flex-1 px-3 pb-24 pt-3 sm:px-5">
        {loadingDesk && !desk ? (
          <div className="flex h-80 items-center justify-center text-sm text-slate-400">
            Initializing SEO OS spatial desk &amp; tenant workspace...
          </div>
        ) : (
          children
        )}
      </main>

      {/* Floating OS Window Manager */}
      <WindowManager />

      {/* Bottom SEO OS Dock + Minimized Windows Tray */}
      <nav
        aria-label="SEO OS Desk Navigation Dock"
        className="fixed bottom-3 left-1/2 z-40 flex max-w-[96vw] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-2xl border border-white/15 bg-slate-950/90 px-2.5 py-2 shadow-2xl shadow-black/70 backdrop-blur-xl"
      >
        {DOCK_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            item.to === '/desk'
              ? location.pathname === '/desk'
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                active
                  ? 'bg-[var(--os-accent)] text-slate-950 font-semibold shadow-md'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}

        {/* Minimized Windows Tray */}
        {windows.some((w) => w.minimized) && (
          <div className="ml-2 flex items-center gap-1 border-l border-white/15 pl-2">
            {windows
              .filter((w) => w.minimized)
              .map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => toggleMinimizeWindow(w.id)}
                  className="max-w-[140px] truncate rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/25"
                >
                  {w.title}
                </button>
              ))}
          </div>
        )}
      </nav>
    </div>
  );
}
