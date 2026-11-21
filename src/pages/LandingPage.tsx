import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bot,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  Cpu,
  FileText,
  FolderKanban,
  Layers,
  Lock,
  Plug,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { PRICING } from '@shared/constants';
import { WalkthroughModal } from '@/components/WalkthroughModal';

const FAQS = [
  {
    q: 'How do the $997 setup fee, two-month included period, and $2,400/month subscription work?',
    a: 'Business Workspace begins with a one-time $997 setup fee paid at checkout. Immediately after your payment event is verified server-side, your first two months (60 days) of Business Workspace access are included with no additional monthly charge. At the end of that two-month included period, the ongoing subscription bills at $2,400/month unless you cancel beforehand.',
  },
  {
    q: 'Is the Business Workspace a "free trial"?',
    a: 'No. We never describe Business Workspace as free. The $997 one-time setup fee is paid first, and your first two months are included after setup before the $2,400/month recurring subscription starts. If you want a free-to-try entry point for individual productivity, use the Personal Agent path.',
  },
  {
    q: 'What is the difference between the Personal Agent path and the Business Workspace path?',
    a: 'The Personal Agent is free to try and built for individual research, durable task plans, browser takeover, goals, recurring checks, and personal receipts — strictly isolated from business data. Business Workspace is the paid SEO OS desk with multi-client workspaces, 9 SEO specialist desks, persistent AI coworkers, Business Spaces, team RBAC, approval policies, and audit trails.',
  },
  {
    q: 'Who owns our client websites, briefs, knowledge brain, and exported artifacts?',
    a: 'Your organization owns 100% of its client workspaces, Knowledge Brain claims, Spaces pages, and exported artifacts. You can export your tenant data bundle in JSON or Markdown at any time and request full tenant deletion from Organization Admin.',
  },
  {
    q: 'How do integrations, API keys, and AI actions stay secure?',
    a: 'Provider credentials are stored encrypted on the server and are never exposed in the browser. Safe defaults are enabled out of the box: read-only research tools run first, while writes, CMS publishing, outbound messages, terminal commands, and deletions pause behind human approval cards and generate redacted audit receipts.',
  },
  {
    q: 'Can we cancel before the $2,400/month recurring billing begins?',
    a: 'Yes. You can cancel or downgrade your subscription from Organization Admin or your billing portal prior to the end of the two-month included period so no recurring $2,400/month charge is billed.',
  },
];

