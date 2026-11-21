import React, { useState } from 'react';
import { KeyRound, Lock, Plug, ShieldCheck } from 'lucide-react';
import { DeskShell } from '@/components/DeskShell';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';

export function IntegrationsPage() {
  const { desk, refreshDesk, showToast } = useApp();
  const [secretInputs, setSecretInputs] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleSaveSecret = async (integrationId: string) => {
    const val = secretInputs[integrationId]?.trim();
    if (!val) return;
    setBusyId(integrationId);
    try {
      await api.configureIntegration(integrationId, {
        secretValue: val,
        label: 'Encrypted Server-Only Credential (AES-256-GCM)',
      });
      setSecretInputs((prev) => ({ ...prev, [integrationId]: '' }));
      await refreshDesk();
      showToast('Credential encrypted server-side and never returned to the browser.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DeskShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-white">
              <Plug className="h-6 w-6 text-cyan-400" />
              Integrations, MCP Bridges &amp; Provider Status
            </h1>
            <p className="text-xs text-slate-400">
              All external services run behind typed adapters. Raw API keys are encrypted server-side (AES-256-GCM), never returned to the browser, and redacted from logs.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1 font-mono-tech text-[10px] text-emerald-200">
            <Lock className="h-3.5 w-3.5" /> Zero API Keys in Browser Storage
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {desk?.integrations.map((integ) => (
            <div key={integ.id} className="os-panel flex flex-col justify-between rounded-2xl p-5 space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-tech text-[10px] uppercase text-slate-400">{integ.category}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono-tech text-[10px] ${
                      integ.status === 'CONNECTED'
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                        : integ.status === 'MOCK_ACTIVE'
                          ? 'border-amber-400/40 bg-amber-500/15 text-amber-200'
                          : integ.status === 'PLANNED_ROADMAP'
                            ? 'border-slate-600 bg-slate-800 text-slate-400'
                            : 'border-rose-400/40 bg-rose-500/15 text-rose-200'
                    }`}
                  >
                    {integ.status} · {integ.mode}
                  </span>
                </div>
                <h2 className="mt-2 font-display text-lg font-bold text-white">{integ.name}</h2>
                <p className="mt-1 text-xs text-slate-400">{integ.credentialLabel}</p>

                {integ.allowedScopes.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {integ.allowedScopes.map((sc) => (
                      <span key={sc} className="rounded bg-white/5 px-2 py-0.5 font-mono-tech text-[10px] text-cyan-200">
                        {sc}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {integ.status !== 'PLANNED_ROADMAP' ? (
                <div className="border-t border-white/10 pt-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="password"
                        value={secretInputs[integ.id] || ''}
                        onChange={(e) => setSecretInputs((prev) => ({ ...prev, [integ.id]: e.target.value }))}
                        placeholder="Paste token to store encrypted server-side..."
                        className="w-full rounded-lg border border-white/15 bg-slate-950 py-2 pl-8 pr-3 text-xs text-white"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busyId === integ.id || !secretInputs[integ.id]?.trim()}
                      onClick={() => handleSaveSecret(integ.id)}
                      className="rounded-lg bg-cyan-400 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-40"
                    >
                      Encrypt &amp; Save
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    <ShieldCheck className="mr-1 inline h-3 w-3 text-emerald-400" />
                    Enabled for {integ.enabledCoworkerIds.length} specialist(s)/coworker(s).
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-3 text-xs text-slate-400">
                  Planned channel integration (Voice &amp; Slack). Interface reserved; not active in current build.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </DeskShell>
  );
}
