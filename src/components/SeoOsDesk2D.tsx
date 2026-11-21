import React from 'react';
import { Brain, Cpu, Layers, Sparkles, Users } from 'lucide-react';
import { SPECIALIST_DESK_BLUEPRINTS } from '@shared/constants';
import { STATUS_VISUAL_META } from '@shared/stateMachine';
import type { BrainNode, Coworker, Task } from '@shared/types';

interface SeoOsDesk2DProps {
  tasks: Task[];
  coworkers: Coworker[];
  brainNodes: BrainNode[];
  onSelectOrchestrator: () => void;
  onSelectSpecialist: (deskKey: string) => void;
  onSelectCoworker: (coworkerId: string) => void;
  onSelectBrainNode: (nodeId: string) => void;
}

export function SeoOsDesk2D({
  tasks,
  coworkers,
  brainNodes,
  onSelectOrchestrator,
  onSelectSpecialist,
  onSelectCoworker,
  onSelectBrainNode,
}: SeoOsDesk2DProps) {
  const taskByDesk = new Map<string, Task>();
  for (const t of tasks) {
    if (!taskByDesk.has(t.deskKey)) taskByDesk.set(t.deskKey, t);
  }
  const bizCoworkers = coworkers.filter((c) => c.kind === 'COWORKER');

  return (
    <div className="space-y-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-6" aria-label="Accessible 2D SEO OS Spatial Desk">
      {/* Central Orchestrator Dais Card */}
      <div className="os-panel flex flex-col justify-between gap-4 rounded-xl p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/15 text-cyan-300">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold text-white">Central Orchestrator Dais</h2>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono-tech uppercase text-cyan-300">
                Phase-Gated
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Give a business or SEO objective. The orchestrator plans parallel specialist work, tracks dependencies, and pauses consequential actions for approval.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSelectOrchestrator}
          className="shrink-0 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Open Orchestrator
        </button>
      </div>

      {/* 9 Specialist SEO Desks */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Layers className="h-4 w-4 text-cyan-400" />
            Specialist SEO Desks (Phases 1–3)
          </h3>
          <span className="text-[11px] text-slate-500">Keyboard & mobile accessible spatial layout</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALIST_DESK_BLUEPRINTS.map((bp) => {
            const task = taskByDesk.get(bp.deskKey);
            const meta = STATUS_VISUAL_META[task?.status ?? 'QUEUED'];
            return (
              <button
                key={bp.deskKey}
                type="button"
                onClick={() => onSelectSpecialist(bp.deskKey)}
                className="os-panel group flex flex-col justify-between rounded-xl p-3.5 text-left transition hover:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono-tech uppercase tracking-wider text-slate-400">
                      Phase {bp.phase}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono-tech font-medium ${meta.badgeClass}`}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dotColor }} />
                      {meta.label}
                    </span>
                  </div>
                  <div className="mt-2 font-display text-sm font-semibold text-slate-100 group-hover:text-cyan-300">
                    {bp.name}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                    {task?.statusReason || bp.role}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-slate-400">
                  <span>Progress: {task?.progressPct ?? 0}%</span>
                  <span className="text-cyan-400">Inspect Desk →</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Business AI Coworkers + Overhead Brain Chandelier Nodes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="os-panel rounded-xl p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Users className="h-4 w-4 text-violet-400" />
            Persistent AI Coworkers
          </h3>
          <div className="space-y-2">
            {bizCoworkers.map((cw) => (
              <button
                key={cw.id}
                type="button"
                onClick={() => onSelectCoworker(cw.id)}
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2.5 text-left transition hover:border-violet-400/50"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{cw.avatarEmoji}</span>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{cw.name}</div>
                    <div className="text-xs text-slate-400">{cw.role}</div>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-mono-tech ${
                    cw.status === 'AWAITING_APPROVAL'
                      ? 'border-amber-400/40 bg-amber-500/15 text-amber-300'
                      : cw.status === 'WORKING'
                        ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300'
                        : 'border-slate-600 bg-slate-800 text-slate-300'
                  }`}
                >
                  {cw.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="os-panel rounded-xl p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Brain className="h-4 w-4 text-emerald-400" />
            Client Knowledge Brain Chandelier ({brainNodes.length} Nodes)
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {brainNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectBrainNode(node.id)}
                className="rounded-lg border border-white/10 bg-slate-900/60 p-2.5 text-left transition hover:border-emerald-400/50"
              >
                <div className="flex items-center justify-between text-[10px] font-mono-tech text-emerald-300">
                  <span>{node.category}</span>
                  <Sparkles className="h-3 w-3" />
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-100">{node.label}</div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  {node.claims.length} verified claim(s)
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
