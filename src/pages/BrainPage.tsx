import React, { useState } from 'react';
import { Brain, ExternalLink, Sparkles } from 'lucide-react';
import { DeskShell } from '@/components/DeskShell';
import { useApp } from '@/context/AppContext';

export function BrainPage() {
  const { desk, activeClientId, openWindow } = useApp();
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const nodes =
    desk?.brainNodes.filter(
      (n) =>
        (!activeClientId || n.clientId === activeClientId) &&
        (categoryFilter === 'ALL' || n.category === categoryFilter)
    ) ?? [];

  const categories = ['ALL', 'TECHNICAL', 'KEYWORD', 'COMPETITOR', 'SCHEMA', 'CONTENT', 'GEO_AI'];

  return (
    <DeskShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-white">
              <Brain className="h-6 w-6 text-emerald-400" />
              Client Knowledge Graph / Second Brain
            </h1>
            <p className="text-xs text-slate-400">
              Every recommendation is backed by structured claims, confidence scores, tool receipts, timestamps, and source URLs.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-2.5 py-1 font-mono-tech text-[10px] ${
                  categoryFilter === cat
                    ? 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/40'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {nodes.map((node) => (
            <div key={node.id} className="os-panel flex flex-col justify-between rounded-2xl p-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 font-mono-tech text-[10px] text-emerald-300">
                    {node.category}
                  </span>
                  {node.isDemo && (
                    <span className="font-mono-tech text-[9px] text-amber-300">DEMO FIXTURE</span>
                  )}
                </div>
                <h2 className="mt-3 font-display text-base font-bold text-white">{node.label}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{node.summary}</p>

                <div className="mt-3 space-y-2">
                  {node.claims.map((claim) => (
                    <div key={claim.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-2.5 text-xs">
                      <div className="flex items-center justify-between font-mono-tech text-[10px]">
                        <span className="text-cyan-300">Confidence {Math.round(claim.confidence * 100)}%</span>
                        <span className="text-slate-400">{claim.status}</span>
                      </div>
                      <p className="mt-1 text-slate-200">{claim.statement}</p>
                      {claim.evidence[0] && (
                        <div className="mt-1.5 flex items-center gap-1 truncate font-mono-tech text-[10px] text-cyan-400">
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{claim.evidence[0].sourceUrl}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  openWindow({
                    title: `Client Brain — ${node.label}`,
                    kind: 'BRAIN_NODE',
                    entityId: node.id,
                  })
                }
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/15 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Inspect Provenance in OS Window
              </button>
            </div>
          ))}
        </div>
      </div>
    </DeskShell>
  );
}
