import React, { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  Lock,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  XCircle,
} from 'lucide-react';
import { STATUS_VISUAL_META } from '@shared/stateMachine';
import type { Task, TaskStatus } from '@shared/types';

interface TaskFeedPanelProps {
  tasks: Task[];
  onTaskAction: (taskId: string, action: 'PAUSE' | 'RESUME' | 'CANCEL' | 'RETRY' | 'COMPLETE_MOCK') => Promise<void>;
  onOpenSpecialist: (deskKey: string) => void;
}

export function TaskFeedPanel({ tasks, onTaskAction, onOpenSpecialist }: TaskFeedPanelProps) {
  const [filter, setFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = filter === 'ALL' ? tasks : tasks.filter((t) => t.status === filter);

  const trigger = async (taskId: string, action: 'PAUSE' | 'RESUME' | 'CANCEL' | 'RETRY' | 'COMPLETE_MOCK') => {
    setBusyId(taskId);
    try {
      await onTaskAction(taskId, action);
    } finally {
      setBusyId(null);
    }
  };

  const renderIcon = (status: TaskStatus) => {
    switch (status) {
      case 'RUNNING':
        return <Clock className="h-3.5 w-3.5 animate-pulse text-cyan-300" />;
      case 'REVIEW':
        return <AlertOctagon className="h-3.5 w-3.5 text-amber-300" />;
      case 'DONE':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />;
      case 'SKIPPED':
        return <SkipForward className="h-3.5 w-3.5 text-slate-400" />;
      case 'BLOCKED':
        return <Lock className="h-3.5 w-3.5 text-violet-300" />;
      case 'FAILED':
        return <XCircle className="h-3.5 w-3.5 text-rose-400" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  return (
    <aside className="os-glass flex h-full flex-col rounded-2xl p-3.5" aria-label="Live Task Feed">
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div>
          <h2 className="font-display text-sm font-semibold text-white">Task Feed</h2>
          <p className="text-[11px] text-slate-400">
            Distinct soft skips, gate blocks &amp; failures
          </p>
        </div>
        <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono-tech text-[10px] text-slate-300">
          {tasks.length}
        </span>
      </div>

      {/* Filter pills */}
      <div className="mt-2.5 flex flex-wrap gap-1">
        {(['ALL', 'RUNNING', 'REVIEW', 'DONE', 'SKIPPED', 'BLOCKED', 'FAILED'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilter(st)}
            className={`rounded-md px-2 py-0.5 font-mono-tech text-[10px] transition ${
              filter === st
                ? 'bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-400/50'
                : 'bg-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Task cards */}
      <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto pr-1">
        {visible.map((task) => {
          const meta = STATUS_VISUAL_META[task.status];
          const isSoftSkip = task.status === 'SKIPPED';
          const isGateBlock = task.status === 'BLOCKED';
          const isHardFail = task.status === 'FAILED';

          return (
            <div
              key={task.id}
              className={`rounded-xl border p-3 transition ${
                isHardFail
                  ? 'border-rose-500/50 bg-rose-950/25'
                  : isGateBlock
                    ? 'border-violet-400/40 bg-violet-950/20'
                    : isSoftSkip
                      ? 'border-dashed border-slate-600/60 bg-slate-900/40 opacity-85'
                      : 'border-white/10 bg-slate-900/65'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpenSpecialist(task.deskKey)}
                  className="text-left text-xs font-semibold text-slate-100 hover:text-cyan-300"
                >
                  {task.title}
                </button>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono-tech text-[9px] ${meta.badgeClass}`}>
                  {renderIcon(task.status)}
                  {meta.label}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-2 font-mono-tech text-[10px] text-slate-400">
                <span>Phase {task.phase}</span>
                <span>·</span>
                <span>{task.deskKey}</span>
                {task.isMock && (
                  <>
                    <span>·</span>
                    <span className="text-amber-300/90">MOCK</span>
                  </>
                )}
              </div>

              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">{task.statusReason}</p>

              {/* Progress bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${task.progressPct}%`, backgroundColor: meta.dotColor }}
                />
              </div>

              {/* Action controls */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {task.status === 'FAILED' && (
                  <button
                    type="button"
                    disabled={busyId === task.id}
                    onClick={() => trigger(task.id, 'RETRY')}
                    className="inline-flex items-center gap-1 rounded-md bg-rose-500/25 px-2 py-1 text-[10px] font-semibold text-rose-100 ring-1 ring-rose-400/40 hover:bg-rose-500/35"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Retry Task
                  </button>
                )}
                {task.status === 'RUNNING' && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === task.id}
                      onClick={() => trigger(task.id, 'PAUSE')}
                      className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[10px] text-slate-200 hover:bg-white/15"
                    >
                      <Pause className="h-3 w-3" />
                      Pause
                    </button>
                    <button
                      type="button"
                      disabled={busyId === task.id}
                      onClick={() => trigger(task.id, 'COMPLETE_MOCK')}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/30"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Complete (Mock)
                    </button>
                  </>
                )}
                {task.status === 'PAUSED' && (
                  <button
                    type="button"
                    disabled={busyId === task.id}
                    onClick={() => trigger(task.id, 'RESUME')}
                    className="inline-flex items-center gap-1 rounded-md bg-cyan-500/20 px-2 py-1 text-[10px] text-cyan-200 hover:bg-cyan-500/30"
                  >
                    <Play className="h-3 w-3" />
                    Resume
                  </button>
                )}
                {(task.status === 'RUNNING' || task.status === 'PAUSED' || task.status === 'QUEUED') && (
                  <button
                    type="button"
                    disabled={busyId === task.id}
                    onClick={() => trigger(task.id, 'CANCEL')}
                    className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[10px] text-slate-400 hover:text-rose-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 text-center text-xs text-slate-400">
            No tasks matching filter <span className="font-mono-tech">{filter}</span>.
          </div>
        )}
      </div>
    </aside>
  );
}
