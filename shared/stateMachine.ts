import type { Task, TaskStatus } from './types';

// ==============================================================================
// Durable Task State Machine & Phase-Gate Evaluator
// Explicitly distinguishes:
//   - SKIPPED (expected soft skip, does NOT block downstream gates)
//   - BLOCKED (dependency or phase gate not satisfied)
//   - FAILED  (real execution error, DOES block downstream gates until retried)
// ==============================================================================

const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  QUEUED: ['RUNNING', 'BLOCKED', 'SKIPPED', 'CANCELLED'],
  BLOCKED: ['QUEUED', 'RUNNING', 'SKIPPED', 'CANCELLED'],
  RUNNING: ['PAUSED', 'REVIEW', 'DONE', 'SKIPPED', 'FAILED', 'CANCELLED'],
  PAUSED: ['RUNNING', 'CANCELLED'],
  REVIEW: ['DONE', 'RUNNING', 'FAILED', 'CANCELLED'],
  FAILED: ['QUEUED', 'RUNNING', 'CANCELLED'],
  SKIPPED: ['QUEUED'], // Allow manual re-enable if user overrides soft skip
  DONE: [],
  CANCELLED: ['QUEUED'],
};

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertValidTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransitionTask(from, to)) {
    throw new Error(`Invalid task state transition: ${from} -> ${to}`);
  }
}

export interface GateEvaluation {
  satisfied: boolean;
  blockingTaskIds: string[];
  softSkippedTaskIds: string[];
  failedTaskIds: string[];
  reason: string;
}

/**
 * Evaluates whether a task's dependencies / phase gate are satisfied.
 * - DONE and SKIPPED (expected soft skips) satisfy dependencies.
 * - FAILED blocks downstream tasks with an explicit failure callout.
 * - QUEUED / RUNNING / PAUSED / REVIEW / BLOCKED keep the task BLOCKED until complete.
 */
export function evaluatePhaseGate(task: Task, allTasks: Task[]): GateEvaluation {
  if (!task.dependsOn || task.dependsOn.length === 0) {
    return {
      satisfied: true,
      blockingTaskIds: [],
      softSkippedTaskIds: [],
      failedTaskIds: [],
      reason: 'No upstream dependencies.',
    };
  }

  const byId = new Map(allTasks.map((t) => [t.id, t]));
  const blockingTaskIds: string[] = [];
  const softSkippedTaskIds: string[] = [];
  const failedTaskIds: string[] = [];

  for (const depId of task.dependsOn) {
    const dep = byId.get(depId);
    if (!dep) continue;
    if (dep.status === 'DONE') {
      continue;
    }
    if (dep.status === 'SKIPPED') {
      softSkippedTaskIds.push(dep.id);
      continue;
    }
    if (dep.status === 'FAILED') {
      failedTaskIds.push(dep.id);
      blockingTaskIds.push(dep.id);
      continue;
    }
    blockingTaskIds.push(dep.id);
  }

  if (blockingTaskIds.length === 0) {
    const note =
      softSkippedTaskIds.length > 0
        ? `Phase gate satisfied (${softSkippedTaskIds.length} expected soft-skip ignored).`
        : 'All upstream dependencies completed.';
    return {
      satisfied: true,
      blockingTaskIds,
      softSkippedTaskIds,
      failedTaskIds,
      reason: note,
    };
  }

  const reason =
    failedTaskIds.length > 0
      ? `Blocked by ${failedTaskIds.length} failed upstream task(s) requiring retry.`
      : `Waiting on ${blockingTaskIds.length} upstream phase-gate task(s).`;

  return {
    satisfied: false,
    blockingTaskIds,
    softSkippedTaskIds,
    failedTaskIds,
    reason,
  };
}

export const STATUS_VISUAL_META: Record<
  TaskStatus,
  {
    label: string;
    category: 'active' | 'review' | 'complete' | 'soft_skip' | 'dependency_block' | 'hard_failure' | 'neutral';
    badgeClass: string;
    dotColor: string;
    description: string;
  }
> = {
  RUNNING: {
    label: 'RUNNING',
    category: 'active',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40',
    dotColor: '#22d3ee',
    description: 'Actively executing in background worker',
  },
  REVIEW: {
    label: 'REVIEW',
    category: 'review',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-400/45',
    dotColor: '#fbbf24',
    description: 'Output or sensitive action awaiting human review',
  },
  DONE: {
    label: 'DONE',
    category: 'complete',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
    dotColor: '#34d399',
    description: 'Completed with evidence & audit receipt',
  },
  SKIPPED: {
    label: 'SKIPPED (Soft)',
    category: 'soft_skip',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-400/35 border-dashed',
    dotColor: '#94a3b8',
    description: 'Expected soft skip — non-applicable for this client; does not fail phase gate',
  },
  BLOCKED: {
    label: 'BLOCKED (Gate)',
    category: 'dependency_block',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-400/45',
    dotColor: '#a78bfa',
    description: 'Paused on upstream dependency or phase gate',
  },
  FAILED: {
    label: 'FAILED',
    category: 'hard_failure',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
    dotColor: '#fb7185',
    description: 'Real execution error — requires retry or credential fix',
  },
  PAUSED: {
    label: 'PAUSED',
    category: 'neutral',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-400/35',
    dotColor: '#38bdf8',
    description: 'Manually paused by user',
  },
  QUEUED: {
    label: 'QUEUED',
    category: 'neutral',
    badgeClass: 'bg-zinc-500/15 text-zinc-300 border-zinc-400/30',
    dotColor: '#a1a1aa',
    description: 'Queued for worker pickup',
  },
  CANCELLED: {
    label: 'CANCELLED',
    category: 'neutral',
    badgeClass: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/40 line-through',
    dotColor: '#52525b',
    description: 'Cancelled by user',
  },
};
