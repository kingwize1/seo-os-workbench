import React, { useState } from 'react';
import { Calendar, CheckCircle2, X } from 'lucide-react';
import { PRICING } from '@shared/constants';

interface WalkthroughModalProps {
  open: boolean;
  onClose: () => void;
}

export function WalkthroughModal({ open, onClose }: WalkthroughModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Book a Business Walkthrough"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
    >
      <div className="os-glass relative w-full max-w-lg rounded-2xl p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {submitted ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-400" />
            <h3 className="mt-3 font-display text-xl font-bold text-white">Walkthrough Request Logged (Demo)</h3>
            <p className="mt-2 text-sm text-slate-300">
              In this preview environment, no external email or calendar invite was sent. When deployed with live CRM/Calendar adapters, your team receives a confirmation for <strong>{company || email}</strong>.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="mt-5 rounded-lg bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Return to Page
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-cyan-400">
              <Calendar className="h-5 w-5" />
              <span className="text-xs font-mono-tech uppercase tracking-wider">Enterprise & Agency Demo</span>
            </div>
            <h3 className="mt-2 font-display text-2xl font-bold text-white">Book a Business Walkthrough</h3>
            <p className="mt-1 text-sm text-slate-400">
              Review the SEO OS desk, client brain provenance, AI coworkers, approval policies, and commercial structure ({PRICING.shortHeadline}).
            </p>
            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Full Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full rounded-lg border border-white/15 bg-slate-900/90 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Work Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full rounded-lg border border-white/15 bg-slate-900/90 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Company / Agency</label>
                <input
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Northstar Digital"
                  className="w-full rounded-lg border border-white/15 bg-slate-900/90 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Primary Workflows & Site Count</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., 12 client domains, technical audits + GEO strategy, self-hosting requirements..."
                  className="w-full rounded-lg border border-white/15 bg-slate-900/90 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-cyan-400 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Request Business Walkthrough
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
