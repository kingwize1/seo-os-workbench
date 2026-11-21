import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileCode2,
  Globe,
  Maximize2,
  Minimize2,
  Terminal,
  X,
} from 'lucide-react';
import { STATUS_VISUAL_META } from '@shared/stateMachine';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { ApprovalCard } from './ApprovalCard';

export function WindowManager() {
  const {
    desk,
    windows,
    closeWindow,
    focusWindow,
    toggleMinimizeWindow,
    toggleMaximizeWindow,
    moveWindow,
    refreshDesk,
    showToast,
  } = useApp();

  const [computerTab, setComputerTab] = useState<'browser' | 'files' | 'terminal' | 'activity'>('browser');
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  if (!desk || windows.length === 0) return null;

  const onDragStart = (e: React.PointerEvent, id: string, origX: number, origY: number) => {
    focusWindow(id);
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX, origY };
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      moveWindow(
        dragRef.current.id,
        Math.max(12, dragRef.current.origX + (ev.clientX - dragRef.current.startX)),
        Math.max(56, dragRef.current.origY + (ev.clientY - dragRef.current.startY))
      );
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const downloadMarkdown = (title: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {windows.map((win) => {
        if (win.minimized) return null;

        const style: React.CSSProperties = win.maximized
          ? { top: 58, left: 16, right: 16, bottom: 72, zIndex: win.zIndex }
          : {
              top: win.y,
              left: win.x,
              width: `min(${win.width}px, calc(100vw - 24px))`,
              height: `min(${win.height}px, calc(100vh - 130px))`,
              zIndex: win.zIndex,
            };

        return (
          <div
            key={win.id}
            style={style}
            onPointerDown={() => focusWindow(win.id)}
            className="os-glass pointer-events-auto absolute flex flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/70"
          >
            {/* OS Title Bar with Traffic-Light Controls */}
            <div
              onPointerDown={(e) => {
                if (!win.maximized) onDragStart(e, win.id, win.x, win.y);
              }}
              className="flex cursor-move select-none items-center justify-between border-b border-white/10 bg-slate-950/90 px-3.5 py-2.5"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Close window"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeWindow(win.id);
                  }}
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500/90 text-rose-950 hover:bg-rose-400"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
                <button
                  type="button"
                  aria-label="Minimize window"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMinimizeWindow(win.id);
                  }}
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400/90 text-amber-950 hover:bg-amber-300"
                >
                  <Minimize2 className="h-2.5 w-2.5" />
                </button>
                <button
                  type="button"
                  aria-label="Maximize window"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMaximizeWindow(win.id);
                  }}
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400/90 text-emerald-950 hover:bg-emerald-300"
                >
                  <Maximize2 className="h-2.5 w-2.5" />
                </button>
                <span className="ml-2 truncate font-display text-xs font-semibold text-slate-100">
                  {win.title}
                </span>
              </div>
              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono-tech text-[10px] text-slate-400">
                {win.kind}
              </span>
            </div>

            {/* Window Body */}
            <div className="flex-1 overflow-y-auto p-4 text-sm text-slate-200">
              {win.kind === 'ARTIFACT' && (() => {
                const art = desk.artifacts.find((a) => a.id === win.entityId);
                if (!art) return <p className="text-slate-400">Artifact not found.</p>;
                return (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/70 p-3">
                      <div className="space-y-0.5 text-xs">
                        <div className="font-semibold text-white">{art.provenance.generatedBy}</div>
                        <div className="font-mono-tech text-[11px] text-slate-400">
                          Confidence: {Math.round(art.confidence * 100)}% · Tools: {art.provenance.toolsUsed.join(', ')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {art.provenance.isMock && (
                          <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 font-mono-tech text-[10px] text-amber-200">
                            DEMO / MOCK DATA
                          </span>
                        )}
                        {!art.approved ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await api.approveArtifact(art.id);
                              await refreshDesk();
                              showToast('Artifact approved and logged to audit trail.');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve Artifact
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approved
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => downloadMarkdown(art.title, art.content)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Export .md
                        </button>
                      </div>
                    </div>

                    <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/75 p-4 font-sans text-xs leading-relaxed text-slate-200">
                      {art.content}
                    </pre>

                    {art.provenance.sourceLinks.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Evidence &amp; Source Provenance
                        </div>
                        <ul className="space-y-1 text-xs text-cyan-300">
                          {art.provenance.sourceLinks.map((src) => (
                            <li key={src} className="flex items-center gap-1.5 font-mono-tech text-[11px]">
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">{src}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

              {win.kind === 'BRAIN_NODE' && (() => {
                const node = desk.brainNodes.find((n) => n.id === win.entityId);
                if (!node) return <p className="text-slate-400">Knowledge Brain node not found.</p>;
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 font-mono-tech text-[10px] text-emerald-300">
                        {node.category} · CLIENT SECOND BRAIN
                      </span>
                      {node.isDemo && (
                        <span className="font-mono-tech text-[10px] text-amber-300">SEEDED DEMO FIXTURE</span>
                      )}
                    </div>
                    <h3 className="font-display text-lg font-bold text-white">{node.label}</h3>
                    <p className="text-xs leading-relaxed text-slate-300">{node.summary}</p>
                    <div className="space-y-3">
                      {node.claims.map((claim) => (
                        <div key={claim.id} className="rounded-xl border border-white/10 bg-slate-900/75 p-3.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono-tech text-cyan-300">
                              Confidence: {Math.round(claim.confidence * 100)}%
                            </span>
                            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono-tech text-[10px] text-slate-200">
                              {claim.status}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm font-medium text-slate-100">{claim.statement}</p>
                          <div className="mt-2.5 space-y-2 border-t border-white/10 pt-2.5">
                            {claim.evidence.map((ev) => (
                              <div key={ev.id} className="rounded-lg bg-slate-950/70 p-2.5 text-xs">
                                <div className="flex items-center justify-between font-mono-tech text-[10px] text-slate-400">
                                  <span>{ev.toolName}</span>
                                  <span>{new Date(ev.capturedAt).toLocaleString()}</span>
                                </div>
                                <div className="mt-1 font-medium text-cyan-300">{ev.sourceLabel}</div>
                                <div className="truncate font-mono-tech text-[10px] text-slate-400">{ev.sourceUrl}</div>
                                <p className="mt-1 text-[11px] text-slate-300">{ev.snippet}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {win.kind === 'SPECIALIST' && (() => {
                const cw = desk.coworkers.find((c) => c.deskKey === win.entityId);
                const deskTasks = desk.tasks.filter((t) => t.deskKey === win.entityId);
                return (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/75 p-3.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{cw?.avatarEmoji ?? '🛠️'}</span>
                          <h3 className="font-display text-base font-bold text-white">{cw?.name ?? win.title}</h3>
                        </div>
                        <p className="mt-1 text-xs text-slate-300">{cw?.role}</p>
                      </div>
                      <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 font-mono-tech text-[10px] text-cyan-300">
                        {cw?.approvalPolicy ?? 'REQUIRE_APPROVAL_WRITES'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Active &amp; Recent Specialist Tasks
                      </div>
                      {deskTasks.map((t) => {
                        const meta = STATUS_VISUAL_META[t.status];
                        return (
                          <div key={t.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-100">{t.title}</span>
                              <span className={`rounded-full border px-2 py-0.5 font-mono-tech text-[10px] ${meta.badgeClass}`}>
                                {meta.label}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">{t.statusReason}</p>
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              {t.status === 'FAILED' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await api.taskAction(t.id, 'RETRY');
                                    await refreshDesk();
                                    showToast(`Retried "${t.title}" successfully.`);
                                  }}
                                  className="rounded-lg bg-rose-500/25 px-3 py-1 text-xs font-semibold text-rose-100 hover:bg-rose-500/35"
                                >
                                  Retry Failed Task
                                </button>
                              )}
                              {t.status === 'RUNNING' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await api.taskAction(t.id, 'COMPLETE_MOCK');
                                    await refreshDesk();
                                    showToast('Task completed via mock specialist adapter.');
                                  }}
                                  className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30"
                                >
                                  Complete Mock Step
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {win.kind === 'COWORKER_COMPUTER' && (() => {
                const cw = desk.coworkers.find((c) => c.id === win.entityId);
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex gap-1.5">
                        {(
                          [
                            ['browser', Globe, 'Browser'],
                            ['files', FileCode2, 'Files'],
                            ['terminal', Terminal, 'Terminal'],
                            ['activity', CheckCircle2, 'Activity'],
                          ] as const
                        ).map(([id, Icon, label]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setComputerTab(id)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
                              computerTab === id ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-400 hover:bg-white/5'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </button>
                        ))}
                      </div>
                      <span className="font-mono-tech text-[10px] text-amber-300">SANDBOX COMPUTER · MOCK</span>
                    </div>

                    {computerTab === 'browser' && (
                      <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950 p-3">
                        <div className="rounded bg-slate-900 px-2.5 py-1 font-mono-tech text-[11px] text-slate-400">
                          https://apexcloudhealth.example/solutions/clinical-intake (Read-Only Snapshot)
                        </div>
                        <p className="text-xs text-slate-300">
                          {cw?.name} is inspecting DOM heading hierarchy, canonical headers, and hero image weight. Human takeover is available whenever interactive login or manual verification is required.
                        </p>
                      </div>
                    )}
                    {computerTab === 'files' && (
                      <div className="space-y-1.5 font-mono-tech text-xs text-slate-300">
                        <div className="rounded bg-slate-900/80 px-3 py-2">/workspace/drafts/epic-ehr-brief.md (12 KB)</div>
                        <div className="rounded bg-slate-900/80 px-3 py-2">/workspace/exports/schema-software-app.json (4 KB)</div>
                        <div className="rounded bg-slate-900/80 px-3 py-2">/workspace/evidence/crawl-summary.csv (28 KB)</div>
                      </div>
                    )}
                    {computerTab === 'terminal' && (
                      <pre className="rounded-xl border border-white/10 bg-black/80 p-3 font-mono-tech text-[11px] text-emerald-300">
{`$ coworker-sandbox --read-only --client apexcloudhealth.example
[info] Loaded tool allowlist: ${(cw?.allowedTools || []).join(', ')}
[info] Safe default policy active: writes & publishes require human approval
[ok] Validated 2 JSON-LD schemas (0 syntax errors)
[gate] Paused cms_publish — awaiting approval card decision`}
                      </pre>
                    )}
                    {computerTab === 'activity' && (
                      <div className="space-y-2 text-xs text-slate-300">
                        {desk.auditEvents
                          .filter((e) => e.coworkerId === cw?.id || e.actorName === cw?.name)
                          .slice(0, 6)
                          .map((ev) => (
                            <div key={ev.id} className="rounded-lg border border-white/10 bg-slate-900/70 p-2.5">
                              <div className="flex justify-between font-mono-tech text-[10px] text-slate-400">
                                <span>{ev.action}</span>
                                <span>{ev.outcome}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {win.kind === 'APPROVAL' && (
                <div className="space-y-3">
                  {desk.approvals.map((appr) => (
                    <ApprovalCard
                      key={appr.id}
                      approval={appr}
                      onDecide={async (id, decision, note) => {
                        await api.decideBusinessApproval(id, decision, note);
                        await refreshDesk();
                        showToast(`Approval ${decision.toLowerCase()} and logged to audit trail.`);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
