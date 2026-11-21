import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, Brain, FileText, Globe, Play, Plus } from 'lucide-react';
import { STATUS_VISUAL_META } from '@shared/stateMachine';
import { DeskShell } from '@/components/DeskShell';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';

export function ClientsPage() {
  const { clientId } = useParams();
  const { desk, setActiveClientId, refreshDesk, openWindow, showToast } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('B2B SaaS');
  const [goals, setGoals] = useState('Surface technical crawl bottlenecks\nIdentify commercial keyword clusters');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !domain.trim()) return;
    setCreating(true);
    try {
      const res = (await api.createClient({
        name: name.trim(),
        domain: domain.trim(),
        industry: industry.trim() || 'SaaS',
        goals: goals.split('\n').map((g) => g.trim()).filter(Boolean),
      })) as { client: { id: string } };
      await refreshDesk();
      setActiveClientId(res.client.id);
      setName('');
      setDomain('');
      showToast('Client workspace created with isolated client brain.');
      navigate(`/desk/clients/${res.client.id}`);
    } finally {
      setCreating(false);
    }
  };

  if (clientId && desk) {
    const client = desk.clients.find((c) => c.id === clientId);
    if (!client) {
      return (
        <DeskShell>
          <div className="os-panel rounded-2xl p-6">
            <p className="text-sm text-slate-300">Client workspace not found in your organization.</p>
            <Link to="/desk/clients" className="mt-3 inline-block text-xs text-cyan-400">← Back to Clients</Link>
          </div>
        </DeskShell>
      );
    }
    const cTasks = desk.tasks.filter((t) => t.clientId === client.id);
    const cBrain = desk.brainNodes.filter((n) => n.clientId === client.id);
    const cArtifacts = desk.artifacts.filter((a) => a.clientId === client.id);

    return (
      <DeskShell>
        <div className="space-y-5">
          <div className="os-glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6">
            <div>
              <Link to="/desk/clients" className="text-xs text-cyan-400 hover:underline">← All Client Workspaces</Link>
              <div className="mt-2 flex items-center gap-2.5">
                <h1 className="font-display text-2xl font-bold text-white">{client.name}</h1>
                <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 font-mono-tech text-[10px] text-amber-200">
                  {client.dataMode}
                </span>
              </div>
              <p className="mt-1 font-mono-tech text-xs text-slate-400">
                {client.domain} · {client.industry}
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setActiveClientId(client.id);
                await api.runOrchestrator({
                  clientId: client.id,
                  objective: `Seeded SEO & GEO workflow for ${client.domain}`,
                });
                await refreshDesk();
                showToast(`Seeded SEO workflow started for ${client.name}.`);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300"
            >
              <Play className="h-3.5 w-3.5" />
              Run Seeded SEO Workflow
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="os-panel rounded-2xl p-4 space-y-2.5">
              <h2 className="flex items-center gap-2 font-display text-sm font-bold text-white">
                <Brain className="h-4 w-4 text-emerald-400" /> Client Brain ({cBrain.length} Nodes)
              </h2>
              {cBrain.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openWindow({ title: `Client Brain — ${n.label}`, kind: 'BRAIN_NODE', entityId: n.id })}
                  className="block w-full rounded-xl border border-white/10 bg-slate-950/70 p-3 text-left hover:border-emerald-400/40"
                >
                  <div className="font-mono-tech text-[10px] text-emerald-300">{n.category}</div>
                  <div className="text-xs font-semibold text-white">{n.label}</div>
                </button>
              ))}
              {cBrain.length === 0 && (
                <p className="text-xs text-slate-400">Run an orchestrator workflow to populate this client's second brain.</p>
              )}
            </div>

            <div className="os-panel rounded-2xl p-4 space-y-2.5">
              <h2 className="font-display text-sm font-bold text-white">Specialist Tasks ({cTasks.length})</h2>
              {cTasks.map((t) => (
                <div key={t.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-white">{t.title}</span>
                    <span className={`rounded-full border px-2 py-0.5 font-mono-tech text-[9px] ${STATUS_VISUAL_META[t.status].badgeClass}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
              {cTasks.length === 0 && <p className="text-xs text-slate-400">No tasks dispatched yet.</p>}
            </div>

            <div className="os-panel rounded-2xl p-4 space-y-2.5">
              <h2 className="flex items-center gap-2 font-display text-sm font-bold text-white">
                <FileText className="h-4 w-4 text-cyan-400" /> Reports &amp; Artifacts ({cArtifacts.length})
              </h2>
              {cArtifacts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => openWindow({ title: a.title, kind: 'ARTIFACT', entityId: a.id })}
                  className="block w-full rounded-xl border border-white/10 bg-slate-950/70 p-3 text-left hover:border-cyan-400/40"
                >
                  <div className="text-xs font-semibold text-white">{a.title}</div>
                  <div className="mt-1 font-mono-tech text-[10px] text-slate-400">
                    Confidence {Math.round(a.confidence * 100)}% · {a.approved ? 'Approved' : 'Needs Review'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DeskShell>
    );
  }

  return (
    <DeskShell>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-white">
            <Building2 className="h-6 w-6 text-cyan-400" />
            Client &amp; Site Workspaces
          </h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {desk?.clients.map((c) => (
              <div key={c.id} className="os-panel flex flex-col justify-between rounded-2xl p-5">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tech text-[10px] text-cyan-300">{c.industry}</span>
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono-tech text-[9px] text-amber-200">
                      {c.isDemo ? 'SEEDED DEMO' : c.dataMode}
                    </span>
                  </div>
                  <h2 className="mt-2 font-display text-lg font-bold text-white">{c.name}</h2>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono-tech text-xs text-slate-400">
                    <Globe className="h-3.5 w-3.5" /> {c.domain}
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-slate-300">
                    {c.goals.slice(0, 2).map((g, i) => (
                      <li key={i} className="truncate">• {g}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    to={`/desk/clients/${c.id}`}
                    onClick={() => setActiveClientId(c.id)}
                    className="flex-1 rounded-xl bg-cyan-400 py-2 text-center text-xs font-bold text-slate-950 hover:bg-cyan-300"
                  >
                    Open Client Workspace
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create New Client Workspace */}
        <div className="lg:col-span-5">
          <form onSubmit={handleCreate} className="os-glass rounded-2xl p-5 space-y-3.5">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <Plus className="h-5 w-5 text-cyan-400" />
              Create Client Workspace
            </h2>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Client / Brand Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Harbor FinTech"
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Website Domain</label>
              <input
                required
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. harborfintech.example"
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Industry</label>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Goals (one per line)</label>
              <textarea
                rows={3}
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-xl bg-cyan-400 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
            >
              Create Isolated Client Workspace
            </button>
          </form>
        </div>
      </div>
    </DeskShell>
  );
}
