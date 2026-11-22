import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp, type ServerBundle } from '../server/app';

describe('Personal Agent Waitlist, Running Tracker, Email to kingwizemusic@gmail.com & Instant Approval Link', () => {
  let bundle: ServerBundle;

  afterEach(() => {
    bundle?.close();
  });

  it('tracks waitlist signups, emails setup info + instant approval link to kingwizemusic@gmail.com, and unlocks access upon one-click approval', async () => {
    bundle = createApp({ dbPath: ':memory:' });

    // 1. Check baseline running tracker
    const initialTracker = await request(bundle.app).get('/api/waitlist/tracker');
    expect(initialTracker.status).toBe(200);
    expect(initialTracker.body.tracker.approverEmail).toBe('kingwizemusic@gmail.com');
    const initialTotal = initialTracker.body.tracker.totalJoined as number;
    const initialApproved = initialTracker.body.tracker.approvedCount as number;

    // 2. User submits Personal Agent setup info to join the waitlist
    const joinRes = await request(bundle.app).post('/api/waitlist/join').send({
      name: 'Maya Rivera',
      email: 'maya.rivera@example.com',
      roleTitle: 'Independent SEO Strategist',
      useCase: 'Weekly technical crawl monitoring and personal research summaries',
      preferredTone: 'analytical',
      wantsBrowser: true,
      wantsFiles: true,
      wantsTerminal: false,
      websiteUrl: 'https://mayarivera.example',
      originUrl: 'https://kingwize1.github.io/seo-os-workbench',
    });

    expect(joinRes.status).toBe(201);
    expect(joinRes.body.entry.status).toBe('PENDING');
    expect(joinRes.body.entry.approverEmail).toBe('kingwizemusic@gmail.com');
    expect(joinRes.body.tracker.totalJoined).toBe(initialTotal + 1);

    // 3. Verify approval email was queued/sent to kingwizemusic@gmail.com with all setup details & instant approval link
    expect(bundle.emailAdapter.outbox.length).toBe(1);
    const outgoing = bundle.emailAdapter.outbox[0];
    expect(outgoing.to).toBe('kingwizemusic@gmail.com');
    expect(outgoing.text).toContain('Maya Rivera');
    expect(outgoing.text).toContain('maya.rivera@example.com');
    expect(outgoing.text).toContain('Independent SEO Strategist');
    expect(outgoing.text).toContain('Weekly technical crawl monitoring');
    expect(outgoing.approvalUrl).toContain('/personal/approve?token=');

    const token = new URL(outgoing.approvalUrl).searchParams.get('token');
    expect(token).toBeTruthy();

    // 4. Invalid approval token is rejected (404)
    const badApprove = await request(bundle.app)
      .post('/api/waitlist/approve')
      .send({ token: 'forged_invalid_token' });
    expect(badApprove.status).toBe(404);

    // 5. Clicking/calling the instant approval link immediately approves Maya and increments tracker
    const approveRes = await request(bundle.app)
      .post('/api/waitlist/approve')
      .send({ token });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.approved).toBe(true);
    expect(approveRes.body.entry.status).toBe('APPROVED');
    expect(approveRes.body.entry.accessUrl).toContain('/personal/agent?access=');
    expect(approveRes.body.tracker.approvedCount).toBe(initialApproved + 1);

    // 6. Tracker lookup by email now confirms APPROVED and returns unlock link
    const statusAfter = await request(bundle.app).get('/api/waitlist/tracker?email=maya.rivera@example.com');
    expect(statusAfter.status).toBe(200);
    expect(statusAfter.body.viewerEntry.status).toBe('APPROVED');
    expect(statusAfter.body.viewerEntry.accessUrl).toContain('/personal/agent?access=');
  });
});
