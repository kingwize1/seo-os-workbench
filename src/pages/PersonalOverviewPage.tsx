import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { WAITLIST_CONFIG } from '@shared/constants';
import type { WaitlistEntry, WaitlistTrackerSummary } from '@shared/types';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';

export function PersonalOverviewPage() {
  const { showToast } = useApp();

  const [tracker, setTracker] = useState<WaitlistTrackerSummary | null>(null);
  const [viewerEntry, setViewerEntry] = useState<WaitlistEntry | null>(null);

  // Setup & Waitlist Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [useCase, setUseCase] = useState('');
  const [preferredTone, setPreferredTone] = useState<WaitlistEntry['preferredTone']>('analytical');
  const [wantsBrowser, setWantsBrowser] = useState(true);
  const [wantsFiles, setWantsFiles] = useState(true);
  const [wantsTerminal, setWantsTerminal] = useState(false);

  const [lookupEmail, setLookupEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTracker = useCallback(async (checkEmail?: string) => {
    const res = await api.getWaitlistTracker({ email: checkEmail });
    setTracker(res.tracker);
    if (res.viewerEntry) {
      setViewerEntry(res.viewerEntry);
    }
  }, []);

  useEffect(() => {
    void loadTracker();
  }, [loadTracker]);

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.joinWaitlist({
        name,
        email,
        roleTitle,
        useCase,
        preferredTone,
        wantsBrowser,
        wantsFiles,
        wantsTerminal,
        websiteUrl,
      });
      setViewerEntry(res.entry);
      setTracker(res.tracker);
      showToast(
        `Joined waitlist at #${res.entry.queuePosition}! Approval details sent to ${WAITLIST_CONFIG.approverEmail}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit waitlist application.');
    } finally {
      setBusy(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupEmail.trim()) return;
    const res = await api.getWaitlistTracker({ email: lookupEmail.trim() });
    setTracker(res.tracker);
    if (res.viewerEntry) {
      setViewerEntry(res.viewerEntry);
      showToast(`Waitlist status for ${res.viewerEntry.email}: ${res.viewerEntry.status}`);
    } else {
      showToast('No waitlist submission found for that email yet.');
    }
  };

  const mailtoBackupHref = viewerEntry
    ? `mailto:${WAITLIST_CONFIG.approverEmail}?subject=${encodeURIComponent(
        `[SEO OS Waitlist #${viewerEntry.queuePosition}] Approve Personal Agent: ${viewerEntry.name} (${viewerEntry.email})`
      )}&body=${encodeURIComponent(
        `New Personal Agent Waitlist Setup Submission\n\nQueue Position: #${viewerEntry.queuePosition}\nName: ${viewerEntry.name}\nEmail: ${viewerEntry.email}\nRole: ${viewerEntry.roleTitle}\nWebsite: ${viewerEntry.websiteUrl || 'N/A'}\nPreferred Tone: ${viewerEntry.preferredTone}\nRequested Tools: Browser=${viewerEntry.wantsBrowser}, Files=${viewerEntry.wantsFiles}, Terminal=${viewerEntry.wantsTerminal}\nUse Case: ${viewerEntry.useCase}\n\nINSTANT APPROVAL LINK:\n${viewerEntry.approvalUrl}`
      )}`
    : '#';

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <Link to="/" className="font-display text-sm font-bold text-white">
            ← SEO OS <span className="text-cyan-400">AI Workbench</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/business"
              className="rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
            >
              Skip Queue: Business SEO OS ($997 Setup)
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 space-y-10">
        {/* Hero Header */}
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 font-mono-tech text-xs text-violet-200">
            <Bot className="h-3.5 w-3.5" /> Personal Agent Free Access Waitlist · Founder-Reviewed
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
            Join the Waitlist to Gain Free Access to the Personal AI Agent
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            Submit your Personal Agent setup preferences below to reserve your spot. Every submission is routed directly to{' '}
            <strong className="text-violet-200">{WAITLIST_CONFIG.approverEmail}</strong> with a one-click instant approval link so your isolated workspace unlocks as soon as you&apos;re approved.
          </p>
        </div>

        {/* Live Running Waitlist Tracker Banner */}
        <section aria-label="Running Waitlist Tracker" className="os-glass rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <h2 className="font-display text-base font-bold text-white">Live Running Waitlist Tracker</h2>
            </div>
            <span className="font-mono-tech text-[11px] text-slate-400">
              Approvals routed to: <strong className="text-cyan-300">{WAITLIST_CONFIG.approverEmail}</strong>
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/75 p-4">
              <div className="flex items-center gap-1.5 font-mono-tech text-[10px] uppercase text-slate-400">
                <Users className="h-3.5 w-3.5 text-violet-400" /> Total Waitlist Joined
              </div>
              <div className="mt-1 font-display text-3xl font-extrabold text-white">
                {tracker?.totalJoined ?? WAITLIST_CONFIG.seededBaseCount}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">Cumulative Personal Agent requests</div>
            </div>
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
              <div className="flex items-center gap-1.5 font-mono-tech text-[10px] uppercase text-amber-300">
                <Clock className="h-3.5 w-3.5" /> Awaiting Approval
              </div>
              <div className="mt-1 font-display text-3xl font-extrabold text-amber-200">
                {tracker?.pendingCount ?? WAITLIST_CONFIG.seededBaseCount - WAITLIST_CONFIG.seededApprovedCount}
              </div>
              <div className="mt-0.5 text-[11px] text-amber-200/80">Queued for instant review link</div>
            </div>
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-1.5 font-mono-tech text-[10px] uppercase text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approved &amp; Unlocked
              </div>
              <div className="mt-1 font-display text-3xl font-extrabold text-emerald-200">
                {tracker?.approvedCount ?? WAITLIST_CONFIG.seededApprovedCount}
              </div>
              <div className="mt-0.5 text-[11px] text-emerald-200/80">Free Personal Agent seats active</div>
            </div>
          </div>

          {tracker && tracker.recentSignups.length > 0 && (
            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="mb-2 font-mono-tech text-[10px] uppercase tracking-wider text-slate-400">
                Recent Waitlist Queue Activity
              </div>
              <div className="flex flex-wrap gap-2">
                {tracker.recentSignups.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/75 px-3 py-1.5 text-xs"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/25 font-mono-tech text-[10px] font-bold text-violet-200">
                      {item.initials}
                    </span>
                    <div>
                      <span className="font-mono-tech text-[10px] text-slate-400">#{item.queuePosition}</span>{' '}
                      <span className="font-medium text-slate-200">{item.roleTitle}</span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono-tech text-[9px] ${
                        item.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : item.status === 'REJECTED'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Main 2-Column Waitlist Setup Form + Status / Instant Approval Info */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Personal Agent Setup & Waitlist Form */}
          <form onSubmit={handleJoinWaitlist} className="os-panel space-y-4 rounded-2xl p-6 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">
                Personal Agent Setup &amp; Waitlist Application
              </h2>
              <span className="font-mono-tech text-[10px] text-violet-300">FREE ON APPROVAL</span>
            </div>
            <p className="text-xs text-slate-400">
              Your setup preferences below are pre-loaded into your isolated Personal Agent workspace the moment your approval link is clicked.
            </p>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Full Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Rivera"
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Email Address *</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@example.com"
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Your Role / Profession *</label>
                <input
                  required
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Solo Founder, SEO Consultant, Creator"
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Website / LinkedIn (Optional)</label>
                <input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://yoursite.com"
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                What do you want your Personal Agent to help with? *
              </label>
              <textarea
                required
                rows={3}
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="e.g. Weekly SERP & competitor research, drafting briefs with sources, tracking page monitors and personal goals..."
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Preferred Agent Tone</label>
                <select
                  value={preferredTone}
                  onChange={(e) => setPreferredTone(e.target.value as WaitlistEntry['preferredTone'])}
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  <option value="analytical">Analytical (Evidence-first)</option>
                  <option value="concise">Concise (Bullet-first)</option>
                  <option value="executive">Executive (Decision-ready)</option>
                  <option value="friendly">Friendly (Conversational)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-slate-300">Requested Personal Capabilities</div>
                <div className="flex flex-wrap gap-3 pt-1 text-xs text-slate-300">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={wantsBrowser} onChange={(e) => setWantsBrowser(e.target.checked)} className="accent-violet-500" />
                    Browser
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={wantsFiles} onChange={(e) => setWantsFiles(e.target.checked)} className="accent-violet-500" />
                    Files
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={wantsTerminal} onChange={(e) => setWantsTerminal(e.target.checked)} className="accent-violet-500" />
                    Optional Terminal
                  </label>
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-sm font-bold text-white transition hover:bg-violet-400 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {busy ? 'Submitting Setup & Sending Approval Email...' : 'Join the Waitlist & Request Free Access'}
            </button>
          </form>

          {/* Right: Live Application Status Card + Status Checker */}
          <div className="space-y-4 lg:col-span-5">
            {viewerEntry ? (
              <div className="os-glass rounded-2xl border-violet-400/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tech text-[10px] uppercase text-violet-300">
                    Your Waitlist Position
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 font-mono-tech text-[10px] font-bold ${
                      viewerEntry.status === 'APPROVED'
                        ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                        : viewerEntry.status === 'REJECTED'
                          ? 'border-rose-400/50 bg-rose-500/20 text-rose-200'
                          : 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                    }`}
                  >
                    #{viewerEntry.queuePosition} · {viewerEntry.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-display text-lg font-bold text-white">{viewerEntry.name}</h3>
                  <p className="text-xs text-slate-400">{viewerEntry.email} · {viewerEntry.roleTitle}</p>
                </div>

                {/* Email Dispatch Status to kingwizemusic@gmail.com */}
                <div className="rounded-xl border border-white/10 bg-slate-950/80 p-3.5 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-cyan-200">
                      <Mail className="h-3.5 w-3.5" /> Approval Notification
                    </span>
                    <span className="font-mono-tech text-[9px] text-amber-300">
                      {viewerEntry.emailDispatchStatus}
                    </span>
                  </div>
                  <p className="text-slate-300">{viewerEntry.emailDispatchDetail}</p>
                  <p className="text-[11px] text-slate-400">
                    Recipient: <strong className="text-slate-200">{WAITLIST_CONFIG.approverEmail}</strong> (includes full setup details + 1-click instant approval link).
                  </p>
                  {viewerEntry.emailDispatchStatus !== 'SENT_LIVE' && viewerEntry.emailDispatchStatus !== 'RELAY_SENT' && (
                    <a
                      href={mailtoBackupHref}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/25"
                    >
                      <Mail className="h-3 w-3" /> Send Direct Approval Email Fallback
                    </a>
                  )}
                </div>

                {viewerEntry.status === 'APPROVED' ? (
                  <Link
                    to="/personal/agent"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300"
                  >
                    <Sparkles className="h-4 w-4" />
                    You&apos;re Approved — Launch Free Personal Agent <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100 space-y-2">
                    <div>
                      <strong>Pending Approval:</strong> Once <code className="text-white">{WAITLIST_CONFIG.approverEmail}</code> clicks the instant approval link emailed to them, your free Personal Agent access unlocks immediately.
                    </div>
                    {viewerEntry.approvalUrl && (
                      <a
                        href={viewerEntry.approvalUrl}
                        className="inline-flex items-center gap-1 font-mono-tech text-[10px] text-cyan-300 underline hover:text-cyan-200"
                      >
                        <ExternalLink className="h-3 w-3" /> Founder Preview: Open Instant Approval Link
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="os-panel rounded-2xl p-5 space-y-3 text-xs text-slate-300">
                <h3 className="font-display text-base font-bold text-white">How Free Personal Agent Approval Works</h3>
                <ol className="list-decimal space-y-2 pl-4 text-slate-300">
                  <li>Complete the Personal Agent setup form on the left to claim your place in the live running queue.</li>
                  <li>Your submitted details and a signed <strong>Instant Approval Link</strong> are emailed directly to <strong className="text-cyan-300">{WAITLIST_CONFIG.approverEmail}</strong>.</li>
                  <li>Once approved in one click, your isolated Personal Agent unlocks with your preferred tone, browser takeover, durable plans, goals, and receipts.</li>
                </ol>
              </div>
            )}

            {/* Check Existing Waitlist Status */}
            <form onSubmit={handleLookup} className="os-panel rounded-2xl p-4 space-y-2.5">
              <div className="text-xs font-semibold text-white">Already on the Waitlist? Check Your Status</div>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  placeholder="Enter your submitted email..."
                  className="flex-1 rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  Check
                </button>
              </div>
            </form>

            <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3.5 text-xs text-emerald-200">
              <ShieldCheck className="mr-1.5 inline h-4 w-4" />
              <strong>Strict Isolation:</strong> Approved Personal Agent workspaces never expose business organization controls, client domains, or enterprise coworker administration.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
