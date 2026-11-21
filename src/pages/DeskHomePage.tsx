import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Send, Sparkles } from 'lucide-react';
import { DeskShell } from '@/components/DeskShell';
import { SeoOsDesk2D } from '@/components/SeoOsDesk2D';
import { SeoOsScene3D } from '@/components/SeoOsScene3D';
import { TaskFeedPanel } from '@/components/TaskFeedPanel';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';

export function DeskHomePage() {
  const {
    desk,
    activeClientId,
    theme,
    is3DMode,
    reducedMotion,
    openWindow,
    refreshDesk,
    showToast,
  } = useApp();
  const navigate = useNavigate();
  const [quickObjective, setQuickObjective] = useState('');
  const [dispatching, setDispatching] = useState(false);

  const clientTasks = desk?.tasks.filter((t) => !activeClientId || t.clientId === activeClientId) ?? [];
  const clientBrain = desk?.brainNodes.filter((n) => !activeClientId || n.clientId === activeClientId) ?? [];
  const clientArtifacts = desk?.artifacts.filter((a) => !activeClientId || a.clientId === activeClientId) ?? [];

  const handleQuickDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickObjective.trim() || !activeClientId) return;
    setDispatching(true);
    try {
      await api.runOrchestrator({
        clientId: activeClientId,
        objective: quickObjective.trim(),
        includeLocalSeo: false,
      });
      setQuickObjective('');
      await refreshDesk();
      showToast('Central Orchestrator dispatched parallel specialist tasks (Mock Adapters).');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <DeskShell>
      {desk && (
        <div className="space-y-3">
          {/* Quick Orchestrator Command Bar */}
          <form onSubmit={handleQuickDispatch} className="os-glass flex flex-col gap-2 rounded-2xl p-2.5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 px-2 text-xs font-semibold text-[var(--os-accent)]">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Orchestrator Command</span>
            </div>
            <input
              value={quickObjective}
              onChange={(e) => setQuickObjective(e.target.value)}
              placeholder="Ask the SEO OS Orchestrator for an outcome (e.g. Audit Q2 SaaS landing pages & draft GEO schema plan)..."
              className="flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={dispatching}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--os-accent)] px-4 py-2 text-xs font-bold text-slate-950 hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Dispatch Specialists
            </button>
          </form>

          {/* Main Spatial Office + Right-Hand Live Task Feed */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-8 2xl:col-span-9">
              {is3DMode ? (
                <div className="h-[560px]">
                  <SeoOsScene3D
                    theme={theme}
                    reducedMotion={reducedMotion}
                    tasks={clientTasks}
                    coworkers={desk.coworkers}
                    brainNodes={clientBrain}
                    onSelectOrchestrator={() => navigate('/desk/orchestrator')}
                    onSelectSpecialist={(deskKey) =>
                      openWindow({
                        title: `Specialist Desk — ${deskKey}`,
                        kind: 'SPECIALIST',
                        entityId: deskKey,
                      })
                    }
                    onSelectCoworker={(coworkerId) => {
                      const cw = desk.coworkers.find((c) => c.id === coworkerId);
                      openWindow({
                        title: `${cw?.name ?? 'Coworker'} — Live Computer Panel`,
                        kind: 'COWORKER_COMPUTER',
                        entityId: coworkerId,
                      });
                    }}
                    onSelectBrainNode={(nodeId) => {
                      const node = clientBrain.find((n) => n.id === nodeId);
                      openWindow({
                        title: `Client Brain — ${node?.label ?? 'Node'}`,
                        kind: 'BRAIN_NODE',
                        entityId: nodeId,
                      });
                    }}
                  />
                </div>
              ) : (
                <SeoOsDesk2D
                  tasks={clientTasks}
                  coworkers={desk.coworkers}
                  brainNodes={clientBrain}
                  onSelectOrchestrator={() => navigate('/desk/orchestrator')}
                  onSelectSpecialist={(deskKey) =>
                    openWindow({
                      title: `Specialist Desk — ${deskKey}`,
                      kind: 'SPECIALIST',
                      entityId: deskKey,
                    })
                  }
                  onSelectCoworker={(coworkerId) => navigate(`/desk/coworkers/${coworkerId}`)}
                  onSelectBrainNode={(nodeId) => {
                    const node = clientBrain.find((n) => n.id === nodeId);
                    openWindow({
                      title: `Client Brain — ${node?.label ?? 'Node'}`,
                      kind: 'BRAIN_NODE',
                      entityId: nodeId,
                    });
                  }}
                />
              )}

              {/* Quick Artifact Windows Strip */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-400">
                  Open Report Windows:
                </span>
                {clientArtifacts.slice(0, 4).map((art) => (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() =>
                      openWindow({
                        title: art.title,
                        kind: 'ARTIFACT',
                        entityId: art.id,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-200 hover:border-cyan-400/50 hover:text-cyan-200"
                  >
                    <FileText className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="max-w-[200px] truncate">{art.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[600px] xl:col-span-4 2xl:col-span-3">
              <TaskFeedPanel
                tasks={clientTasks}
                onTaskAction={async (taskId, action) => {
                  await api.taskAction(taskId, action);
                  await refreshDesk();
                  showToast(`Task ${action.toLowerCase()} completed.`);
                }}
                onOpenSpecialist={(deskKey) =>
                  openWindow({
                    title: `Specialist Desk — ${deskKey}`,
                    kind: 'SPECIALIST',
                    entityId: deskKey,
                  })
                }
              />
            </div>
          </div>
        </div>
      )}
    </DeskShell>
  );
}
