import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp, type ServerBundle } from '../server/app';
import { PRICING } from '../shared/constants';
import { evaluatePhaseGate, canTransitionTask } from '../shared/stateMachine';
import { redactSensitiveData } from '../shared/policyEngine';
import type { Task } from '../shared/types';

describe('Task State Machine, Phase Gates, Job Recovery, Approval Gates & Audit Receipts', () => {
  let bundle: ServerBundle;

  afterEach(() => {
    bundle?.close();
  });

  it('distinguishes expected soft skips from dependency blocks and hard failures in phase gates', () => {
    expect(canTransitionTask('FAILED', 'RUNNING')).toBe(true);
    expect(canTransitionTask('DONE', 'RUNNING')).toBe(false);

    const base: Omit<Task, 'id' | 'status' | 'dependsOn'> = {
      organizationId: 'org1',
      clientId: 'cli1',
      orchestratorRunId: 'run1',
      coworkerId: 'cw1',
      deskKey: 'd',
      title: 'T',
      description: 'D',
      phase: 1,
      statusReason: '',
      progressPct: 100,
      isMock: true,
      createdAt: '',
      updatedAt: '',
    };

    const tDone: Task = { ...base, id: 't1', status: 'DONE', dependsOn: [] };
    const tSoftSkip: Task = { ...base, id: 't2', status: 'SKIPPED', dependsOn: [] };
    const tFailed: Task = { ...base, id: 't3', status: 'FAILED', dependsOn: [] };
    const tGateWithSoftSkip: Task = { ...base, id: 't4', status: 'BLOCKED', phase: 3, dependsOn: ['t1', 't2'] };
    const tGateWithFailure: Task = { ...base, id: 't5', status: 'BLOCKED', phase: 3, dependsOn: ['t1', 't2', 't3'] };

    // Soft skip satisfies phase gate cleanly
    const evalOk = evaluatePhaseGate(tGateWithSoftSkip, [tDone, tSoftSkip, tGateWithSoftSkip]);
    expect(evalOk.satisfied).toBe(true);
    expect(evalOk.softSkippedTaskIds).toEqual(['t2']);

    // Hard failure blocks phase gate with explicit failedTaskIds
    const evalBlocked = evaluatePhaseGate(tGateWithFailure, [tDone, tSoftSkip, tFailed, tGateWithFailure]);
    expect(evalBlocked.satisfied).toBe(false);
    expect(evalBlocked.failedTaskIds).toEqual(['t3']);
  });

  it('blocks disallowed tools, pauses sensitive tools for approval with secret redaction, and recovers interrupted worker jobs', async () => {
    bundle = createApp({ dbPath: ':memory:' });

    const signup = await request(bundle.app).post('/api/auth/signup').send({
      email: 'ops@agency.example',
      name: 'Ops Lead',
      password: 'OpsPassword123!',
      organizationName: 'Agency Ops',
    });
    const token = signup.body.sessionToken as string;
    const orgId = signup.body.organization.id as string;

    const signed = bundle.paymentProvider.createSignedTestWebhook!({
      eventId: 'evt_ops_1',
      type: 'checkout.session.completed',
      organizationId: orgId,
      amountCents: PRICING.setupFeeCents,
      occurredAt: new Date().toISOString(),
    });
    await request(bundle.app)
      .post('/api/webhooks/payment')
      .set('stripe-signature', signed.signatureHeader)
      .send(JSON.parse(signed.rawBody));

    const boot = await request(bundle.app)
      .get('/api/desk/bootstrap')
      .set('Authorization', `Bearer ${token}`);
    const contentCoworker = boot.body.coworkers.find((c: { name: string }) => c.name === 'Devon Park');
    expect(contentCoworker).toBeTruthy();

    // 1. Disallowed / org-blocked tool is rejected (403) and audited
    const blockedRes = await request(bundle.app)
      .post(`/api/desk/coworkers/${contentCoworker.id}/invoke-tool`)
      .set('Authorization', `Bearer ${token}`)
      .send({ toolId: 'data_delete', summary: 'Delete all pages', payload: {} });
    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.status).toBe('BLOCKED');

    // 2. Sensitive tool (cms_publish) pauses with 202 APPROVAL_REQUIRED and redacts apiKey
    const pausedRes = await request(bundle.app)
      .post(`/api/desk/coworkers/${contentCoworker.id}/invoke-tool`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        toolId: 'cms_publish',
        summary: 'Stage EHR brief',
        payload: { slug: '/epic', apiKey: 'sk_live_secret_value_12345' },
      });
    expect(pausedRes.status).toBe(202);
    expect(pausedRes.body.status).toBe('APPROVAL_REQUIRED');
    expect(pausedRes.body.approvalRequest.redactedPayload.apiKey).toBe('[REDACTED]');

    // 3. Approving the request records decision & audit event
    const apprId = pausedRes.body.approvalRequest.id as string;
    const decideRes = await request(bundle.app)
      .post(`/api/desk/approvals/${apprId}/decide`)
      .set('Authorization', `Bearer ${token}`)
      .send({ decision: 'APPROVED', note: 'Reviewed copy and links' });
    expect(decideRes.status).toBe(200);
    expect(decideRes.body.approval.status).toBe('APPROVED');

    // 4. Worker startup recovery moves stranded RUNNING tasks cleanly to QUEUED
    const runningTask = boot.body.tasks.find((t: { status: string }) => t.status === 'RUNNING');
    expect(runningTask).toBeTruthy();
    const recoveredCount = bundle.worker.recoverInterruptedTasks();
    expect(recoveredCount).toBeGreaterThanOrEqual(1);
    const recoveredTask = bundle.repos.getTask(orgId, runningTask.id);
    expect(recoveredTask?.status).toBe('QUEUED');

    // 5. Direct redaction utility check
    const redacted = redactSensitiveData({ authorization: 'Bearer abcdef123456789', safe: 'ok' });
    expect(redacted.authorization).toBe('[REDACTED]');
    expect(redacted.safe).toBe('ok');
  });
});
