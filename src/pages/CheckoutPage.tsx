import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, CreditCard, Lock, ShieldCheck, Webhook } from 'lucide-react';
import { PRICING } from '@shared/constants';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';

export function CheckoutPage() {
  const { session, refreshSession, showToast } = useApp();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('Alex Morgan');
  const [email, setEmail] = useState('alex@northstardigital.example');
  const [password, setPassword] = useState('SecurePass123!');
  const [orgName, setOrgName] = useState('Northstar Digital');
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [checkoutSession, setCheckoutSession] = useState<{
    provider: 'test' | 'stripe';
    providerSessionId: string;
    checkoutUrl: string;
    summary: string;
  } | null>(null);
  const [browserReturned, setBrowserReturned] = useState(false);
  const [lastWebhookEventId, setLastWebhookEventId] = useState<string | null>(null);
  const [webhookLog, setWebhookLog] = useState<string[]>([]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setBusy(true);
    try {
      if (authMode === 'signup') {
        await api.signup({ email, name, password, organizationName: orgName });
      } else {
        await api.signin({ email, password });
      }
      await refreshSession();
      showToast('Account authenticated. Proceed to the $997 setup checkout below.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCheckout = async () => {
    setBusy(true);
    try {
      const res = await api.createCheckoutSession(window.location.origin + '/checkout');
      setCheckoutSession({
        provider: res.provider,
        providerSessionId: res.providerSessionId,
        checkoutUrl: res.checkoutUrl,
        summary: res.summary,
      });
      setBrowserReturned(true);
      setWebhookLog((prev) => [
        `[${new Date().toLocaleTimeString()}] Created ${res.provider.toUpperCase()} checkout session ${res.providerSessionId} ($997.00 setup). Entitlement stays INACTIVE until verified server webhook arrives.`,
        ...prev,
      ]);
      if (res.provider === 'stripe' && res.checkoutUrl) {
        showToast('Live Stripe Checkout session created! Click "Open Live Stripe Checkout" below to complete payment.');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Checkout creation failed');
    } finally {
      setBusy(false);
    }
  };

  const handleWebhook = async (
    eventType: 'checkout.session.completed' | 'invoice.payment_failed' | 'customer.subscription.deleted',
    replaySameId = false
  ) => {
    setBusy(true);
    try {
      const res = await api.triggerTestWebhook({
        eventType,
        providerSessionId: checkoutSession?.providerSessionId,
        eventId: replaySameId && lastWebhookEventId ? lastWebhookEventId : undefined,
      });
      setLastWebhookEventId(res.eventId);
      await refreshSession();
      setWebhookLog((prev) => [
        `[${new Date().toLocaleTimeString()}] Signed webhook ${eventType} (${res.eventId}) -> ${
          res.duplicate ? 'DUPLICATE IGNORED (Idempotent)' : `VERIFIED · Entitlement: ${res.entitlement?.status}`
        }`,
        ...prev,
      ]);
      if (res.entitlement?.status === 'TRIAL_INCLUDED' && !res.duplicate) {
        showToast('Verified server webhook! Business Workspace entitlement provisioned (2 months included).');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Webhook failed');
    } finally {
      setBusy(false);
    }
  };

  const entStatus = session?.entitlement?.status ?? 'INACTIVE';
  const isEntitled = entStatus === 'TRIAL_INCLUDED' || entStatus === 'ACTIVE';

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/90 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="font-display text-sm font-bold text-white">
            ← SEO OS <span className="text-cyan-400">AI Workbench</span>
          </Link>
          <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 font-mono-tech text-[11px] text-amber-200">
            PAYMENT TEST MODE · STRIPE ADAPTER READY
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-12">
        {/* Left: Account & Checkout Workflow */}
        <div className="space-y-6 lg:col-span-7">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Business Workspace Setup Checkout</h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Complete account setup, pay the one-time <strong>$997 setup fee</strong>, and verify the signed payment webhook to provision your 2-month included period and SEO OS Desk.
            </p>
          </div>

          {/* Step 1: Account Creation / Association */}
          <div className="os-panel rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-white">1. Account &amp; Organization Association</h2>
              {session?.authenticated && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Signed in as {session.user?.email}
                </span>
              )}
            </div>

            {!session?.authenticated ? (
              <form onSubmit={handleAuth} className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      authMode === 'signup' ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-300'
                    }`}
                  >
                    Create Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      authMode === 'signin' ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-300'
                    }`}
                  >
                    Sign In Existing
                  </button>
                </div>

                {authMode === 'signup' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-300">Full Name</label>
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-300">Organization Name</label>
                      <input
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">Work Email</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">Password (min 8 chars)</label>
                    <input
                      required
                      type="password"
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>

                {authError && <p className="text-xs text-rose-400">{authError}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                >
                  {authMode === 'signup' ? 'Create Account & Continue to Setup Fee' : 'Sign In & Continue'}
                </button>
              </form>
            ) : (
              <div className="mt-3 text-xs text-slate-300">
                Organization: <strong className="text-white">{session.organization?.name}</strong> · Role:{' '}
                <strong className="text-cyan-300">{session.membership?.role}</strong> · Entitlement Status:{' '}
                <strong className={isEntitled ? 'text-emerald-300' : 'text-amber-300'}>{entStatus}</strong>
              </div>
            )}
          </div>

          {/* Step 2: Setup-Fee Checkout & Signed Webhook Verification */}
          <div className="os-panel rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
                <CreditCard className="h-4 w-4 text-cyan-400" />
                2. $997 Setup Checkout &amp; Server-Verified Webhook
              </h2>
              <span className="font-mono-tech text-[10px] text-slate-400">HMAC-SHA256 + Idempotency</span>
            </div>

            <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
              <Lock className="mr-1.5 inline h-3.5 w-3.5" />
              <strong>Strict Trust Boundary:</strong> Returning to the browser from checkout <em>never</em> grants paid access on its own. Business Workspace unlocks strictly after a signed server-side webhook event is verified and deduplicated.
            </div>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                disabled={!session?.authenticated || busy}
                onClick={handleCreateCheckout}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-40"
              >
                Create $997 Setup Checkout Session
              </button>

              {browserReturned && checkoutSession?.provider === 'stripe' && (
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
                    <CreditCard className="h-4 w-4" />
                    Live Stripe Checkout Session Ready ({checkoutSession.providerSessionId})
                  </div>
                  <p className="text-xs text-slate-300">
                    Complete the $997 one-time setup payment on Stripe&apos;s hosted checkout page. Access unlocks automatically once Stripe delivers the signed <code className="text-white">checkout.session.completed</code> webhook to <code className="text-cyan-300">/api/webhooks/payment</code>.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={checkoutSession.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300"
                    >
                      Open Live Stripe Checkout ($997) <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        const snap = await refreshSession();
                        showToast(`Current entitlement status: ${snap.entitlement?.status ?? 'INACTIVE'}`);
                      }}
                      className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      Refresh Entitlement Status
                    </button>
                  </div>
                </div>
              )}

              {browserReturned && checkoutSession?.provider === 'test' && (
                <div className="rounded-xl border border-white/15 bg-slate-950/90 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Webhook className="h-4 w-4 text-cyan-400" />
                    Test-Mode Signed Webhook Simulator (Session: {checkoutSession?.providerSessionId})
                  </div>
                  <p className="text-xs text-slate-400">
                    Notice that even after browser return, Business Entitlement remains <code className="text-amber-300">{entStatus}</code> until the signed webhook below is processed:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleWebhook('checkout.session.completed')}
                      className="rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                    >
                      Dispatch Signed checkout.session.completed ($997 Paid)
                    </button>
                    {lastWebhookEventId && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleWebhook('checkout.session.completed', true)}
                        className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
                      >
                        Replay Same Webhook ID (Test Idempotency)
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleWebhook('invoice.payment_failed')}
                      className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/25"
                    >
                      Simulate Failed Payment
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleWebhook('customer.subscription.deleted')}
                      className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
                    >
                      Simulate Cancellation
                    </button>
                  </div>
                </div>
              )}

              {webhookLog.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-black/60 p-3 font-mono-tech text-[11px] text-slate-300 space-y-1">
                  {webhookLog.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}

              {isEntitled && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/45 bg-emerald-500/15 p-4">
                  <div className="text-xs text-emerald-100">
                    <div className="font-bold text-emerald-200">Entitlement Active: {entStatus}</div>
                    <div>
                      2-month included period ends:{' '}
                      {session?.entitlement?.includedPeriodEndsAt
                        ? new Date(session.entitlement.includedPeriodEndsAt).toLocaleDateString()
                        : '60 days'}
                      {' · '}Next recurring charge: $2,400/month
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/onboarding')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300"
                  >
                    Continue to Onboarding <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Unmistakable Order Summary */}
        <aside className="lg:col-span-5">
          <div className="os-glass sticky top-20 rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold text-white">Order &amp; Billing Schedule</h2>
            <p className="mt-1 text-xs text-slate-400">SEO OS AI Workbench — Business Workspace</p>

            <div className="mt-5 space-y-3 border-y border-white/10 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">One-time Setup Fee (Due Today)</span>
                <span className="font-display text-xl font-bold text-white">$997.00</span>
              </div>
              <div className="flex items-center justify-between text-emerald-300">
                <span>First 2 Months After Setup</span>
                <span className="font-mono-tech text-xs font-semibold">INCLUDED ($0/mo)</span>
              </div>
              <div className="flex items-center justify-between text-cyan-200">
                <span>Ongoing Monthly Subscription (Starts Month 3)</span>
                <span className="font-display font-bold">$2,400.00 / mo</span>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                <span>{PRICING.summaryLine}. Cancel prior to Month 3 to avoid ongoing charges.</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  Development &amp; GitHub Pages previews run in Test Mode. No real card is charged unless live Stripe keys are configured on the server.
                </span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
