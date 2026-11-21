import type {
  Coworker,
  Organization,
  PersonalWorkspace,
  SessionSnapshot,
  ThemeId,
} from '@shared/types';
import { sandboxEngine, type DeskBootstrapData } from './sandboxEngine';

// ==============================================================================
// Unified API Client
// Uses the real Express+SQLite API when available; seamlessly activates the
// clearly-badged Static Demo Sandbox when running on GitHub Pages.
// ==============================================================================

const STATIC_FORCED = import.meta.env.VITE_STATIC_DEMO_MODE === 'true';

let detectedStaticFallback = STATIC_FORCED;

async function tryHttp<T>(url: string, init?: RequestInit): Promise<T | null> {
  if (detectedStaticFallback) return null;
  try {
    const res = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      detectedStaticFallback = true;
      return null;
    }
    const json = (await res.json()) as T & { error?: string };
    if (!res.ok) {
      throw new Error(json.error || `Request failed (${res.status})`);
    }
    return json;
  } catch (err) {
    if (err instanceof TypeError) {
      // Network error / static host without backend server
      detectedStaticFallback = true;
      return null;
    }
    throw err;
  }
}

export function isStaticSandboxMode(): boolean {
  return detectedStaticFallback;
}

export const api = {
  async getSession(): Promise<SessionSnapshot> {
    const live = await tryHttp<SessionSnapshot>('/api/auth/session');
    if (live) return live;
    return sandboxEngine.getSession();
  },

  async signup(input: {
    email: string;
    name: string;
    password: string;
    organizationName?: string;
    autoActivateDemoEntitlement?: boolean;
  }): Promise<SessionSnapshot> {
    if (!input.autoActivateDemoEntitlement) {
      const live = await tryHttp<SessionSnapshot>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (live) return live;
    }
    return sandboxEngine.signup(input);
  },

  async signin(input: { email: string; password: string }): Promise<SessionSnapshot> {
    const live = await tryHttp<SessionSnapshot>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (live) return live;
    return sandboxEngine.signin(input);
  },

  async signout(): Promise<void> {
    const live = await tryHttp('/api/auth/signout', { method: 'POST' });
    if (!live) sandboxEngine.signout();
  },

  async createCheckoutSession(returnUrl: string) {
    const live = await tryHttp<{
      provider: 'test' | 'stripe';
      providerSessionId: string;
      checkoutUrl: string;
      amountCents: number;
      summary: string;
      entitlementGranted: false;
    }>('/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ returnUrl }),
    });
    if (live) return live;
    return sandboxEngine.createCheckoutSession();
  },

  async triggerTestWebhook(params: {
    eventType: 'checkout.session.completed' | 'invoice.payment_failed' | 'customer.subscription.deleted';
    eventId?: string;
    providerSessionId?: string;
  }) {
    const live = await tryHttp<{
      verified: boolean;
      duplicate: boolean;
      eventId: string;
      entitlement: SessionSnapshot['entitlement'];
      invoices: DeskBootstrapData['invoices'];
    }>('/api/billing/test-webhook-trigger', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (live) return live;
    return sandboxEngine.triggerTestWebhook(params);
  },

  async completeOnboarding(input: {
    organizationName?: string;
    clientName?: string;
    clientDomain?: string;
    industry?: string;
    goals?: string[];
    safeDefaultsEnabled?: boolean;
  }) {
    const live = await tryHttp('/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (live) return live;
    return sandboxEngine.completeOnboarding(input);
  },

  async getDeskBootstrap(): Promise<DeskBootstrapData> {
    const live = await tryHttp<DeskBootstrapData>('/api/desk/bootstrap');
    if (live) return live;
    return sandboxEngine.getDeskBootstrap();
  },

  async setTheme(theme: ThemeId) {
    const live = await tryHttp('/api/desk/theme', {
      method: 'PATCH',
      body: JSON.stringify({ theme }),
    });
    if (live) return live;
    return sandboxEngine.setTheme(theme);
  },

  async createClient(input: { name: string; domain: string; industry: string; goals: string[] }) {
    const live = await tryHttp('/api/desk/clients', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (live) return live;
    return sandboxEngine.createClient(input);
  },

  async runOrchestrator(input: { clientId: string; objective: string; includeLocalSeo?: boolean }) {
    const live = await tryHttp('/api/desk/orchestrator/run', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (live) return live;
    return sandboxEngine.runOrchestrator(input);
  },

  async taskAction(taskId: string, action: 'PAUSE' | 'RESUME' | 'CANCEL' | 'RETRY' | 'COMPLETE_MOCK') {
    const live = await tryHttp(`/api/desk/tasks/${taskId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
    if (live) return live;
    return sandboxEngine.taskAction(taskId, action);
  },

  async createCoworker(input: {
    name: string;
    role: string;
    instructions: string;
    allowedTools: string[];
    approvalPolicy: Coworker['approvalPolicy'];
    scheduleCron: string | null;
    defaultSpaceId: string | null;
    clientId: string | null;
    avatarEmoji?: string;
    accentColor?: string;
  }) {
    const live = await tryHttp('/api/desk/coworkers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (live) return live;
    return sandboxEngine.createCoworker(input);
  },

  async invokeCoworkerTool(coworkerId: string, toolId: string, summary: string, payload: Record<string, unknown>) {
    const live = await tryHttp<{
      status: 'EXECUTED' | 'APPROVAL_REQUIRED' | 'BLOCKED';
      reason?: string;
      result?: unknown;
      approvalRequest?: unknown;
    }>(`/api/desk/coworkers/${coworkerId}/invoke-tool`, {
      method: 'POST',
      body: JSON.stringify({ toolId, summary, payload }),
    });
    if (live) return live;
    return sandboxEngine.invokeCoworkerTool(coworkerId, toolId, summary, payload);
  },

  async decideBusinessApproval(approvalId: string, decision: 'APPROVED' | 'REJECTED', note?: string) {
    const live = await tryHttp(`/api/desk/approvals/${approvalId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, note }),
    });
    if (live) return live;
    return sandboxEngine.decideBusinessApproval(approvalId, decision, note);
  },

  async savePage(input: {
    pageId?: string;
    spaceId: string;
    parentPageId?: string | null;
    title: string;
    content: string;
  }) {
    const live = await tryHttp('/api/desk/spaces/pages', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (live) return live;
    return sandboxEngine.savePage(input);
  },

  async approveArtifact(artifactId: string) {
    const live = await tryHttp(`/api/desk/artifacts/${artifactId}/approve`, { method: 'POST' });
    if (live) return live;
    return sandboxEngine.approveArtifact(artifactId);
  },

  async configureIntegration(
    integrationId: string,
    params: { secretValue?: string; label?: string; enabledCoworkerIds?: string[] }
  ) {
    const live = await tryHttp(`/api/desk/integrations/${integrationId}/configure`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (live) return live;
    return sandboxEngine.configureIntegration(integrationId, params);
  },

  async updateAdminSettings(patch: {
    name?: string;
    retentionDays?: number;
    deploymentMode?: Organization['deploymentMode'];
    blockedTools?: string[];
    ssoConfig?: Organization['ssoConfig'];
  }) {
    const live = await tryHttp('/api/desk/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    if (live) return live;
    return sandboxEngine.updateAdminSettings(patch);
  },

  async exportOrgData() {
    const live = await tryHttp('/api/desk/admin/export');
    if (live) return live;
    return sandboxEngine.exportOrganizationData();
  },

  // Personal Agent (Isolated)
  async getPersonalWorkspace() {
    const live = await tryHttp<{
      workspace: PersonalWorkspace;
      approvals: DeskBootstrapData['approvals'];
      notifications: DeskBootstrapData['notifications'];
    }>('/api/personal/workspace');
    if (live) return live;
    return sandboxEngine.getPersonalWorkspace();
  },

  async updatePersonalPreferences(patch: Partial<PersonalWorkspace>) {
    const live = await tryHttp<{ workspace: PersonalWorkspace }>('/api/personal/preferences', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    if (live) return live;
    return sandboxEngine.updatePersonalPreferences(patch);
  },

  async createPersonalTask(prompt: string) {
    const live = await tryHttp('/api/personal/tasks', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
    if (live) return live;
    return sandboxEngine.createPersonalTask(prompt);
  },

  async controlPersonalTask(taskId: string, action: string, text?: string) {
    const live = await tryHttp(`/api/personal/tasks/${taskId}/control`, {
      method: 'POST',
      body: JSON.stringify({ action, text }),
    });
    if (live) return live;
    return sandboxEngine.controlPersonalTask(taskId, action, text);
  },

  async decidePersonalApproval(approvalId: string, decision: 'APPROVED' | 'REJECTED') {
    const live = await tryHttp(`/api/personal/approvals/${approvalId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
    if (live) return live;
    return sandboxEngine.decidePersonalApproval(approvalId, decision);
  },
};
