import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bell,
  Bot,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  Hand,
  Lock,
  Pause,
  Play,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Square,
  Target,
  Terminal,
  Upload,
} from 'lucide-react';
import { WAITLIST_CONFIG } from '@shared/constants';
import { STATUS_VISUAL_META } from '@shared/stateMachine';
import type {
  ApprovalRequest,
  PersonalWorkspace,
  WaitlistEntry,
  WaitlistTrackerSummary,
} from '@shared/types';
import { ApprovalCard } from '@/components/ApprovalCard';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';

export function PersonalAgentPage() {
  const { showToast } = useApp();
  const [searchParams] = useSearchParams();
  const [workspace, setWorkspace] = useState<PersonalWorkspace | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [tracker, setTracker] = useState<WaitlistTrackerSummary | null>(null);
  const [waitlistEntry, setWaitlistEntry] = useState<WaitlistEntry | null>(null);
  const [checkingGate, setCheckingGate] = useState(true);
  const [lookupEmail, setLookupEmail] = useState('');

  const [activeTab, setActiveTab] = useState<'tasks' | 'goals' | 'monitors' | 'receipts' | 'prefs'>('tasks');
  const [prompt, setPrompt] = useState('');
  const [followUpText, setFollowUpText] = useState('');
  const [newMemory, setNewMemory] = useState('');
  const [busy, setBusy] = useState(false);

  const accessParam = searchParams.get('access') || undefined;
  const emailParam = searchParams.get('email') || undefined;
  const dataParam = searchParams.get('data');

  const load = useCallback(async (overrideEmail?: string) => {
    const wl = await api.getWaitlistTracker({
      email: overrideEmail ?? emailParam,
      access: accessParam,
      data: dataParam,
    });
    setTracker(wl.tracker);
    setWaitlistEntry(wl.viewerEntry);

    if (wl.viewerEntry?.status === 'APPROVED') {
      const res = await api.getPersonalWorkspace();
      setWorkspace(res.workspace);
      setApprovals(res.approvals);
    }
    setCheckingGate(false);
  }, [accessParam, emailParam, dataParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      await api.createPersonalTask(prompt.trim());
      setPrompt('');
      await load();
      showToast('Personal agent task planned and executed (Mock Adapter).');
    } finally {
      setBusy(false);
    }
  };

  const handleControl = async (taskId: string, action: string, text?: string) => {
    await api.controlPersonalTask(taskId, action, text);
    await load();
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspace) return;
    const text = await file.text().catch(() => '[Binary file preview unavailable]');
    const nextFiles = [
      {
        id: `pf_${Date.now()}`,
        name: file.name,
        sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
        preview: text.slice(0, 260),
        uploadedAt: new Date().toISOString(),
      },
      ...workspace.uploadedFiles,
    ];
    await api.updatePersonalPreferences({ uploadedFiles: nextFiles });
    await load();
    showToast(`Uploaded "${file.name}" into isolated personal workspace.`);
  };

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const activeTask = workspace?.tasks[0] ?? null;

  // Enforce Waitlist Approval Gate before exposing Free Personal Agent Workspace
  if (checkingGate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070913] text-sm text-slate-400">
        Verifying Personal Agent waitlist approval status...
      </div>
    );
  }

  if (waitlistEntry?.status !== 'APPROVED') {
    return (
      <div className="os-grid-bg flex min-h-screen flex-col items-center justify-center bg-[#070913] px-4 py-12 text-slate-100">
        <div className="os-glass w-full max-w-xl rounded-2xl p-7 shadow-2xl space-y-5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 font-mono-tech text-xs uppercase tracking-wider text-violet-300">
              <Lock className="h-4 w-4" /> Waitlist Approval Required
            </span>
            <span className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-0.5 font-mono-tech text-[10px] text-emerald-200">
              Free Access Upon Approval
            </span>
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              Join the Waitlist to Unlock Your Free Personal Agent
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Free Personal Agent seats are granted via waitlist approval. Submit your setup profile and your details + a one-click instant approval link are sent to{' '}
              <strong className="text-cyan-300">{WAITLIST_CONFIG.approverEmail}</strong>.
            </p>
          </div>

          {/* Live Running Waitlist Stats */}
          {tracker && (
            <div className="grid grid-cols-3 gap-2.5 rounded-xl border border-white/10 bg-slate-950/80 p-3.5 text-center">
              <div>
                <div className="font-mono-tech text-[10px] uppercase text-slate-400">Joined</div>
                <div className="mt-0.5 font-display text-xl font-extrabold text-white">{tracker.totalJoined}</div>
              </div>
              <div>
                <div className="font-mono-tech text-[10px] uppercase text-amber-300">Pending</div>
                <div className="mt-0.5 font-display text-xl font-extrabold text-amber-200">{tracker.pendingCount}</div>
              </div>
              <div>
                <div className="font-mono-tech text-[10px] uppercase text-emerald-300">Approved</div>
                <div className="mt-0.5 font-display text-xl font-extrabold text-emerald-200">{tracker.approvedCount}</div>
              </div>
            </div>
          )}

          {waitlistEntry && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3.5 text-xs text-amber-100">
              <div className="flex items-center gap-1.5 font-semibold">
                <Clock className="h-4 w-4" /> Queue Position #{waitlistEntry.queuePosition} — Status: {waitlistEntry.status}
              </div>
              <p className="mt-1 text-amber-200/80">
                Application for <strong>{waitlistEntry.email}</strong> is awaiting approval from {WAITLIST_CONFIG.approverEmail}.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              to="/personal"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-400"
            >
              Join the Waitlist for Free Access <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/checkout"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
            >
              Or Start Business Workspace ($997)
            </Link>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!lookupEmail.trim()) return;
              await load(lookupEmail.trim());
            }}
            className="border-t border-white/10 pt-4"
          >
            <label className="mb-1.5 block text-xs text-slate-400">
              Already approved? Check by email:
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
              >
                Verify Access
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100">
      {/* Personal Top Bar — Explicitly isolated from Business Org Controls */}
      <header className="sticky top-0 z-30 border-b border-violet-400/20 bg-slate-950/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 font-display text-xs font-extrabold text-white">
                {workspace?.avatarLabel || 'PA'}
              </span>
              <div>
                <div className="font-display text-sm font-bold text-white">Personal Agent Workspace</div>
                <div className="font-mono-tech text-[10px] text-emerald-300">
                  Waitlist Approved (#{waitlistEntry.queuePosition}) · Free Personal Scope · Mock Providers
                </div>
              </div>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/personal"
              className="inline-flex items-center gap-1 rounded-full border border-violet-400/35 bg-violet-500/10 px-2.5 py-0.5 font-mono-tech text-[10px] text-violet-200 hover:bg-violet-500/20"
            >
              <Activity className="h-3 w-3" />
              Waitlist Tracker ({tracker?.approvedCount ?? 0} approved)
            </Link>
            <span className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-0.5 font-mono-tech text-[10px] text-emerald-200">
              <ShieldCheck className="mr-1 inline h-3 w-3" />
              Zero Business Tenant Access
            </span>
            <Link
              to="/business"
              className="rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
            >
              Upgrade to Business SEO OS Desk ($997 Setup)
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-6 lg:grid-cols-12">
        {/* Left Nav Rail */}
        <aside className="space-y-2 lg:col-span-3">
          {(
            [
              ['tasks', Bot, 'Durable Tasks & Chat'],
              ['goals', Target, 'Goals & Milestones'],
              ['monitors', RefreshCw, 'Recurring Checks'],
              ['receipts', Receipt, 'Saved Receipts'],
              ['prefs', Settings, 'Preferences & Permissions'],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition ${
                activeTab === id
                  ? 'border-violet-400/50 bg-violet-500/20 text-violet-100'
                  : 'border-white/10 bg-slate-900/50 text-slate-300 hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}

          {/* Explicit Permission Toggles */}
          {workspace && (
            <div className="os-panel mt-4 rounded-xl p-3.5 text-xs space-y-2.5">
              <div className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-400">
                Explicit Personal Permissions
              </div>
              <label className="flex items-center justify-between gap-2 text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-amber-400" /> Optional Terminal
                </span>
                <input
                  type="checkbox"
                  checked={workspace.terminalEnabled}
                  onChange={async (e) => {
                    await api.updatePersonalPreferences({ terminalEnabled: e.target.checked });
                    await load();
                    showToast(e.target.checked ? 'Optional terminal enabled (still approval-gated).' : 'Terminal disabled.');
                  }}
                  className="accent-violet-500"
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-slate-200">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-cyan-400" /> File Workspace
                </span>
                <input
                  type="checkbox"
                  checked={workspace.filesEnabled}
                  onChange={async (e) => {
                    await api.updatePersonalPreferences({ filesEnabled: e.target.checked });
                    await load();
                  }}
                  className="accent-violet-500"
                />
              </label>
            </div>
          )}
        </aside>

        {/* Main Workspace Panel */}
        <section className="space-y-5 lg:col-span-9">
          {/* Pending Personal Approvals */}
          {pendingApprovals.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                Approval Required Before Sensitive Personal Action
              </h2>
              {pendingApprovals.map((appr) => (
                <ApprovalCard
                  key={appr.id}
                  approval={appr}
                  onDecide={async (id, decision) => {
                    await api.decidePersonalApproval(id, decision);
                    await load();
                    showToast(`Personal action ${decision.toLowerCase()}.`);
                  }}
                />
              ))}
            </div>
          )}

          {activeTab === 'tasks' && workspace && (
            <div className="space-y-5">
              {/* Chat Task Composer */}
              <form onSubmit={handleSubmitTask} className="os-panel rounded-2xl p-4">
                <label htmlFor="personal-prompt" className="block text-xs font-semibold text-violet-200">
                  Ask Your Personal Agent (Try mentioning "email" or "terminal" to see the approval boundary!)
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="personal-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Compare top 3 core web vitals tools and draft a PDF summary, OR send an email digest..."
                    className="flex-1 rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Run Plan
                  </button>
                </div>
              </form>

              {/* Durable Task Plan & Controls */}
              {activeTask && (
                <div className="os-panel rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="font-mono-tech text-[10px] uppercase text-violet-300">
                        Active Durable Plan · Mock Provider
                      </span>
                      <h2 className="mt-1 font-display text-lg font-bold text-white">{activeTask.prompt}</h2>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 font-mono-tech text-[10px] ${
                        STATUS_VISUAL_META[activeTask.status].badgeClass
                      }`}
                    >
                      {activeTask.status} · {activeTask.progressPct}%
                    </span>
                  </div>

                  {/* Task Controls: Pause, Resume, Stop, Retry, Cancel, Human Browser Takeover */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleControl(activeTask.id, 'PAUSE')}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
                    >
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </button>
                    <button
                      type="button"
                      onClick={() => handleControl(activeTask.id, 'RESUME')}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
                    >
                      <Play className="h-3.5 w-3.5" /> Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => handleControl(activeTask.id, 'STOP')}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
                    >
                      <Square className="h-3.5 w-3.5" /> Stop / Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleControl(activeTask.id, 'RETRY')}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/25"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => handleControl(activeTask.id, 'TOGGLE_TAKEOVER')}
                      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        activeTask.browserTakeoverActive
                          ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                          : 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
                      }`}
                    >
                      <Hand className="h-3.5 w-3.5" />
                      {activeTask.browserTakeoverActive ? 'Release Browser Control' : 'Take Over Browser Session'}
                    </button>
                  </div>

                  {/* Interactive Human Browser Takeover Surface */}
                  {activeTask.browserTakeoverActive && (
                    <div className="rounded-xl border border-amber-400/50 bg-slate-950 p-4">
                      <div className="flex items-center justify-between text-xs text-amber-200">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Globe className="h-4 w-4" /> Human Takeover Active (Simulated Browser Viewport)
                        </span>
                        <span className="font-mono-tech text-[10px]">AGENT PAUSED WHILE YOU DRIVE</span>
                      </div>
                      <div className="mt-2 rounded bg-slate-900 px-3 py-1.5 font-mono-tech text-xs text-slate-300">
                        {activeTask.browserCurrentUrl}
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Sign in, solve prompts, or inspect protected tabs directly. Click "Release Browser Control" to hand execution back to your Personal Agent.
                      </p>
                    </div>
                  )}

                  {/* Visible Step Plan */}
                  <div className="space-y-2">
                    {activeTask.steps.map((step, i) => (
                      <div key={step.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 font-mono-tech text-[10px] text-violet-200">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs font-semibold text-white">
                            <span>{step.title}</span>
                            <span className="font-mono-tech text-[10px] text-slate-400">{step.status}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400">{step.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Inline Cards (Browser, Plan, PDF, File, Email, Finance) */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {activeTask.cards.map((card) => (
                      <div key={card.id} className="rounded-xl border border-white/10 bg-slate-950/80 p-3.5">
                        <div className="flex items-center justify-between font-mono-tech text-[10px] uppercase text-cyan-300">
                          <span>{card.kind} card</span>
                          {card.isMock && <span className="text-amber-300">MOCK</span>}
                        </div>
                        <div className="mt-1 text-xs font-bold text-white">{card.title}</div>
                        <p className="mt-1 text-xs text-slate-400">{card.summary}</p>
                      </div>
                    ))}
                  </div>

                  {/* Follow-Up Queue */}
                  <div className="border-t border-white/10 pt-3">
                    <div className="text-xs font-semibold text-slate-300">Follow-Up Queue</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {activeTask.followUpQueue.map((q, idx) => (
                        <span key={idx} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                          {q}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={followUpText}
                        onChange={(e) => setFollowUpText(e.target.value)}
                        placeholder="Queue a follow-up step..."
                        className="flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!followUpText.trim()) return;
                          await handleControl(activeTask.id, 'ADD_FOLLOWUP', followUpText);
                          setFollowUpText('');
                        }}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
                      >
                        Queue
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* File Upload & Artifact Workspace */}
              {workspace.filesEnabled && (
                <div className="os-panel rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Personal File Workspace &amp; Uploads</h3>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10">
                      <Upload className="h-3.5 w-3.5" />
                      Upload File
                      <input type="file" onChange={handleUploadFile} className="hidden" />
                    </label>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {workspace.uploadedFiles.map((f) => (
                      <div key={f.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-white">
                          <span>{f.name}</span>
                          <span className="font-mono-tech text-[10px] text-slate-400">{f.sizeLabel}</span>
                        </div>
                        <pre className="mt-1.5 truncate font-mono-tech text-[10px] text-slate-400">{f.preview}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'goals' && workspace && (
            <div className="os-panel rounded-2xl p-5 space-y-4">
              <h2 className="font-display text-lg font-bold text-white">Personal Goals &amp; Milestones</h2>
              {workspace.goals.map((g) => (
                <div key={g.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-white">{g.title}</div>
                    <span className="font-mono-tech text-xs text-slate-400">Target: {g.targetDate}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {g.milestones.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-xs text-slate-200">
                        <input
                          type="checkbox"
                          checked={m.done}
                          onChange={async () => {
                            const updatedGoals = workspace.goals.map((goal) =>
                              goal.id !== g.id
                                ? goal
                                : {
                                    ...goal,
                                    milestones: goal.milestones.map((ms) =>
                                      ms.id === m.id ? { ...ms, done: !ms.done } : ms
                                    ),
                                  }
                            );
                            await api.updatePersonalPreferences({ goals: updatedGoals });
                            await load();
                          }}
                          className="accent-violet-500"
                        />
                        <span className={m.done ? 'line-through text-slate-500' : ''}>{m.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'monitors' && workspace && (
            <div className="os-panel rounded-2xl p-5 space-y-4">
              <h2 className="font-display text-lg font-bold text-white">Opt-In Recurring Page / Check Monitors</h2>
              {workspace.monitors.map((mon) => (
                <div key={mon.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/70 p-4">
                  <div>
                    <div className="text-sm font-semibold text-white">{mon.label}</div>
                    <div className="font-mono-tech text-xs text-cyan-300">{mon.url}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Cadence: {mon.cadence} · Last result: {mon.lastStatus}
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={mon.enabled}
                      onChange={async () => {
                        const updated = workspace.monitors.map((x) =>
                          x.id === mon.id ? { ...x, enabled: !x.enabled } : x
                        );
                        await api.updatePersonalPreferences({ monitors: updated });
                        await load();
                      }}
                      className="accent-violet-500"
                    />
                    {mon.enabled ? 'Active' : 'Paused'}
                  </label>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'receipts' && workspace && (
            <div className="os-panel rounded-2xl p-5 space-y-3">
              <h2 className="font-display text-lg font-bold text-white">Saved Results &amp; Execution Receipts</h2>
              {workspace.receipts.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{r.title}</span>
                    <span className="font-mono-tech text-[10px] text-emerald-300">
                      <CheckCircle2 className="mr-1 inline h-3 w-3" />
                      {r.approvalDecision}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-400">
                    Tools: {r.toolsUsed.join(', ')} · Outcome: {r.outcome}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'prefs' && workspace && (
            <div className="os-panel rounded-2xl p-5 space-y-5">
              <h2 className="font-display text-lg font-bold text-white">Personal Context, Tone, Memories &amp; Notifications</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-300">Preferred Agent Tone</label>
                  <select
                    value={workspace.tone}
                    onChange={async (e) => {
                      await api.updatePersonalPreferences({
                        tone: e.target.value as PersonalWorkspace['tone'],
                      });
                      await load();
                    }}
                    className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                  >
                    <option value="concise">Concise</option>
                    <option value="analytical">Analytical</option>
                    <option value="friendly">Friendly</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">Avatar Initials</label>
                  <input
                    maxLength={3}
                    value={workspace.avatarLabel}
                    onChange={async (e) => {
                      await api.updatePersonalPreferences({ avatarLabel: e.target.value.toUpperCase() });
                      await load();
                    }}
                    className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-300">Personal Memories</div>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
                  {workspace.memories.map((mem, idx) => (
                    <li key={idx} className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2">
                      {mem}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  <input
                    value={newMemory}
                    onChange={(e) => setNewMemory(e.target.value)}
                    placeholder="Add a personal preference memory..."
                    className="flex-1 rounded-lg border border-white/15 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newMemory.trim()) return;
                      await api.updatePersonalPreferences({ memories: [...workspace.memories, newMemory.trim()] });
                      setNewMemory('');
                      await load();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Bell className="h-3.5 w-3.5 text-violet-400" /> Notification Settings
                </div>
                {(['taskDone', 'approvalRequired', 'recurringAlerts'] as const).map((k) => (
                  <label key={k} className="flex items-center justify-between text-slate-300">
                    <span>{k === 'taskDone' ? 'Task completed alerts' : k === 'approvalRequired' ? 'Approval required alerts' : 'Recurring monitor alerts'}</span>
                    <input
                      type="checkbox"
                      checked={workspace.notifications[k]}
                      onChange={async (e) => {
                        await api.updatePersonalPreferences({
                          notifications: { ...workspace.notifications, [k]: e.target.checked },
                        });
                        await load();
                      }}
                      className="accent-violet-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
