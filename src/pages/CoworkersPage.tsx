import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bot,
  FilePlus2,
  Globe,
  Monitor,
  Plus,
  Send,
  ShieldAlert,
  Terminal,
  Users,
  Wrench,
} from 'lucide-react';
import { TOOL_REGISTRY } from '@shared/constants';
import type { ApprovalPolicy } from '@shared/types';
import { ApprovalCard } from '@/components/ApprovalCard';
import { DeskShell } from '@/components/DeskShell';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';

export function CoworkersPage() {
  const { coworkerId } = useParams();
  const { desk, activeClientId, refreshDesk, openWindow, showToast } = useApp();
  const navigate = useNavigate();

  // Builder state
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [instructions, setInstructions] = useState(
    'Draft structured recommendations grounded in client brain evidence. Always request approval before writing or publishing.'
  );
  const [selectedTools, setSelectedTools] = useState<string[]>(['browser_read', 'seo_crawl_inspector', 'space_page_draft']);
  const [approvalPolicy, setApprovalPolicy] = useState<ApprovalPolicy>('REQUIRE_APPROVAL_WRITES');
  const [scheduleCron, setScheduleCron] = useState('0 9 * * 1');
  const [defaultSpaceId, setDefaultSpaceId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  // Detail chat + computer panel state
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'coworker'; text: string; time: string }[]>([
    {
      role: 'coworker',
      text: 'Ready inside SEO OS Desk. I operate strictly within my configured tool allowlist and pause write/publish actions for your approval.',
      time: 'Now',
    },
  ]);
  const [computerTab, setComputerTab] = useState<'browser' | 'files' | 'terminal'>('browser');

  const toggleTool = (id: string) => {
    setSelectedTools((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreateCoworker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    setBusy(true);
    try {
      const res = (await api.createCoworker({
        name: name.trim(),
        role: role.trim(),
        instructions: instructions.trim(),
        allowedTools: selectedTools,
        approvalPolicy,
        scheduleCron: scheduleCron.trim() || null,
        defaultSpaceId: defaultSpaceId || desk?.spaces[0]?.id || null,
        clientId: activeClientId,
      })) as { coworker: { id: string } };
      await refreshDesk();
      setName('');
      setRole('');
      showToast('AI Coworker created with explicit tool allowlist & approval policy.');
      navigate(`/desk/coworkers/${res.coworker.id}`);
    } finally {
      setBusy(false);
    }
  };

  // Detail view for a specific coworker
  if (coworkerId && desk) {
    const cw = desk.coworkers.find((c) => c.id === coworkerId);
    if (!cw) {
      return (
        <DeskShell>
          <div className="os-panel rounded-2xl p-6">
            <p className="text-sm text-slate-300">Coworker not found.</p>
            <Link to="/desk/coworkers" className="mt-2 inline-block text-xs text-cyan-400">← Back to Coworkers</Link>
          </div>
        </DeskShell>
      );
    }

    const cwApprovals = desk.approvals.filter((a) => a.coworkerId === cw.id);
    const defaultSpace = desk.spaces.find((s) => s.id === cw.defaultSpaceId) ?? desk.spaces[0];

    const handleSendChat = (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim()) return;
      const userMsg = chatInput.trim();
      setChatInput('');
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: userMsg, time: new Date().toLocaleTimeString() },
        {
          role: 'coworker',
          text: `[Mock Coworker Runtime · ${cw.role}] Analyzed "${userMsg}". Surfaced evidence from Client Brain and drafted structured next steps. Click "Save Thread to Space" or invoke a governed tool below.`,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    };

    const handleSaveConversationToSpace = async () => {
      if (!defaultSpace) return;
      const body = messages.map((m) => `### ${m.role === 'user' ? 'User' : cw.name}\n${m.text}`).join('\n\n');
      await api.savePage({
        spaceId: defaultSpace.id,
        title: `${cw.name} Working Brief (${new Date().toLocaleDateString()})`,
        content: `# Conversation Export — ${cw.name}\n\n${body}`,
      });
      await refreshDesk();
      showToast(`Saved conversation directly to Space "${defaultSpace.name}".`);
    };

    const handleInvokeTool = async (toolId: string, summary: string) => {
      const res = await api.invokeCoworkerTool(cw.id, toolId, summary, {
        coworker: cw.name,
        clientId: activeClientId,
        apiKey: 'sk_test_demo_secret_should_be_redacted',
      });
      await refreshDesk();
      if (res.status === 'APPROVAL_REQUIRED') {
        showToast(`Tool "${toolId}" paused for human approval — see Approval Card below.`);
      } else if (res.status === 'BLOCKED') {
        showToast(`Blocked by policy: ${res.reason}`);
      } else {
        showToast(`Read-only tool "${toolId}" executed via Mock Adapter and logged to Audit Trail.`);
      }
    };

    return (
      <DeskShell>
        <div className="space-y-5">
          {/* Header */}
          <div className="os-glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
            <div>
              <Link to="/desk/coworkers" className="text-xs text-cyan-400 hover:underline">← All AI Coworkers</Link>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl">{cw.avatarEmoji}</span>
                <div>
                  <h1 className="font-display text-2xl font-bold text-white">{cw.name}</h1>
                  <div className="font-mono-tech text-xs text-slate-400">
                    {cw.role} · Policy: {cw.approvalPolicy} · Schedule: {cw.scheduleCron || 'On-Demand'}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveConversationToSpace}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                Save Thread to Space
              </button>
              <button
                type="button"
                onClick={() =>
                  openWindow({
                    title: `${cw.name} — Live Computer Panel`,
                    kind: 'COWORKER_COMPUTER',
                    entityId: cw.id,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
              >
                <Monitor className="h-3.5 w-3.5" />
                Pop Out OS Computer Window
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Left: Chat + Governed Tool Bar + Inline Approvals */}
            <div className="space-y-4 lg:col-span-7">
              {/* Chat Thread */}
              <div className="os-panel flex flex-col rounded-2xl p-4">
                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2 text-xs font-semibold text-white">
                  <span>Coworker Thread (Conversation-to-Document Ready)</span>
                  <span className="font-mono-tech text-[10px] text-amber-300">MOCK RUNTIME</span>
                </div>
                <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl p-3 text-xs ${
                        m.role === 'user'
                          ? 'ml-8 border border-cyan-400/30 bg-cyan-500/15 text-cyan-50'
                          : 'mr-8 border border-white/10 bg-slate-950/80 text-slate-200'
                      }`}
                    >
                      <div className="mb-1 flex justify-between font-mono-tech text-[10px] text-slate-400">
                        <span>{m.role === 'user' ? 'You' : cw.name}</span>
                        <span>{m.time}</span>
                      </div>
                      <p className="leading-relaxed">{m.text}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendChat} className="mt-3 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Message ${cw.name} (e.g. Draft an internal link audit for /solutions)...`}
                    className="flex-1 rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300"
                  >
                    <Send className="h-3.5 w-3.5" /> Send
                  </button>
                </form>
              </div>

              {/* Test Governed Tool Invocations */}
              <div className="os-panel rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Wrench className="h-4 w-4 text-cyan-400" />
                  Invoke Configured Tools (Demonstrates Allowlist, Redaction &amp; Approval Gates)
                </div>
                <div className="flex flex-wrap gap-2">
                  {cw.allowedTools.map((toolId) => {
                    const def = TOOL_REGISTRY.find((t) => t.id === toolId);
                    return (
                      <button
                        key={toolId}
                        type="button"
                        onClick={() => handleInvokeTool(toolId, `Run ${def?.name || toolId} for active client`)}
                        className="rounded-lg border border-white/15 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-400/50"
                      >
                        {def?.name || toolId}{' '}
                        <span className="ml-1 font-mono-tech text-[9px] uppercase text-amber-300">
                          [{def?.risk || 'read'}]
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => handleInvokeTool('data_delete', 'Attempt blocked destructive deletion')}
                    className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/25"
                  >
                    Test Blocked Tool (data_delete)
                  </button>
                </div>
              </div>

              {/* Coworker Approval Cards */}
              {cwApprovals.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                    <ShieldAlert className="h-4 w-4" /> Human-in-the-Loop Approval Cards
                  </div>
                  {cwApprovals.map((a) => (
                    <ApprovalCard
                      key={a.id}
                      approval={a}
                      onDecide={async (id, decision, note) => {
                        await api.decideBusinessApproval(id, decision, note);
                        await refreshDesk();
                        showToast(`Coworker action ${decision.toLowerCase()} with audit receipt.`);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right: Live Computer Panel + Instructions */}
            <div className="space-y-4 lg:col-span-5">
              <div className="os-panel rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-display text-sm font-bold text-white">Live Computer Panel</span>
                  <div className="flex gap-1">
                    {(['browser', 'files', 'terminal'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setComputerTab(tab)}
                        className={`rounded-md px-2 py-1 font-mono-tech text-[10px] uppercase ${
                          computerTab === tab ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
                {computerTab === 'browser' && (
                  <div className="rounded-xl border border-white/10 bg-slate-950 p-3 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-mono-tech text-[10px] text-cyan-300">
                      <Globe className="h-3.5 w-3.5" /> https://apexcloudhealth.example/integrations (Mock Snapshot)
                    </div>
                    <p className="text-slate-300">
                      Inspecting competitor integration landing pages &amp; extracting structured headings into working notes.
                    </p>
                  </div>
                )}
                {computerTab === 'files' && (
                  <div className="space-y-1.5 font-mono-tech text-[11px] text-slate-300">
                    <div className="rounded bg-slate-950 p-2">/space/{defaultSpace?.name || 'Briefs'}/working-draft.md</div>
                    <div className="rounded bg-slate-950 p-2">/evidence/serp-gap-matrix.json</div>
                  </div>
                )}
                {computerTab === 'terminal' && (
                  <pre className="rounded-xl bg-black/80 p-3 font-mono-tech text-[11px] text-emerald-300">
                    <Terminal className="mb-1 h-3.5 w-3.5" />
{`[sandbox] coworker=${cw.name}
[policy] ${cw.approvalPolicy}
[tools] ${cw.allowedTools.join(', ')}
[status] ${cw.status}`}
                  </pre>
                )}
              </div>

              <div className="os-panel rounded-2xl p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Role Instructions</h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{cw.instructions}</p>
              </div>
            </div>
          </div>
        </div>
      </DeskShell>
    );
  }

  const businessCoworkers = desk?.coworkers.filter((c) => c.kind === 'COWORKER') ?? [];

  return (
    <DeskShell>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Directory */}
        <div className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-white">
              <Users className="h-6 w-6 text-violet-400" />
              Persistent Business AI Coworkers
            </h1>
            <span className="font-mono-tech text-xs text-slate-400">{businessCoworkers.length} active</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {businessCoworkers.map((cw) => (
              <div key={cw.id} className="os-panel flex flex-col justify-between rounded-2xl p-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{cw.avatarEmoji}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono-tech text-[10px] ${
                        cw.status === 'AWAITING_APPROVAL'
                          ? 'border-amber-400/40 bg-amber-500/15 text-amber-200'
                          : 'border-cyan-400/35 bg-cyan-500/10 text-cyan-200'
                      }`}
                    >
                      {cw.status}
                    </span>
                  </div>
                  <h2 className="mt-2 font-display text-lg font-bold text-white">{cw.name}</h2>
                  <div className="text-xs font-medium text-violet-300">{cw.role}</div>
                  <p className="mt-2 line-clamp-3 text-xs text-slate-400">{cw.instructions}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {cw.allowedTools.map((t) => (
                      <span key={t} className="rounded bg-white/5 px-1.5 py-0.5 font-mono-tech text-[9px] text-slate-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  to={`/desk/coworkers/${cw.id}`}
                  className="mt-4 block rounded-xl bg-violet-500 py-2 text-center text-xs font-semibold text-white hover:bg-violet-400"
                >
                  Open Coworker Desk &amp; Computer →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Create Coworker Builder */}
        <div className="lg:col-span-5">
          <form onSubmit={handleCreateCoworker} className="os-glass rounded-2xl p-5 space-y-3.5">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <Plus className="h-5 w-5 text-violet-400" />
              Configure New AI Coworker
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-300">Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Elena Rossi"
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300">Role</label>
                <input
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Technical Schema Lead"
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">Operating Instructions</label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-300">Approval Policy</label>
                <select
                  value={approvalPolicy}
                  onChange={(e) => setApprovalPolicy(e.target.value as ApprovalPolicy)}
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  <option value="REQUIRE_APPROVAL_WRITES">Require Approval on Writes (Safe Default)</option>
                  <option value="REQUIRE_APPROVAL_ALL">Require Approval on All Tools</option>
                  <option value="AUTO_READ_ONLY">Auto-Allow Read-Only Tools</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300">Schedule (Cron)</label>
                <input
                  value={scheduleCron}
                  onChange={(e) => setScheduleCron(e.target.value)}
                  placeholder="0 9 * * 1"
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 font-mono-tech text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">Default Business Space</label>
              <select
                value={defaultSpaceId}
                onChange={(e) => setDefaultSpaceId(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white"
              >
                {desk?.spaces.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1.5 text-xs text-slate-300">Allowed Tool Allowlist</div>
              <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/80 p-2.5">
                {TOOL_REGISTRY.filter((t) => t.id !== 'data_delete').map((t) => (
                  <label key={t.id} className="flex items-center justify-between gap-2 text-xs text-slate-300">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTools.includes(t.id)}
                        onChange={() => toggleTool(t.id)}
                        className="accent-violet-500"
                      />
                      <span>{t.name}</span>
                    </span>
                    <span className="font-mono-tech text-[9px] uppercase text-amber-300">{t.risk}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-2.5 text-xs font-bold text-white hover:bg-violet-400 disabled:opacity-50"
            >
              <Bot className="h-4 w-4" />
              Create Governed AI Coworker
            </button>
          </form>
        </div>
      </div>
    </DeskShell>
  );
}
