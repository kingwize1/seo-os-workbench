import React, { useState } from 'react';
import { Cpu, Play, RotateCcw, ShieldAlert } from 'lucide-react';
import { STATUS_VISUAL_META } from '@shared/stateMachine';
import { DeskShell } from '@/components/DeskShell';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';

export function OrchestratorPage() {
  const { desk, activeClientId, refreshDesk, openWindow, showToast } = useApp();
  const [objective, setObjective] = useState(
    'Run full technical, keyword, competitor, schema, and GEO search diagnostic for Q1 growth.'
  );
  const [includeLocalSeo, setIncludeLocalSeo] = useState(false);
  const [busy, setBusy] = useState(false);

  const client = desk?.clients.find((c) => c.id === activeClientId) ?? desk?.clients[0];
  const tasks = desk?.tasks.filter((t) => !client || t.clientId === client.id) ?? [];

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !objective.trim()) return;
    setBusy(true);
    try {
      await api.runOrchestrator({
        clientId: client.id,
        objective: objective.trim(),
        includeLocalSeo,
      });
      await refreshDesk();
      showToast('Orchestrator workflow dispatched across 3 phase-gated tiers.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DeskShell>
      <div className="space-y-5">
        <div className="os-glass rounded-2xl p-6">
          <div className="flex items-center gap-2.5 text-cyan-400">
            <Cpu className="h-5 w-5" />
            <span className="font-mono-tech text-xs uppercase tracking-wider">
              Central Business Orchestrator · Client: {client?.domain}
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold text-white">
            Dispatch an Outcome Across Specialist SEO Desks
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            The orchestrator plans parallel work across Phases 1–3, enforces dependency phase gates, distinguishes expected soft skips from hard failures, and pauses write actions for review.
          </p>

          <form onSubmit={handleDispatch} className="mt-5 space-y-3">
            <textarea
              rows={2}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/90 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={includeLocalSeo}
                  onChange={(e) => setIncludeLocalSeo(e.target.checked)}
                  className="accent-cyan-400"
                />
                Include Local SEO Specialist (unchecked = expected soft skip for pure SaaS)
              </label>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                Launch Phase-Gated Workflow
              </button>
            </div>
          </form>
        </div>

        {/* 3-Phase DAG Board */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {([1, 2, 3] as const).map((phase) => {
            const phaseTasks = tasks.filter((t) => t.phase === phase);
            const title =
              phase === 1
                ? 'Phase 1 · Parallel Discovery & Audits'
                : phase === 2
                  ? 'Phase 2 · Strategy, Schema & GEO'
                  : 'Phase 3 · Final Executive Roadmap Gate';
            return (
              <div key={phase} className="os-panel rounded-2xl p-4 space-y-3">
                <div className="border-b border-white/10 pb-2">
                  <div className="font-mono-tech text-[10px] uppercase text-cyan-300">GATE TIER 0{phase}</div>
                  <h2 className="font-display text-sm font-bold text-white">{title}</h2>
                </div>
                {phaseTasks.map((t) => {
                  const meta = STATUS_VISUAL_META[t.status];
                  return (
                    <div key={t.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">{t.title}</span>
                        <span className={`rounded-full border px-2 py-0.5 font-mono-tech text-[9px] ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">{t.statusReason}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {t.status === 'FAILED' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await api.taskAction(t.id, 'RETRY');
                              await refreshDesk();
                              showToast('Failed task retried & resolved; phase gates re-evaluated.');
                            }}
                            className="inline-flex items-center gap-1 rounded bg-rose-500/25 px-2 py-1 text-[10px] font-semibold text-rose-100"
                          >
                            <RotateCcw className="h-3 w-3" /> Retry Now
                          </button>
                        )}
                        {t.status === 'REVIEW' && (
                          <button
                            type="button"
                            onClick={() =>
                              openWindow({
                                title: 'Human Review & Approvals',
                                kind: 'APPROVAL',
                                entityId: 'approvals_queue',
                              })
                            }
                            className="inline-flex items-center gap-1 rounded bg-amber-500/25 px-2 py-1 text-[10px] font-semibold text-amber-100"
                          >
                            <ShieldAlert className="h-3 w-3" /> Open Approval Card
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </DeskShell>
  );
}
