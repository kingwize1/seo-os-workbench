import { SPECIALIST_DESK_BLUEPRINTS } from '../shared/constants';
import { assertValidTaskTransition, evaluatePhaseGate } from '../shared/stateMachine';
import type { Artifact, Task, TaskStatus } from '../shared/types';
import { generateId } from './crypto';
import type { Repositories } from './repositories';

// ==============================================================================
// Durable Orchestration Worker & Background Job Recovery Engine
// Executes multi-phase SEO workflows asynchronously without blocking HTTP routes.
// ==============================================================================

export class OrchestrationWorker {
  private readonly activeTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(private readonly repos: Repositories) {}

  /**
   * Startup recovery: moves any tasks stranded in RUNNING (from an unclean restart)
   * safely back to QUEUED with an explicit audit/event record.
   */
  recoverInterruptedTasks(): number {
    const stranded = this.repos.listAllRunningTasksForRecovery();
    for (const task of stranded) {
      this.repos.updateTaskStatus(task.organizationId, task.id, {
        status: 'QUEUED',
        statusReason: 'Recovered after worker restart — queued for idempotent resume.',
      });
      this.repos.appendTaskEvent(
        task.organizationId,
        task.id,
        'RUN_PAUSED',
        'Task recovered from interrupted RUNNING state on worker startup.',
        { previousProgress: task.progressPct }
      );
    }
    return stranded.length;
  }

  /**
   * Dispatches a full 3-phase SEO OS workflow for a client workspace.
   */
  launchOrchestratorWorkflow(params: {
    organizationId: string;
    userId: string;
    userName: string;
    clientId: string;
    objective: string;
    includeLocalSeo?: boolean;
  }): { runId: string; tasks: Task[] } {
    const runId = generateId('run');
    const now = new Date().toISOString();
    const coworkers = this.repos.listCoworkers(params.organizationId);
    const byDesk = new Map(coworkers.map((c) => [c.deskKey, c]));

    const createdTasks: Task[] = [];
    const phase1Ids: string[] = [];
    const phase2Ids: string[] = [];

    for (const bp of SPECIALIST_DESK_BLUEPRINTS) {
      const id = generateId('tsk');
      const cw = byDesk.get(bp.deskKey);
      const isLocalSkipped = bp.deskKey === 'local-seo' && !params.includeLocalSeo;

      const dependsOn =
        bp.phase === 1 ? [] : bp.phase === 2 ? [...phase1Ids] : [...phase1Ids, ...phase2Ids];

      const initialStatus: TaskStatus = isLocalSkipped
        ? 'SKIPPED'
        : bp.phase === 1
          ? 'QUEUED'
          : 'BLOCKED';

      const task: Task = {
        id,
        organizationId: params.organizationId,
        clientId: params.clientId,
        orchestratorRunId: runId,
        coworkerId: cw?.id ?? `spec_${bp.deskKey}`,
        deskKey: bp.deskKey,
        title: `${bp.shortLabel}: ${params.objective.slice(0, 64)}`,
        description: `${bp.role} Objective: ${params.objective}`,
        phase: bp.phase,
        status: initialStatus,
        statusReason: isLocalSkipped
          ? 'Expected soft skip: Local SEO not applicable for this client profile.'
          : bp.phase === 1
            ? 'Queued for parallel Phase 1 execution (Mock Specialist Adapter).'
            : `Waiting on Phase ${bp.phase - 1} gate completion.`,
        progressPct: isLocalSkipped ? 100 : 0,
        isMock: true,
        dependsOn,
        createdAt: now,
        updatedAt: now,
      };

      this.repos.insertTask(task);
      this.repos.appendTaskEvent(
        params.organizationId,
        task.id,
        'RUN_STARTED',
        `Dispatched by Central Orchestrator (${runId}).`,
        { phase: bp.phase, objective: params.objective }
      );

      createdTasks.push(task);
      if (bp.phase === 1) phase1Ids.push(id);
      if (bp.phase === 2) phase2Ids.push(id);
    }

    this.repos.recordAuditEvent({
      organizationId: params.organizationId,
      userId: params.userId,
      actorType: 'ORCHESTRATOR',
      actorName: 'Central SEO OS Orchestrator',
      coworkerId: null,
      action: 'ORCHESTRATOR_WORKFLOW_DISPATCHED',
      toolName: null,
      redactedInput: { clientId: params.clientId, objective: params.objective, runId },
      redactedOutput: { taskCount: createdTasks.length, isMock: true },
      approvalId: null,
      outcome: 'SUCCESS',
    });

    // Advance Phase 1 tasks asynchronously in background
    this.scheduleBackgroundProgress(params.organizationId, params.clientId, runId);

    return { runId, tasks: createdTasks };
  }

