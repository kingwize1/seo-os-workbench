import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Globe, ShieldCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';

export function OnboardingPage() {
  const { session, refreshSession, refreshDesk, showToast } = useApp();
  const navigate = useNavigate();

  const [orgName, setOrgName] = useState(session?.organization?.name || 'Northstar Digital');
  const [clientName, setClientName] = useState('Apex Cloud Health');
  const [clientDomain, setClientDomain] = useState('apexcloudhealth.example');
  const [industry, setIndustry] = useState('B2B Healthcare SaaS');
  const [goalsText, setGoalsText] = useState(
    'Surface technical crawl bottlenecks\nBuild high-intent EHR integration briefs\nImprove GEO & structured schema citations'
  );
  const [safeDefaults, setSafeDefaults] = useState(true);
  const [busy, setBusy] = useState(false);

  const isEntitled =
    session?.entitlement?.status === 'TRIAL_INCLUDED' || session?.entitlement?.status === 'ACTIVE';

  if (!isEntitled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070913] px-4 text-slate-100">
        <div className="os-glass max-w-md rounded-2xl p-6 text-center">
          <h1 className="font-display text-xl font-bold text-white">Verified Checkout Required</h1>
          <p className="mt-2 text-sm text-slate-400">
            Complete the $997 setup checkout and server-side webhook verification before onboarding your Business Workspace.
          </p>
          <Link
            to="/checkout"
            className="mt-5 inline-block rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950"
          >
            Go to Setup Checkout
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.completeOnboarding({
        organizationName: orgName,
        clientName: clientName.trim() || undefined,
        clientDomain: clientDomain.trim() || undefined,
        industry,
        goals: goalsText
          .split('\n')
          .map((g) => g.trim())
          .filter(Boolean),
        safeDefaultsEnabled: safeDefaults,
      });
      await refreshSession();
      await refreshDesk();
      showToast('Onboarding complete! Entering your SEO OS spatial desk.');
      navigate('/desk');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Onboarding failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="os-grid-bg flex min-h-screen items-center justify-center bg-[#070913] px-4 py-12 text-slate-100">
      <div className="os-glass w-full max-w-2xl rounded-2xl p-7 shadow-2xl">
        <div className="flex items-center gap-2 text-emerald-300">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-mono-tech text-xs uppercase tracking-wider">
            Business Entitlement Verified · First 2 Months Included Active
          </span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Configure Your SEO OS Desk</h1>
        <p className="mt-1 text-sm text-slate-400">
          Set your organization name, initial client site, goals, and safe-default tool permissions. Seeded demo data remains clearly labeled until live connectors are added.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Organization Name</label>
              <input
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Industry</label>
              <input
                required
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">First Client / Site Name</label>
              <input
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Primary Domain</label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  required
                  value={clientDomain}
                  onChange={(e) => setClientDomain(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Primary SEO &amp; Business Goals (one per line)</label>
            <textarea
              rows={3}
              value={goalsText}
              onChange={(e) => setGoalsText(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3.5 text-xs text-slate-200">
            <input
              type="checkbox"
              checked={safeDefaults}
              onChange={(e) => setSafeDefaults(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-cyan-400"
            />
            <span>
              <strong className="flex items-center gap-1 text-cyan-200">
                <ShieldCheck className="h-3.5 w-3.5" /> Enable Safe-Default Governance (Recommended)
              </strong>
              Read-only research tools run first. Writes, CMS publishing, outbound messages, terminal execution, and deletions pause for explicit human approval.
            </span>
          </label>

          <div className="flex items-center justify-between pt-2">
            <Link to="/desk" className="text-xs text-slate-400 hover:text-white">
              Skip directly to seeded desk →
            </Link>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
            >
              Enter SEO OS Desk <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
