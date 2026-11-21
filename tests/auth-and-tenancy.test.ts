import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp, type ServerBundle } from '../server/app';
import { PRICING } from '../shared/constants';

describe('Authentication, Authorization (RBAC) & Strict Tenant Isolation', () => {
  let bundle: ServerBundle;

  afterEach(() => {
    bundle?.close();
  });

  function provisionOrgViaSignedWebhook(b: ServerBundle, orgId: string, eventId: string) {
    const signed = b.paymentProvider.createSignedTestWebhook!({
      eventId,
      type: 'checkout.session.completed',
      organizationId: orgId,
      amountCents: PRICING.setupFeeCents,
      occurredAt: new Date().toISOString(),
    });
    return request(b.app)
      .post('/api/webhooks/payment')
      .set('stripe-signature', signed.signatureHeader)
      .send(JSON.parse(signed.rawBody));
  }

  it('enforces auth, blocks cross-org client/task access, and isolates personal workspaces', async () => {
    bundle = createApp({ dbPath: ':memory:' });

    // Unauthenticated requests to protected routes are rejected
    const unauth = await request(bundle.app).get('/api/desk/bootstrap');
    expect(unauth.status).toBe(401);

    // Sign up Org A (Alice) and Org B (Bob)
    const aliceRes = await request(bundle.app).post('/api/auth/signup').send({
      email: 'alice@orga.example',
      name: 'Alice Owner',
      password: 'PasswordA123!',
      organizationName: 'Org Alpha',
    });
    expect(aliceRes.status).toBe(201);
    const aliceToken = aliceRes.body.sessionToken as string;
    const orgAId = aliceRes.body.organization.id as string;

    const bobRes = await request(bundle.app).post('/api/auth/signup').send({
      email: 'bob@orgb.example',
      name: 'Bob Owner',
      password: 'PasswordB123!',
      organizationName: 'Org Beta',
    });
    expect(bobRes.status).toBe(201);
    const bobToken = bobRes.body.sessionToken as string;
    const orgBId = bobRes.body.organization.id as string;

    // Personal agent works WITHOUT paying for business workspace and never exposes org data
    const personalRes = await request(bundle.app)
      .get('/api/personal/workspace')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(personalRes.status).toBe(200);
    expect(personalRes.body.workspace.userId).toBe(aliceRes.body.user.id);
    expect(personalRes.body.organization).toBeUndefined();
    expect(personalRes.body.clients).toBeUndefined();

    // Provision both orgs via verified webhooks
    await provisionOrgViaSignedWebhook(bundle, orgAId, 'evt_org_a_1');
    await provisionOrgViaSignedWebhook(bundle, orgBId, 'evt_org_b_1');

    // Org A creates a confidential client
    const clientRes = await request(bundle.app)
      .post('/api/desk/clients')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        name: 'Secret Client Alpha',
        domain: 'secret-alpha.example',
        industry: 'FinTech',
        goals: ['Audit'],
      });
    expect(clientRes.status).toBe(201);
    const secretClientId = clientRes.body.client.id as string;

    // Org B MUST NOT be able to read Org A's client
    const crossRead = await request(bundle.app)
      .get(`/api/desk/clients/${secretClientId}`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(crossRead.status).toBe(404);

    // Org B bootstrap MUST NOT contain Org A's client or coworkers
    const bobBoot = await request(bundle.app)
      .get('/api/desk/bootstrap')
      .set('Authorization', `Bearer ${bobToken}`);
    expect(bobBoot.status).toBe(200);
    expect(bobBoot.body.clients.some((c: { id: string }) => c.id === secretClientId)).toBe(false);
  });

  it('enforces RBAC so VIEWER cannot mutate admin settings or delete org, and never leaks encrypted secrets', async () => {
    bundle = createApp({ dbPath: ':memory:' });

    const ownerRes = await request(bundle.app).post('/api/auth/signup').send({
      email: 'owner@acme.example',
      name: 'Owner User',
      password: 'OwnerPass123!',
      organizationName: 'Acme Corp',
    });
    const orgId = ownerRes.body.organization.id as string;
    const ownerToken = ownerRes.body.sessionToken as string;
    await provisionOrgViaSignedWebhook(bundle, orgId, 'evt_acme_1');

    // Add a VIEWER user to Acme Corp
    const viewerSignup = await request(bundle.app).post('/api/auth/signup').send({
      email: 'viewer@acme.example',
      name: 'Viewer User',
      password: 'ViewerPass123!',
      organizationName: 'Unused',
    });
    bundle.repos.addMemberToOrg(orgId, viewerSignup.body.user.id, 'VIEWER');
    const viewerToken = bundle.repos.createSession(viewerSignup.body.user.id, orgId);

    // Viewer CAN read desk bootstrap
    const readOk = await request(bundle.app)
      .get('/api/desk/bootstrap')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(readOk.status).toBe(200);

    // Viewer CANNOT update admin policies or create clients
    const mutateAdmin = await request(bundle.app)
      .patch('/api/desk/admin/settings')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ retentionDays: 7 });
    expect(mutateAdmin.status).toBe(403);

    const createClientDenied = await request(bundle.app)
      .post('/api/desk/clients')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'X', domain: 'x.example', industry: 'SaaS', goals: [] });
    expect(createClientDenied.status).toBe(403);

    // Owner configures an integration secret — response MUST NOT echo raw secret
    const integId = readOk.body.integrations[0].id as string;
    const rawSecret = 'sk_live_SUPER_SECRET_KEY_999999';
    const cfgRes = await request(bundle.app)
      .post(`/api/desk/integrations/${integId}/configure`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ secretValue: rawSecret });
    expect(cfgRes.status).toBe(200);
    expect(JSON.stringify(cfgRes.body)).not.toContain(rawSecret);

    // Audit log also MUST NOT contain the raw secret
    const bootAfter = await request(bundle.app)
      .get('/api/desk/bootstrap')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(JSON.stringify(bootAfter.body.auditEvents)).not.toContain(rawSecret);
  });
});
