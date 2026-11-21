import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Brain, CheckCircle2, Cpu, Shield, Users } from 'lucide-react';
import { PRICING } from '@shared/constants';
import { WalkthroughModal } from '@/components/WalkthroughModal';

export function BusinessOverviewPage() {
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/80 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="font-display text-sm font-bold text-white">
            ← SEO OS <span className="text-cyan-400">AI Workbench</span>
          </Link>
          <Link
            to="/checkout"
            className="rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300"
          >
            Start Business Setup ($997)
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 font-mono-tech text-xs text-cyan-200">
          Paid Business Workspace · {PRICING.shortHeadline}
        </span>
        <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
          The Full SEO OS Spatial Desk With AI Coworkers &amp; Enterprise Controls
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-300">
          Built for SEO agencies, growth teams, and marketing operations. Run parallel specialist desks, maintain evidence-backed client second brains, configure persistent AI coworkers inside Business Spaces, and govern every action with approval policies and audit trails.
        </p>

        {/* Explicit Commercial Summary */}
        <div className="mt-8 rounded-2xl border border-cyan-400/45 bg-slate-950/90 p-6">
          <h2 className="font-display text-lg font-bold text-white">Exact Commercial Structure</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <div className="font-mono-tech text-[11px] text-slate-400">STEP 1 · PAID TODAY</div>
              <div className="mt-1 font-display text-3xl font-extrabold text-white">$997</div>
              <div className="mt-1 text-xs text-slate-300">One-time Business Workspace setup fee</div>
            </div>
            <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-4">
              <div className="font-mono-tech text-[11px] text-emerald-300">STEP 2 · INCLUDED AFTER SETUP</div>
              <div className="mt-1 font-display text-2xl font-extrabold text-emerald-200">First 2 Months</div>
              <div className="mt-1 text-xs text-emerald-200/80">Included immediately after verified setup payment</div>
            </div>
            <div className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 p-4">
              <div className="font-mono-tech text-[11px] text-cyan-300">STEP 3 · BEGINNING MONTH 3</div>
              <div className="mt-1 font-display text-2xl font-extrabold text-cyan-200">$2,400/month</div>
              <div className="mt-1 text-xs text-cyan-200/80">Ongoing subscription; cancelable prior to renewal</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/checkout"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
            >
              Start Business Setup ($997) <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setWalkthroughOpen(true)}
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10"
            >
              Book a Business Walkthrough
            </button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { icon: Cpu, title: 'Central Orchestrator & 9 Specialist Desks', desc: 'Technical audit, keyword research, GSC/GA4, competitors, schema, content, local SEO, GEO/AI search, and final planning.' },
            { icon: Brain, title: 'Client Second Brain & Provenance', desc: 'Every recommendation links to captured evidence, confidence scores, tool receipts, and timestamps.' },
            { icon: Users, title: 'Configurable Business AI Coworkers', desc: 'Define roles, instructions, tool allowlists, schedules, computer panels, and default Business Spaces.' },
            { icon: Shield, title: 'Enterprise Admin & Deployment Readiness', desc: 'RBAC, tool blocklists, redacted audit trails, data export/deletion, plus SSO/SCIM & K8s deployment interfaces.' },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="os-panel rounded-xl p-5">
                <Icon className="h-5 w-5 text-cyan-400" />
                <h3 className="mt-3 font-display text-base font-bold text-white">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-white/10 bg-slate-900/50 p-4 text-xs text-slate-300">
          <CheckCircle2 className="mr-1.5 inline h-4 w-4 text-cyan-400" />
          Paid access is provisioned strictly after server-side payment webhook verification — never merely because a browser returned from checkout.
        </div>
      </main>

      <WalkthroughModal open={walkthroughOpen} onClose={() => setWalkthroughOpen(false)} />
    </div>
  );
}