export function LandingPage() {
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100">
      {/* Public Navigation */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070913]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400 font-display text-sm font-extrabold text-slate-950">
              OS
            </span>
            <div>
              <div className="font-display text-sm font-bold leading-none text-white">
                SEO OS <span className="text-cyan-400">AI Workbench</span>
              </div>
              <div className="font-mono-tech text-[10px] text-slate-400">Spatial Desk · Agents · Coworkers</div>
            </div>
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <Link to="/personal" className="hover:text-white">Personal Agent</Link>
            <Link to="/business" className="hover:text-white">Business Workspace</Link>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
            <Link to="/desk" className="font-medium text-cyan-300 hover:text-cyan-200">Open Desk</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/personal/agent"
              className="hidden rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10 sm:inline-flex"
            >
              Try the Personal Agent
            </Link>
            <Link
              to="/checkout"
              className="rounded-lg bg-cyan-400 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Start Business Setup
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="os-grid-bg relative overflow-hidden border-b border-white/10 pb-20 pt-16 sm:pt-24">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[760px] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/35 bg-cyan-500/10 px-3.5 py-1 font-mono-tech text-xs text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              SEO Operating System + Personal Agent + Governed AI Coworkers
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-white sm:text-6xl">
              One Spatial AI Workbench for SEO, Marketing Ops &amp; Business Execution
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">
              Built on the dark, high-signal <strong>SEO OS</strong> desk metaphor. Dispatch outcomes from a central orchestrator, inspect specialist desks and evidence-backed client brains, collaborate with persistent AI coworkers, and require human approval before consequential actions.
            </p>

            {/* Three Primary Calls to Action */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/personal/agent"
                className="inline-flex items-center gap-2 rounded-xl border border-violet-400/45 bg-violet-500/20 px-5 py-3 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/30"
              >
                <Bot className="h-4 w-4" />
                Try the Personal Agent
              </Link>
              <Link
                to="/checkout"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-300"
              >
                Start Business Setup ($997)
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setWalkthroughOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Book a Business Walkthrough
              </button>
            </div>
            <p className="mt-4 font-mono-tech text-xs text-slate-400">
              Business Workspace: <strong className="text-slate-200">$997 one-time setup</strong> · First 2 months included · Then <strong className="text-slate-200">$2,400/month</strong> · Personal Agent free to try
            </p>
          </div>

          {/* Simplified Interactive SEO OS Desk Visual Preview */}
          <div className="os-glass mx-auto mt-14 max-w-6xl overflow-hidden rounded-2xl shadow-2xl shadow-black/70">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-950/90 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 font-mono-tech text-[11px] text-slate-300">
                  SEO OS Desk Preview — apexcloudhealth.example
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono-tech text-[10px]">
                <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-amber-200">
                  2 Approvals Pending
                </span>
                <span className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-cyan-200">
                  3D Office + 2D Accessible
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-12">
              {/* Spatial Floor Preview */}
              <div className="space-y-3 lg:col-span-8">
                <div className="rounded-xl border border-cyan-400/30 bg-gradient-to-br from-slate-900/90 via-indigo-950/50 to-slate-950 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-cyan-400" />
                      <span className="font-display text-sm font-bold text-white">Central Orchestrator Dais</span>
                    </div>
                    <span className="font-mono-tech text-[10px] text-emerald-300">
                      Knowledge Brain Chandelier · 7 Verified Claims
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {[
                      { name: 'Technical Audit', status: 'DONE', color: 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10' },
                      { name: 'Keyword Research', status: 'DONE', color: 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10' },
                      { name: 'GSC & Analytics', status: 'FAILED (Retry)', color: 'border-rose-500/50 text-rose-300 bg-rose-500/15' },
                      { name: 'Schema Draft', status: 'REVIEW', color: 'border-amber-400/50 text-amber-200 bg-amber-500/15' },
                      { name: 'Content Strategy', status: 'RUNNING 72%', color: 'border-cyan-400/50 text-cyan-200 bg-cyan-500/15' },
                      { name: 'Local SEO', status: 'SKIPPED (Soft)', color: 'border-dashed border-slate-500 text-slate-400 bg-slate-800/40' },
                    ].map((desk) => (
                      <div key={desk.name} className="rounded-lg border border-white/10 bg-slate-950/75 p-2.5">
                        <div className="text-xs font-semibold text-slate-100">{desk.name}</div>
                        <span className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 font-mono-tech text-[9px] ${desk.color}`}>
                          {desk.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coworker + OS Report Window Preview */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-violet-400/25 bg-slate-950/80 p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">📝 Devon Park · Content Planner</span>
                      <span className="font-mono-tech text-[10px] text-amber-300">APPROVAL GATE</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">
                      Drafted Epic EHR integration brief in Business Spaces. Paused before CMS staging until human review.
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-400/25 bg-slate-950/80 p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">📄 Technical Audit Window</span>
                      <span className="font-mono-tech text-[10px] text-emerald-300">93% CONFIDENCE</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">
                      Surfaces 318 uncanonicalized docs URLs and 6 high-LCP pages with direct evidence links &amp; timestamps.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Preview: Task Feed & Approval Card */}
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/85 p-3.5 lg:col-span-4">
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs font-semibold text-white">
                    <span>Live Task Feed &amp; Governance</span>
                    <Activity className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <div className="mt-2.5 space-y-2 text-[11px]">
                    <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-2.5 text-amber-100">
                      <strong>Approval Required:</strong> Save JSON-LD Schema Blueprint to Business Space (Read-only tools run first; writes require approval).
                    </div>
                    <div className="rounded-lg border border-violet-400/35 bg-violet-500/10 p-2.5 text-violet-200">
                      <strong>Phase 3 Gate (BLOCKED):</strong> Final 90-day plan waits for GSC retry &amp; Schema approval; ignores Local SEO soft skip.
                    </div>
                    <div className="rounded-lg border border-white/10 bg-slate-900/70 p-2.5 text-slate-300">
                      <strong>Audit Receipt:</strong> Every tool call logs actor, coworker, redacted inputs, approval decision, and result.
                    </div>
                  </div>
                </div>
                <Link
                  to="/desk"
                  className="block rounded-lg border border-cyan-400/40 bg-cyan-500/15 py-2 text-center text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
                >
                  Explore Interactive SEO OS Desk →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Clear Paths */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <span className="font-mono-tech text-xs uppercase tracking-wider text-cyan-400">Two Integrated Paths</span>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">
            Start Lightweight with a Personal Agent — Scale Into the Full SEO OS Business Desk
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="os-panel flex flex-col justify-between rounded-2xl p-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-200">
                  <Bot className="h-3.5 w-3.5" /> Personal Agent Path
                </span>
                <span className="font-mono-tech text-xs font-semibold text-emerald-300">Free to Try</span>
              </div>
              <h3 className="mt-4 font-display text-2xl font-bold text-white">Individual AI Productivity</h3>
              <p className="mt-2 text-sm text-slate-300">
                A responsive personal agent inspired by OpenFuse. Helps research public web sources, maintains durable task plans with pause/resume/retry controls, supports human browser takeover, tracks goals and recurring checks, and saves verifiable receipts — completely isolated from business tenants.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-violet-400" /> Visible multi-step plans &amp; follow-up queue</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-violet-400" /> Browser research, human takeover &amp; opt-in terminal/files</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-violet-400" /> Personal preferences, memories, goals &amp; saved receipts</li>
              </ul>
            </div>
            <Link
              to="/personal/agent"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-violet-500/20 px-5 py-2.5 text-sm font-semibold text-violet-100 hover:bg-violet-500/30"
            >
              Try the Personal Agent <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="os-panel flex flex-col justify-between rounded-2xl border-cyan-400/40 p-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-200">
                  <Layers className="h-3.5 w-3.5" /> Business Workspace Path
                </span>
                <span className="font-mono-tech text-xs font-semibold text-cyan-300">$997 Setup · $2,400/mo</span>
              </div>
              <h3 className="mt-4 font-display text-2xl font-bold text-white">Full SEO OS Desk &amp; Enterprise Coworkers</h3>
              <p className="mt-2 text-sm text-slate-300">
                The main paid operating system for agencies and marketing teams. Combines the 3D/2D SEO OS spatial desk, 9 specialist desks, per-client Knowledge Brains, persistent AI coworkers with Spaces &amp; computer panels, and enterprise governance controls.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Central orchestrator, phase gates &amp; evidence-backed reports</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Configurable AI coworkers, Spaces, pages &amp; MCP tool allowlists</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Team RBAC, human-in-the-loop approval gates &amp; full audit logs</li>
              </ul>
            </div>
            <Link
              to="/checkout"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300"
            >
              Start Business Setup ($997) <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y border-white/10 bg-slate-950/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <span className="font-mono-tech text-xs uppercase tracking-wider text-cyan-400">How It Works</span>
            <h2 className="mt-2 font-display text-3xl font-bold text-white">
              Transparent, Human-Supervised Execution From Outcome to Approved Artifact
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-5">
            {[
              { step: '01', title: 'Ask for an Outcome', desc: 'Give the orchestrator or coworker a clear business or SEO goal.' },
              { step: '02', title: 'Agents Plan', desc: 'Visible multi-phase plan with dependencies, soft skips & phase gates.' },
              { step: '03', title: 'Agents Work', desc: 'Specialists research, crawl, cluster & draft in parallel background queues.' },
              { step: '04', title: 'User Reviews', desc: 'Inspect confidence scores, source links & redacted approval cards.' },
              { step: '05', title: 'Approved Results', desc: 'Approved outputs become Space pages, reports, or gated actions with audit receipts.' },
            ].map((item) => (
              <div key={item.step} className="os-panel rounded-xl p-4">
                <div className="font-mono-tech text-xs font-bold text-cyan-400">STEP {item.step}</div>
                <div className="mt-2 font-display text-base font-bold text-white">{item.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Matrix */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-bold text-white">Built as One Cohesive Operating System</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Every workflow helps research, surfaces opportunities, drafts structured deliverables, and recommends prioritized actions — without making unsupported guarantees.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Brain, title: 'Per-Client Knowledge Brain', desc: 'Structured claims with confidence scores, timestamps, source URLs, and interactive 3D/2D graph inspection.' },
            { icon: Users, title: 'Persistent AI Coworkers', desc: 'Configure name, role, instructions, tool allowlists, schedules, live computer panels, and default Spaces.' },
            { icon: FolderKanban, title: 'Business Spaces & Pages', desc: 'Searchable briefs, nested pages, markdown editor with autosave, revision history, and conversation-to-doc workflows.' },
            { icon: Plug, title: 'Modular Adapters & MCP', desc: 'Connect Search Console, GA4, SERP/backlinks, CMS, and MCP tools behind encrypted server-only credentials.' },
            { icon: ShieldCheck, title: 'Approval Gates & Safe Defaults', desc: 'Read-only tools run first. Writes, publishing, outbound messages, and deletions pause until explicitly approved.' },
            { icon: FileText, title: 'Audit Trails & Persistent Work', desc: 'Every meaningful tool action writes a redacted receipt with actor, coworker, tool, approval decision, and outcome.' },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.title} className="os-panel rounded-xl p-5">
                <Icon className="h-5 w-5 text-cyan-400" />
                <h3 className="mt-3 font-display text-base font-bold text-white">{feat.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold text-white">Personal Agent vs. Business Workspace</h2>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-slate-950/90 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Capability</th>
                <th className="p-4 text-violet-300">Personal Agent (Free to Try)</th>
                <th className="p-4 text-cyan-300">Business Workspace ($997 Setup)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-slate-900/40 text-xs sm:text-sm">
              {[
                ['Commercial Structure', 'Free to try (no credit card required)', '$997 setup · 2 months included · then $2,400/mo'],
                ['Workspace Interface', 'Responsive chat, plans, browser takeover & receipts', 'Full 3D/2D SEO OS spatial desk & OS window manager'],
                ['SEO Specialist Desks & Client Brain', 'Not included (personal scope only)', '9 specialist desks + multi-client Knowledge Brains'],
                ['Persistent AI Coworkers & Spaces', 'Single personal agent', 'Unlimited configurable coworkers + Business Spaces'],
                ['Governance, RBAC & Audit Logs', 'Personal approval boundaries & receipts', 'Org RBAC, tool allowlists, redacted audit logs & export'],
                ['Data Isolation', 'Strictly isolated personal workspace', 'Strict per-organization & per-client tenant boundaries'],
              ].map(([cap, p, b]) => (
                <tr key={cap}>
                  <td className="p-4 font-medium text-white">{cap}</td>
                  <td className="p-4 text-slate-300">{p}</td>
                  <td className="p-4 text-cyan-100">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Unmistakable Pricing Section */}
      <section id="pricing" className="border-y border-white/10 bg-slate-950/70 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center">
            <span className="font-mono-tech text-xs uppercase tracking-wider text-cyan-400">Transparent Commercial Offer</span>
            <h2 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
              Clear Pricing. Zero Hidden Transitions.
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Start individual tasks with the free-to-try Personal Agent, or deploy your team onto the paid SEO OS Business Workspace.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Personal Card */}
            <div className="os-panel flex flex-col justify-between rounded-2xl p-6">
              <div>
                <h3 className="font-display text-xl font-bold text-white">Personal Agent</h3>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-extrabold text-white">$0</span>
                  <span className="text-sm text-slate-400">Free to try · Individual productivity</span>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Lightweight entry point with durable plans, browser research, human takeover, goals, recurring monitors, and receipts. Does not expose business client workspaces or admin controls.
                </p>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-200">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-violet-400" /> Chat-based tasks with visible plans</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-violet-400" /> Pause, resume, stop, retry &amp; cancel controls</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-violet-400" /> Opt-in terminal &amp; file permissions</li>
                </ul>
              </div>
              <Link
                to="/personal/agent"
                className="mt-6 block rounded-xl border border-violet-400/50 bg-violet-500/20 py-3 text-center text-sm font-semibold text-violet-100 hover:bg-violet-500/30"
              >
                Try the Personal Agent
              </Link>
            </div>

            {/* Paid Business Workspace Card */}
            <div className="relative flex flex-col justify-between rounded-2xl border-2 border-cyan-400/70 bg-gradient-to-b from-cyan-950/40 to-slate-950 p-6 shadow-2xl shadow-cyan-950/50">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-bold text-white">Business Workspace</h3>
                  <span className="rounded-full bg-cyan-400 px-2.5 py-0.5 font-mono-tech text-[10px] font-bold uppercase text-slate-950">
                    SEO OS Desk
                  </span>
                </div>

                {/* Unmistakable 3-part pricing breakdown */}
                <div className="mt-4 rounded-xl border border-cyan-400/35 bg-slate-950/90 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium text-slate-300">1. One-time setup fee (paid today)</span>
                    <span className="font-display text-3xl font-extrabold text-white">$997</span>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between border-t border-white/10 pt-2.5">
                    <span className="text-xs font-medium text-emerald-300">2. Included period after setup</span>
                    <span className="font-mono-tech text-sm font-bold text-emerald-300">First 2 Months Included</span>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between border-t border-white/10 pt-2.5">
                    <span className="text-xs font-medium text-slate-300">3. Ongoing subscription (begins month 3)</span>
                    <span className="font-display text-xl font-bold text-cyan-300">$2,400/month</span>
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5 text-sm text-slate-200">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400" /> Full 3D &amp; accessible 2D SEO OS spatial desk (7 themes)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400" /> Multi-client workspaces, Knowledge Brains &amp; OS windows</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400" /> Persistent AI coworkers, Spaces, MCP &amp; approval policies</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400" /> Server-verified entitlement, RBAC, audit trails &amp; data export</li>
                </ul>
              </div>

              <div className="mt-6 space-y-2.5">
                <Link
                  to="/checkout"
                  className="block rounded-xl bg-cyan-400 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                >
                  Start Business Setup — $997 Today
                </Link>
                <button
                  type="button"
                  onClick={() => setWalkthroughOpen(true)}
                  className="block w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-center text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  Book a Business Walkthrough
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-bold text-white">Frequently Asked Questions</h2>
        <div className="mt-6 space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.q} className="os-panel rounded-xl">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left text-sm font-semibold text-white"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && <div className="border-t border-white/10 px-4 pb-4 pt-3 text-sm leading-relaxed text-slate-300">{item.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/90 py-10 text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <div className="font-display text-sm font-bold text-white">SEO OS AI Workbench</div>
            <p className="mt-1">
              {PRICING.summaryLine}. Clean-room architecture inspired by SEO OS, OpenFuse, OpenDots, and OpenBot governance principles.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/personal" className="hover:text-white">Personal Agent</Link>
            <Link to="/business" className="hover:text-white">Business Workspace</Link>
            <Link to="/checkout" className="hover:text-white">Setup Checkout</Link>
            <Link to="/desk" className="hover:text-white">SEO OS Desk</Link>
          </div>
        </div>
      </footer>

      <WalkthroughModal open={walkthroughOpen} onClose={() => setWalkthroughOpen(false)} />
    </div>
  );
}
