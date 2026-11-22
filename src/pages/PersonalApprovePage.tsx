import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { WAITLIST_CONFIG } from '@shared/constants';
import type { WaitlistEntry, WaitlistTrackerSummary } from '@shared/types';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';

export function PersonalApprovePage() {
  const [searchParams] = useSearchParams();
  const { showToast } = useApp();

  const token = searchParams.get('token') || '';
  const dataParam = searchParams.get('data');

  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [tracker, setTracker] = useState<WaitlistTrackerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!token) {
        setError('Missing waitlist approval token in URL.');
        setLoading(false);
        return;
      }
      try {
        // Inspect and immediately verify the approval token
        const inspected = await api.inspectWaitlistApproval(token, dataParam);
        if (!active) return;
        setEntry(inspected.entry);
        // Auto-approve immediately when kingwizemusic@gmail.com clicks the instant approval link
        if (inspected.entry.status === 'PENDING') {
          setApproving(true);
          const approved = await api.approveWaitlistByToken(token, dataParam);
          if (!active) return;
          setEntry(approved.entry);
          setTracker(approved.tracker);
          showToast(`Instantly approved ${approved.entry.name} for Free Personal Agent access!`);
        } else {
          const t = await api.getWaitlistTracker();
          if (active) setTracker(t.tracker);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to verify approval link.');
      } finally {
        if (active) {
          setLoading(false);
          setApproving(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [token, dataParam, showToast]);

  const copyAccessLink = async () => {
    if (!entry?.accessUrl) return;
    try {
      await navigator.clipboard.writeText(entry.accessUrl);
      showToast('Copied unlocked Personal Agent access link to clipboard.');
    } catch {
      showToast('Copy failed — select and copy the link manually.');
    }
  };

  const mailtoUserHref = entry
    ? `mailto:${encodeURIComponent(entry.email)}?subject=${encodeURIComponent(
        'You Are Approved! Your Free SEO OS Personal Agent Access Is Live'
      )}&body=${encodeURIComponent(
        `Hi ${entry.name},\n\nYou have been approved off the SEO OS Personal Agent Waitlist (#${entry.queuePosition})!\n\nClick your personal unlock link below to launch your free Personal Agent workspace:\n${entry.accessUrl}\n\n— Approved by ${WAITLIST_CONFIG.approverEmail}`
      )}`
    : '#';

  return (
    <div className="os-grid-bg flex min-h-screen flex-col items-center justify-center bg-[#070913] px-4 py-12 text-slate-100">
      <div className="os-glass w-full max-w-2xl rounded-2xl p-7 shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-4">
          <Link to="/" className="font-display text-sm font-bold text-white">
            SEO OS <span className="text-cyan-400">AI Workbench</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-0.5 font-mono-tech text-[10px] text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" /> Approver: {WAITLIST_CONFIG.approverEmail}
          </span>
        </div>

        {loading || approving ? (
          <div className="py-12 text-center text-sm text-slate-300">
            Verifying waitlist approval token and provisioning free Personal Agent access...
          </div>
        ) : error || !entry ? (
          <div className="py-8 text-center space-y-4">
            <XCircle className="mx-auto h-12 w-12 text-rose-400" />
            <h1 className="font-display text-2xl font-bold text-white">Invalid Approval Link</h1>
            <p className="text-sm text-slate-400">{error || 'This approval token could not be verified.'}</p>
            <Link
              to="/personal"
              className="inline-block rounded-xl bg-violet-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-violet-400"
            >
              Return to Waitlist Tracker
            </Link>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-400/45 bg-emerald-500/15 p-4">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" />
              <div>
                <div className="font-mono-tech text-[10px] uppercase tracking-wider text-emerald-300">
                  Instant Approval Confirmed · Queue #{entry.queuePosition}
                </div>
                <h1 className="mt-1 font-display text-xl font-bold text-white">
                  {entry.name} Is Now Approved for Free Personal Agent Access
                </h1>
                <p className="mt-1 text-xs text-emerald-100/85">
                  Approved by {entry.approvedBy || WAITLIST_CONFIG.approverEmail}. The waitlist tracker has been updated.
                </p>
              </div>
            </div>

            {/* Full Submitted Setup Information */}
            <div className="rounded-xl border border-white/10 bg-slate-950/75 p-4 space-y-2.5 text-xs">
              <div className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-400">
                Applicant Personal Agent Setup Profile
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-slate-500">Name:</span> <strong className="text-white">{entry.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Email:</span> <strong className="text-cyan-300">{entry.email}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Role / Title:</span> <strong className="text-slate-200">{entry.roleTitle}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Preferred Tone:</span>{' '}
                  <strong className="uppercase text-violet-300">{entry.preferredTone}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Requested Tools:</span>{' '}
                  <strong className="text-slate-200">
                    {[
                      entry.wantsBrowser ? 'Browser' : null,
                      entry.wantsFiles ? 'Files' : null,
                      entry.wantsTerminal ? 'Optional Terminal' : null,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Website:</span>{' '}
                  <strong className="text-slate-200">{entry.websiteUrl || 'Not provided'}</strong>
                </div>
              </div>
              <div className="border-t border-white/10 pt-2">
                <div className="text-slate-500">Primary Use Case / Setup Notes:</div>
                <p className="mt-1 text-slate-200">{entry.useCase}</p>
              </div>
            </div>

            {/* Shareable Unlocked Access Link for the Approved User */}
            <div className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
                <Sparkles className="h-4 w-4" />
                User&apos;s Unlocked Personal Agent Access Link
              </div>
              <div className="break-all rounded-lg border border-white/10 bg-slate-950 p-2.5 font-mono-tech text-[11px] text-cyan-100">
                {entry.accessUrl}
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={mailtoUserHref}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email Unlock Link to {entry.name}
                </a>
                <button
                  type="button"
                  onClick={copyAccessLink}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Unlock Link
                </button>
                <Link
                  to={`/personal/agent?access=${encodeURIComponent(entry.accessToken)}${dataParam ? `&data=${encodeURIComponent(dataParam)}` : ''}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/40 bg-violet-500/20 px-4 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/30"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Unlocked Personal Agent
                </Link>
              </div>
            </div>

            {tracker && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-emerald-400" />
                  Running Waitlist Tracker Updated
                </span>
                <span className="font-mono-tech text-[11px]">
                  Total: <strong className="text-white">{tracker.totalJoined}</strong> · Approved:{' '}
                  <strong className="text-emerald-300">{tracker.approvedCount}</strong> · Pending:{' '}
                  <strong className="text-amber-300">{tracker.pendingCount}</strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
