import { PRICING } from '../shared/constants';
import { generateId, signWebhookPayload, verifyWebhookSignature } from './crypto';

// ==============================================================================
// Payment Provider Abstraction
// Supports:
//   - TestModePaymentProvider (default in dev/test; produces real HMAC-signed webhooks)
//   - StripePaymentProvider   (production Stripe Checkout + webhook signature check)
// Commercial structure:
//   $997 one-time setup fee -> First 2 months included -> $2,400/month recurring
// ==============================================================================

export interface CheckoutInitInput {
  organizationId: string;
  userId: string;
  customerEmail: string;
  organizationName: string;
  returnUrl: string;
}

export interface CheckoutInitResult {
  provider: 'test' | 'stripe';
  providerSessionId: string;
  checkoutUrl: string;
  amountCents: number;
  summary: string;
}

export type NormalizedPaymentEventType =
  | 'checkout.session.completed'
  | 'invoice.payment_failed'
  | 'customer.subscription.deleted'
  | 'invoice.paid';

export interface NormalizedWebhookEvent {
  eventId: string;
  provider: 'test' | 'stripe';
  type: NormalizedPaymentEventType;
  organizationId: string;
  providerSessionId?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  amountCents: number;
  occurredAt: string;
}

export interface PaymentProvider {
  readonly name: 'test' | 'stripe';
  createSetupCheckoutSession(input: CheckoutInitInput): Promise<CheckoutInitResult>;
  verifyAndParseWebhook(rawBody: string, signatureHeader: string | undefined): NormalizedWebhookEvent;
  createSignedTestWebhook?(event: Omit<NormalizedWebhookEvent, 'provider'>): {
    rawBody: string;
    signatureHeader: string;
  };
}

export class TestModePaymentProvider implements PaymentProvider {
  readonly name = 'test' as const;
  private readonly webhookSecret: string;

  constructor(webhookSecret?: string) {
    this.webhookSecret =
      webhookSecret || process.env.PAYMENT_WEBHOOK_SECRET || 'whsec_test_seo_os_workbench_local_secret';
  }

  async createSetupCheckoutSession(input: CheckoutInitInput): Promise<CheckoutInitResult> {
    const providerSessionId = generateId('cs_test');
    return {
      provider: 'test',
      providerSessionId,
      checkoutUrl: `${input.returnUrl}?checkout=return&session_id=${providerSessionId}`,
      amountCents: PRICING.setupFeeCents,
      summary: PRICING.summaryLine,
    };
  }

  verifyAndParseWebhook(rawBody: string, signatureHeader: string | undefined): NormalizedWebhookEvent {
    const ok = verifyWebhookSignature(rawBody, signatureHeader, this.webhookSecret);
    if (!ok) {
      throw new Error('Invalid or expired payment webhook signature');
    }
    const parsed = JSON.parse(rawBody) as Partial<NormalizedWebhookEvent>;
    if (!parsed.eventId || !parsed.type || !parsed.organizationId) {
      throw new Error('Malformed webhook event payload');
    }
    return {
      eventId: parsed.eventId,
      provider: 'test',
      type: parsed.type,
      organizationId: parsed.organizationId,
      providerSessionId: parsed.providerSessionId,
      providerCustomerId: parsed.providerCustomerId,
      providerSubscriptionId: parsed.providerSubscriptionId,
      amountCents: parsed.amountCents ?? PRICING.setupFeeCents,
      occurredAt: parsed.occurredAt ?? new Date().toISOString(),
    };
  }

  createSignedTestWebhook(event: Omit<NormalizedWebhookEvent, 'provider'>): {
    rawBody: string;
    signatureHeader: string;
  } {
    const rawBody = JSON.stringify({ ...event, provider: 'test' });
    const signatureHeader = signWebhookPayload(rawBody, this.webhookSecret);
    return { rawBody, signatureHeader };
  }
}

export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe' as const;
  private readonly apiKey: string;
  private readonly webhookSecret: string;

  constructor(apiKey: string, webhookSecret: string) {
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret;
  }

  async createSetupCheckoutSession(input: CheckoutInitInput): Promise<CheckoutInitResult> {
    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('customer_email', input.customerEmail);
    params.set('success_url', `${input.returnUrl}?checkout=return&session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', `${input.returnUrl}?checkout=cancelled`);
    params.set('metadata[organizationId]', input.organizationId);
    params.set('metadata[userId]', input.userId);
    params.set('subscription_data[trial_period_days]', String(PRICING.includedTrialDays));

    const setupPriceId = process.env.STRIPE_SETUP_PRICE_ID;
    const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;

    if (setupPriceId && monthlyPriceId) {
      params.set('line_items[0][price]', setupPriceId);
      params.set('line_items[0][quantity]', '1');
      params.set('line_items[1][price]', monthlyPriceId);
      params.set('line_items[1][quantity]', '1');
    } else {
      params.set('line_items[0][price_data][currency]', 'usd');
      params.set('line_items[0][price_data][unit_amount]', String(PRICING.setupFeeCents));
      params.set('line_items[0][price_data][product_data][name]', 'SEO OS Business Workspace — One-Time Setup Fee');
      params.set('line_items[0][quantity]', '1');
      params.set('line_items[1][price_data][currency]', 'usd');
      params.set('line_items[1][price_data][unit_amount]', String(PRICING.monthlySubscriptionCents));
      params.set('line_items[1][price_data][recurring][interval]', 'month');
      params.set(
        'line_items[1][price_data][product_data][name]',
        'SEO OS Business Workspace — Ongoing Monthly Subscription (Starts After 2 Included Months)'
      );
      params.set('line_items[1][quantity]', '1');
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`Stripe Checkout session creation failed (${res.status})`);
    }

    const json = (await res.json()) as { id: string; url: string };
    return {
      provider: 'stripe',
      providerSessionId: json.id,
      checkoutUrl: json.url,
      amountCents: PRICING.setupFeeCents,
      summary: PRICING.summaryLine,
    };
  }

  verifyAndParseWebhook(rawBody: string, signatureHeader: string | undefined): NormalizedWebhookEvent {
    const ok = verifyWebhookSignature(rawBody, signatureHeader, this.webhookSecret);
    if (!ok) {
      throw new Error('Invalid Stripe-Signature header');
    }
    const stripeEvent = JSON.parse(rawBody) as {
      id: string;
      type: NormalizedPaymentEventType;
      data?: {
        object?: {
          id?: string;
          customer?: string;
          subscription?: string;
          amount_total?: number;
          amount_paid?: number;
          metadata?: { organizationId?: string };
        };
      };
    };
    const obj = stripeEvent.data?.object ?? {};
    const orgId = obj.metadata?.organizationId;
    if (!orgId) {
      throw new Error('Stripe webhook object missing metadata.organizationId');
    }
    return {
      eventId: stripeEvent.id,
      provider: 'stripe',
      type: stripeEvent.type,
      organizationId: orgId,
      providerSessionId: obj.id,
      providerCustomerId: obj.customer,
      providerSubscriptionId: obj.subscription,
      amountCents: obj.amount_total ?? obj.amount_paid ?? PRICING.setupFeeCents,
      occurredAt: new Date().toISOString(),
    };
  }
}

export function createPaymentProvider(): PaymentProvider {
  const mode = (process.env.PAYMENT_PROVIDER || 'test').toLowerCase();
  if (mode === 'stripe' && process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
    return new StripePaymentProvider(process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET);
  }
  return new TestModePaymentProvider(process.env.PAYMENT_WEBHOOK_SECRET);
}
