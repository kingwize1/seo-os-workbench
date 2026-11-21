import React, { useState } from 'react';
import {
  CreditCard,
  Download,
  FileSearch,
  Server,
  Shield,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { PRICING, TOOL_REGISTRY } from '@shared/constants';
import type { Organization } from '@shared/types';
import { DeskShell } from '@/components/DeskShell';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';

export function AdminPage() {
  const { desk, refreshDesk, refreshSession, showToast } = useApp();
  const [retentionDays, setRetentionDays] = useState(desk?.organization.retentionDays ?? 90);
  const [deploymentMode, setDeploymentMode] = useState<Organization['deploymentMode']>(
    desk?.organization.deploymentMode ?? 'CLOUD'
  );
  const [auditFilter, setAuditFilter] = useState('');
  const [busy, setBusy] = useState(false);

  if (!desk) {
    return <DeskShell><div /></DeskShell>;
  }

  const handleToggleBlockedTool = async (toolId: string) => {
    const next = desk.orgBlockedTools.includes(toolId)
      ? desk.orgBlockedTools.filter((t) => t !== toolId)
      : [...desk.orgBlockedTools, toolId];
    await api.updateAdminSettings({ blockedTools: next });
    await refreshDesk();
    showToast(`Updated organization tool blocklist (${next.length} blocked).`);
  };

  const handleSavePolicies = async () => {
    setBusy(true);
    try {
      await api.updateAdminSettings({ retentionDays, deploymentMode });
      await refreshDesk();
      showToast('Organization retention & deployment settings updated.');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    const bundle = await api.exportOrgData();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${desk.organization.slug}-tenant-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported complete tenant data bundle (credentials excluded).');
  };

  const filteredAudit = desk.auditEvents.filter(
    (ev) =>
      !auditFilter.trim() ||
      ev.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
      ev.actorName.toLowerCase().includes(auditFilter.toLowerCase()) ||
      (ev.toolName || '').toLowerCase().includes(auditFilter.toLowerCase())
  );

  return (
    <DeskShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-white">
              <Shield className="h-6 w-6 text-cyan-400" />
              Enterprise Governance, Billing &amp; Organization Admin
            </h1>
            <p className="text-xs text-slate-400">
              Tenant: <strong className="text-slate-200">{desk.organization.name}</strong> · Role:{' '}
              <strong className="text-cyan-300">{desk.membership.role}</strong> · Safe defaults active
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
          >
            <Download className="h-3.5 w-3.5" /> Export Tenant Data (.json)
          </button>
        </div>

        {/* Billing, Usage & Members Row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Billing & Entitlement */}
          <div className="os-panel rounded-2xl p-5 space-y-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-white">
              <CreditCard className="h-4 w-4 text-cyan-400" /> Subscription &amp; Billing Status
            </h2>
            <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3 text-xs">
              <div className="font-mono-tech text-[10px] uppercase text-emerald-300">
                Status: {desk.entitlement.status}
              </div>
              <div className="mt-1 font-semibold text-white">{PRICING.shortHeadline}</div>
              {desk.entitlement.includedPeriodEndsAt && (
                <div className="mt-1 text-emerald-200/80">
                  2-month included period ends:{' '}
                  {new Date(desk.entitlement.includedPeriodEndsAt).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="space-y-1.5 text-xs">
              {desk.invoices.slice(0, 3).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-2">
                  <span className="truncate pr-2 text-slate-300">{inv.description.slice(0, 34)}...</span>
                  <span className="shrink-0 font-mono-tech text-[10px] text-cyan-300">
                    ${(inv.amountCents / 100).toLocaleString()} · {inv.status}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={async () => {
                await api.triggerTestWebhook({ eventType: 'customer.subscription.deleted' });
                await refreshSession();
                showToast('Subscription cancelled via verified test webhook.');
              }}
              className="inline-flex items-center gap-1 text-xs text-rose-300 hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" /> Simulate Cancel / Downgrade
            </button>
          </div>

          {/* Usage & Cost Metering */}
          <div className="os-panel rounded-2xl p-5 space-y-3">
            <h2 className="font-display text-sm font-bold text-white">Usage &amp; Cost Metering</h2>
            <div className="space-y-2">
              {desk.usageRecords.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 p-3 text-xs">
                  <div>
                    <div className="font-mono-tech text-[10px] text-slate-400">{u.metric}</div>
                    <div className="font-semibold text-white">{u.quantity.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-tech text-xs text-emerald-300">${u.estimatedCostUsd.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500">{u.periodLabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Members & RBAC */}
          <div className="os-panel rounded-2xl p-5 space-y-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-white">
              <Users className="h-4 w-4 text-violet-400" /> Members &amp; Roles (RBAC)
            </h2>
            <div className="space-y-2">
              {desk.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 p-3 text-xs">
                  <div>
                    <div className="font-semibold text-white">{m.userName || m.userId}</div>
                    <div className="text-[11px] text-slate-400">{m.userEmail}</div>
                  </div>
                  <span className="rounded-full border border-cyan-400/35 bg-cyan-500/15 px-2.5 py-0.5 font-mono-tech text-[10px] text-cyan-200">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Policies, Tool Blocklist, Retention & Enterprise Readiness */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="os-panel rounded-2xl p-5 space-y-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-white">
              <ShieldCheck className="h-4 w-4 text-amber-400" /> Organization Tool Blocklist &amp; Approval Guardrails
            </h2>
            <p className="text-xs text-slate-400">
              Checked tools are completely blocked across every coworker in this organization regardless of coworker allowlists.
            </p>
            <div className="grid max-h-52 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/70 p-3 sm:grid-cols-2">
              {TOOL_REGISTRY.map((t) => {
                const blocked = desk.orgBlockedTools.includes(t.id);
                return (
                  <label key={t.id} className="flex items-center gap-2 text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={blocked}
                      onChange={() => handleToggleBlockedTool(t.id)}
                      className="accent-rose-500"
                    />
                    <span className={blocked ? 'text-rose-300 line-through' : ''}>{t.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="os-panel rounded-2xl p-5 space-y-4">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-white">
              <Server className="h-4 w-4 text-cyan-400" /> Data Retention, SSO/SCIM &amp; Deployment Mode
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-300">Audit &amp; Artifact Retention (Days)</label>
                <input
                  type="number"
                  min={7}
                  max={3650}
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300">Target Deployment Topology</label>
                <select
                  value={deploymentMode}
                  onChange={(e) => setDeploymentMode(e.target.value as Organization['deploymentMode'])}
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
                >
                  <option value="CLOUD">Managed Cloud</option>
                  <option value="PRIVATE_CLOUD">Private Cloud (Template Ready)</option>
                  <option value="KUBERNETES">Kubernetes Cluster (Template Ready)</option>
                  <option value="SELF_HOSTED">Customer Self-Hosted (Docker Ready)</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 text-xs text-amber-100">
              <div className="font-mono-tech text-[10px] uppercase text-amber-300">
                SSO / SCIM &amp; Private Deployment Status: INTERFACE_READY_UNCONFIGURED
              </div>
              <p className="mt-1">
                SAML/OIDC SSO, SCIM provisioning, and Kubernetes HA manifests are prepared as clean interfaces in <code className="text-white">deploy/k8s/</code> but are not active until configured and verified in your environment. No third-party compliance certification is claimed.
              </p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={handleSavePolicies}
              className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
            >
              Save Governance Preferences
            </button>
          </div>
        </div>

        {/* Full Searchable Audit Trail */}
        <div className="os-glass rounded-2xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
              <FileSearch className="h-4 w-4 text-cyan-400" />
              Immutable Audit Trail &amp; Redacted Action Receipts ({filteredAudit.length})
            </h2>
            <input
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
              placeholder="Filter by actor, action, or tool..."
              className="rounded-lg border border-white/15 bg-slate-950 px-3 py-1.5 text-xs text-white"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-white/10 font-mono-tech text-[10px] uppercase text-slate-400">
                <tr>
                  <th className="py-2 pr-3">Timestamp</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2 pr-3">Action / Tool</th>
                  <th className="py-2 pr-3">Outcome</th>
                  <th className="py-2">Redacted Input / Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAudit.slice(0, 30).map((ev) => (
                  <tr key={ev.id}>
                    <td className="py-2.5 pr-3 font-mono-tech text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(ev.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-white whitespace-nowrap">
                      {ev.actorName}
                      <span className="ml-1.5 rounded bg-white/5 px-1 py-0.5 font-mono-tech text-[9px] text-slate-400">
                        {ev.actorType}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono-tech text-[11px] text-cyan-200">
                      {ev.action}
                      {ev.toolName ? ` (${ev.toolName})` : ''}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono-tech text-[9px] ${
                          ev.outcome === 'SUCCESS'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : ev.outcome === 'AWAITING_APPROVAL'
                              ? 'bg-amber-500/15 text-amber-200'
                              : 'bg-rose-500/20 text-rose-200'
                        }`}
                      >
                        {ev.outcome}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono-tech text-[10px] text-slate-400 max-w-xs truncate">
                      {JSON.stringify(ev.redactedInput)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DeskShell>
  );
}
