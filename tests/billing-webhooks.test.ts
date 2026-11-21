import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp, type ServerBundle } from '../server/app';
import { PRICING } from '../shared/constants';

describe('Checkout ($997 Setup + 2 Months Included + $2,400/mo), Signed Webhooks & Entitlements', () => {
  let bundle: ServerBundle;

  afterEach(() => {
    bundle?.close();
  });

  it('never grants paid access on checkout creation alone; requires verified signed webhook and handles idempotency + failed payments', async () => {
    bundle = createApp({ dbPath: ':memory:' });

    const signup = await request(bundle.app).post('/api/auth/signup').send({
      email: 'founder@growthco.example',
      name: 'Taylor Founder',
      password: 'FounderPass123!',
      organizationName: 'GrowthCo',
    });
    const token = signup.body.sessionToken as string;
    const orgId = signup.body.organization.id as string;

    // 1. Before payment, /api/desk/bootstrap returns 402 Payment Required
    const blockedBefore = await request(bundle.app)
      .get('/api/desk/bootstrap')
      .set('Authorization', `Bearer ${token}`);
    expect(blockedBefore.status).toBe(402);

    // 2. Creating a $997 setup checkout session MUST NOT unlock Business Workspace
    const chk = await request(bundle.app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ returnUrl: 'http://localhost:5173/checkout' });
    expect(chk.status).toBe(201);
    expect(chk.body.amountCents).toBe(99700);
    expect(chk.body.entitlementGranted).toBe(false);

    const stillBlockedAfterReturn = await request(bundle.app)
      .get('/api/desk/bootstrap')
      .set('Authorization', `Bearer ${token}`);
    expect(stillBlockedAfterReturn.status).toBe(402);

    // 3. Unsigned or forged webhook MUST be rejected (400)
    const forged = await request(bundle.app)
      .post('/api/webhooks/payment')
      .set('stripe-signature', 't=12345,v1=deadbeef')
      .send({
        eventId: 'evt_forged',
        type: 'checkout.session.completed',
        organizationId: orgId,
        amountCents: PRICING.setupFeeCents,
      });
    expect(forged.status).toBe(400);

    // 4. Valid HMAC-signed webhook provisions TRIAL_INCLUDED (2 months included, then $2,400/mo)
    const signed = bundle.paymentProvider.createSignedTestWebhook!({
      eventId: 'evt_valid_setup_001',
      type: 'checkout.session.completed',
      organizationId: orgId,
      providerSessionId: chk.body.providerSessionId,
      amountCents: PRICING.setupFeeCents,
      occurredAt: new Date().toISOString(),
    });
    const okHook = await request(bundle.app)
      .post('/api/webhooks/payment')
      .set('stripe-signature', signed.signatureHeader)
      .send(JSON.parse(signed.rawBody));
    expect(okHook.status).toBe(200);
    expect(okHook.body.duplicate).toBe(false);
    expect(okHook.body.entitlement.status).toBe('TRIAL_INCLUDED');
    expect(okHook.body.entitlement.setupFeeCents).toBe(99700);
    expect(okHook.body.entitlement.monthlyAmountCents).toBe(240000);
    expect(okHook.body.entitlement.includedMonths).toBe(2);

    // 5. Replaying the exact same eventId is idempotent (no duplicate invoices)
    const invoicesCountBefore = bundle.repos.listInvoices(orgId).length;
    const replayHook = await request(bundle.app)
      .post('/api/webhooks/payment')
      .set('stripe-signature', signed.signatureHeader)
      .send(JSON.parse(signed.rawBody));
    expect(replayHook.status).toBe(200);
    expect(replayHook.body.duplicate).toBe(true);
    expect(bundle.repos.listInvoices(orgId).length).toBe(invoicesCountBefore);

    // 6. Business Desk is now accessible (200)
    const unlocked = await request(bundle.app)
      .get('/api/desk/bootstrap')
      .set('Authorization', `Bearer ${token}`);
    expect(unlocked.status).toBe(200);

    // 7. Failed payment webhook transitions entitlement to PAST_DUE and gates Business Desk again
    const failedSigned = bundle.paymentProvider.createSignedTestWebhook!({
      eventId: 'evt_failed_002',
      type: 'invoice.payment_failed',
      organizationId: orgId,
      amountCents: PRICING.monthlySubscriptionCents,
      occurredAt: new Date().toISOString(),
    });
    const failedRes = await request(bundle.app)
      .post('/api/webhooks/payment')
      .set('stripe-signature', failedSigned.signatureHeader)
      .send(JSON.parse(failedSigned.rawBody));
    expect(failedRes.status).toBe(200);
    expect(failedRes.body.entitlement.status).toBe('PAST_DUE');

    const lockedAgain = await request(bundle.app)
      .get('/api/desk/bootstrap')
      .set('Authorization', `Bearer ${token}`);
    expect(lockedAgain.status).toBe(402);
  });
});
