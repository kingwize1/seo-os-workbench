import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, CheckCircle2, Eye, Globe, ShieldCheck, Terminal } from 'lucide-react';

export function PersonalOverviewPage() {
  return (
    <div className="min-h-screen bg-[#070913] text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/80 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="font-display text-sm font-bold text-white">
            ← SEO OS <span className="text-cyan-400">AI Workbench</span>
          </Link>
          <Link
            to="/personal/agent"
            className="rounded-lg bg-violet-500 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-400"
          >
            Launch Personal Agent
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 font-mono-tech text-xs text-violet-200">
          <Bot className="h-3.5 w-3.5" /> Free-to-Try Individual Path · Strictly Isolated from Business Tenants
        </span>
        <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">
          A Personal AI Agent With Visible Plans, Browser Takeover &amp; Saved Receipts
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-300">
          Try the Personal Agent without entering the paid Business Workspace flow. Request research, inspect durable multi-step plans, pause or retry execution, take over the browser session whenever needed, and keep your personal memories and receipts completely private.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/personal/agent"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-400"
          >
            Try the Personal Agent Now <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/business"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/10"
          >
            Need Multi-Client SEO OS? View Business Workspace
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { icon: Globe, title: 'Browser Research & Human Takeover', desc: 'Inspect cited sources and toggle interactive human takeover whenever a session needs manual input.' },
            { icon: Terminal, title: 'Opt-In Terminal & File Workspace', desc: 'Terminal and file actions remain disabled behind explicit permission toggles until you opt in.' },
            { icon: ShieldCheck, title: 'Clear Approval Boundaries', desc: 'Sensitive actions such as sending messages or running terminal commands pause for explicit approval.' },
            { icon: Eye, title: 'Goals, Recurring Monitors & Receipts', desc: 'Track personal milestones, enable opt-in page checks, and review saved execution receipts.' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="os-panel rounded-xl p-5">
                <Icon className="h-5 w-5 text-violet-400" />
                <h2 className="mt-3 font-display text-base font-bold text-white">{item.title}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{item.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
          <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
          <strong>Tenant Isolation Guarantee:</strong> The Personal Agent workspace never exposes business organization controls, client domains, or enterprise coworker administration.
        </div>
      </main>
    </div>
  );
}
