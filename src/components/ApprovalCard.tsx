import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import type { ApprovalRequest } from '@shared/types';

interface ApprovalCardProps {
  approval: ApprovalRequest;
  onDecide: (approvalId: string, decision: 'APPROVED' | 'REJECTED', note?: string) => Promise<void>;
}

export function ApprovalCard({ approval, onDecide }: ApprovalCardProps) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const handle = async (decision: 'APPROVED' | 'REJECTED') => {
    setBusy(true);
    try {
      await onDecide(approval.id, decision, note.trim() || undefined);
    } finally {
      setBusy(false);
    }
  };

  const riskBadge =
    approval.riskLevel === 'destructive'
      ? 'border-rose-500/50 bg-rose-500/20 text-rose-200'
      : approval.riskLevel === 'sensitive'
        ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
        : 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200';

  return (
    <div className="rounded-xl border border-amber-400/35 bg-slate-950/90 p-4 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-100">{approval.coworkerName}</span>
          <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono-tech text-[10px] text-slate-300">
            {approval.toolName}
          </span>
        </div>
        <span className={`rounded-full border px-2 py-0.5 font-mono-tech text-[10px] uppercase ${riskBadge}`}>
          {approval.riskLevel} risk · {approval.status}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-200">{approval.summary}</p>

      <div className="mt-3 rounded-lg border border-white/10 bg-slate-900/80 p-2.5">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-mono-tech uppercase tracking-wider text-slate-400">
          <AlertTriangle className="h-3 w-3 text-amber-400" />
          Redacted Action Payload (Secrets Stripped)
        </div>
        <pre className="overflow-x-auto font-mono-tech text-[11px] text-slate-300">
          {JSON.stringify(approval.redactedPayload, null, 2)}
        </pre>
      </div>

      {approval.status === 'PENDING' ? (
        <div className="mt-3 space-y-2.5">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional audit note for decision receipt..."
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => handle('APPROVED')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve Action
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handle('REJECTED')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3.5 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject & Block
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-slate-400">
          Decision: <strong className="text-slate-200">{approval.status}</strong> by {approval.decidedBy}
          {approval.decisionNote ? ` — "${approval.decisionNote}"` : ''}
        </div>
      )}
    </div>
  );
}