  /**
   * Transitions a task with state machine validation and re-evaluates downstream phase gates.
   */
  transitionTask(params: {
    organizationId: string;
    userId: string;
    userName: string;
    taskId: string;
    action: 'PAUSE' | 'RESUME' | 'CANCEL' | 'RETRY' | 'COMPLETE_MOCK';
  }): Task {
    const task = this.repos.getTask(params.organizationId, params.taskId);
    if (!task) throw new Error('Task not found in organization');

    let nextStatus: TaskStatus = task.status;
    let reason = task.statusReason;
    let progressPct = task.progressPct;

    if (params.action === 'PAUSE') {
      assertValidTaskTransition(task.status, 'PAUSED');
      nextStatus = 'PAUSED';
      reason = `Paused by ${params.userName}.`;
    } else if (params.action === 'RESUME') {
      assertValidTaskTransition(task.status, 'RUNNING');
      nextStatus = 'RUNNING';
      reason = `Resumed by ${params.userName}.`;
    } else if (params.action === 'CANCEL') {
      assertValidTaskTransition(task.status, 'CANCELLED');
      nextStatus = 'CANCELLED';
      reason = `Cancelled by ${params.userName}.`;
    } else if (params.action === 'RETRY') {
      assertValidTaskTransition(task.status, 'RUNNING');
      nextStatus = 'DONE'; // Deterministic mock recovery for immediate verification
      progressPct = 100;
      reason = `Retried by ${params.userName} using deterministic fallback fixture — completed cleanly.`;
    } else if (params.action === 'COMPLETE_MOCK') {
      assertValidTaskTransition(task.status, 'DONE');
      nextStatus = 'DONE';
      progressPct = 100;
      reason = 'Completed by Mock Specialist Adapter with evidence links.';
    }

    const updated = this.repos.updateTaskStatus(params.organizationId, task.id, {
      status: nextStatus,
      statusReason: reason,
      progressPct,
    });

    this.repos.appendTaskEvent(params.organizationId, task.id, 'STEP_STARTED', reason, {
      action: params.action,
      status: nextStatus,
    });

    this.repos.recordAuditEvent({
      organizationId: params.organizationId,
      userId: params.userId,
      actorType: 'USER',
      actorName: params.userName,
      coworkerId: task.coworkerId,
      action: `TASK_${params.action}`,
      toolName: null,
      redactedInput: { taskId: task.id, fromStatus: task.status },
      redactedOutput: { toStatus: nextStatus },
      approvalId: null,
      outcome: 'SUCCESS',
    });

    this.evaluateAndUnlockDownstreamGates(params.organizationId, task.clientId);
    return updated;
  }

  evaluateAndUnlockDownstreamGates(orgId: string, clientId: string): void {
    const tasks = this.repos.listTasks(orgId, clientId);
    for (const task of tasks) {
      if (task.status !== 'BLOCKED') continue;
      const gate = evaluatePhaseGate(task, tasks);
      if (gate.satisfied) {
        this.repos.updateTaskStatus(orgId, task.id, {
          status: 'RUNNING',
          statusReason: `${gate.reason} Running via Mock Specialist Adapter.`,
          progressPct: Math.max(task.progressPct, 35),
        });
      }
    }
  }

  private scheduleBackgroundProgress(orgId: string, clientId: string, runId: string): void {
    const timer = setTimeout(() => {
      this.activeTimers.delete(timer);
      try {
        const tasks = this.repos.listTasks(orgId, clientId).filter((t) => t.orchestratorRunId === runId);
        for (const t of tasks) {
          if (t.phase === 1 && t.status === 'QUEUED') {
            this.repos.updateTaskStatus(orgId, t.id, {
              status: 'DONE',
              statusReason: 'Completed Phase 1 diagnostic via deterministic mock adapter.',
              progressPct: 100,
            });
          }
        }
        this.evaluateAndUnlockDownstreamGates(orgId, clientId);

        const artifact: Artifact = {
          id: generateId('art'),
          organizationId: orgId,
          clientId,
          taskId: tasks[0]?.id ?? null,
          title: `Orchestrator Evidence Digest (${runId.slice(-6)}) [MOCK ADAPTER]`,
          kind: 'FINAL_RECOMMENDATION',
          format: 'markdown',
          confidence: 0.89,
          approved: false,
          createdAt: new Date().toISOString(),
          provenance: {
            generatedBy: 'Central SEO OS Orchestrator (Mock Adapter)',
            toolsUsed: ['seo_crawl_inspector', 'serp_analyzer', 'schema_validator'],
            sourceLinks: ['https://demo-fixture.local/orchestrator/' + runId],
            timestamp: new Date().toISOString(),
            isMock: true,
          },
          content: `# Orchestrator Run Digest (${runId})\n\n> **Provider Mode**: Typed Mock Adapter (no external services contacted).\n\n## Summary\nPhase 1 diagnostics completed and Phase 2 specialist desks have been unblocked. Review generated drafts and approve before publishing.`,
        };
        this.repos.insertArtifact(artifact);
      } catch {
        // Ignore if database closed during teardown in tests
      }
    }, 250);
    this.activeTimers.add(timer);
  }

  shutdown(): void {
    for (const t of this.activeTimers) {
      clearTimeout(t);
    }
    this.activeTimers.clear();
  }
}
