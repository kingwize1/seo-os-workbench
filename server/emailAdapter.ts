import { WAITLIST_CONFIG } from '../shared/constants';
import type { WaitlistEntry } from '../shared/types';

// ==============================================================================
// Email Delivery Adapter for Personal Agent Waitlist Approvals
// Sends applicant setup info + instant one-click approval link to
// WAITLIST_APPROVER_EMAIL (default: kingwizemusic@gmail.com).
// Uses Resend API when RESEND_API_KEY is configured; otherwise stores in
// server outbox (clearly labeled MOCK_OUTBOX — never fakes live SMTP delivery).
// ==============================================================================

export interface OutgoingApprovalEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  approvalUrl: string;
  sentAt: string;
  status: WaitlistEntry['emailDispatchStatus'];
  detail: string;
}

export class EmailAdapter {
  readonly outbox: OutgoingApprovalEmail[] = [];

  getApproverEmail(): string {
    return process.env.WAITLIST_APPROVER_EMAIL || WAITLIST_CONFIG.approverEmail;
  }

  async sendWaitlistApprovalEmail(entry: WaitlistEntry): Promise<{
    status: WaitlistEntry['emailDispatchStatus'];
    detail: string;
    message: OutgoingApprovalEmail;
  }> {
    const to = this.getApproverEmail();
    const subject = `[SEO OS Waitlist #${entry.queuePosition}] Approve Free Personal Agent Access: ${entry.name} (${entry.email})`;

    const text = [
      `New Personal Agent Waitlist Application (#${entry.queuePosition})`,
      `====================================================`,
      `Name: ${entry.name}`,
      `Email: ${entry.email}`,
      `Role: ${entry.roleTitle}`,
      `Website / Profile: ${entry.websiteUrl || 'Not provided'}`,
      `Preferred Agent Tone: ${entry.preferredTone}`,
      `Requested Capabilities: Browser=${entry.wantsBrowser ? 'Yes' : 'No'}, Files=${entry.wantsFiles ? 'Yes' : 'No'}, Optional Terminal=${entry.wantsTerminal ? 'Yes' : 'No'}`,
      ``,
      `Primary Use Case / Setup Notes:`,
      entry.useCase,
      ``,
      `INSTANT APPROVAL LINK (Click to approve immediately):`,
      entry.approvalUrl,
      ``,
      `Direct Unlocked Personal Agent Link (Share with user after approval):`,
      entry.accessUrl,
    ].join('\n');

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;background:#070913;color:#e2e8f0;padding:24px;border-radius:12px;">
        <h2 style="color:#38bdf8;margin-top:0;">New Personal Agent Waitlist Application (#${entry.queuePosition})</h2>
        <p><strong>${entry.name}</strong> (${entry.email}) submitted their Personal Agent setup details and is awaiting approval.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
          <tr><td style="padding:6px 0;color:#94a3b8;">Role</td><td>${entry.roleTitle}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;">Website</td><td>${entry.websiteUrl || 'Not provided'}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;">Preferred Tone</td><td>${entry.preferredTone}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;">Capabilities</td><td>Browser: ${entry.wantsBrowser ? 'Yes' : 'No'} | Files: ${entry.wantsFiles ? 'Yes' : 'No'} | Terminal: ${entry.wantsTerminal ? 'Yes' : 'No'}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;">Use Case</td><td>${entry.useCase}</td></tr>
        </table>
        <p style="margin:24px 0;">
          <a href="${entry.approvalUrl}" style="display:inline-block;background:#10b981;color:#022c22;font-weight:700;padding:12px 22px;border-radius:8px;text-decoration:none;">
            Instantly Approve ${entry.name}
          </a>
        </p>
        <p style="font-size:12px;color:#94a3b8;">Instant Approval URL: ${entry.approvalUrl}</p>
      </div>
    `;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && process.env.NODE_ENV !== 'test') {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'SEO OS Waitlist <onboarding@resend.dev>',
            to: [to],
            subject,
            text,
            html,
          }),
        });
        if (res.ok) {
          const message: OutgoingApprovalEmail = {
            to,
            subject,
            text,
            html,
            approvalUrl: entry.approvalUrl,
            sentAt: new Date().toISOString(),
            status: 'SENT_LIVE',
            detail: `Delivered live approval email via Resend API to ${to}.`,
          };
          this.outbox.unshift(message);
          return { status: 'SENT_LIVE', detail: message.detail, message };
        }
        const errBody = await res.text();
        const message: OutgoingApprovalEmail = {
          to,
          subject,
          text,
          html,
          approvalUrl: entry.approvalUrl,
          sentAt: new Date().toISOString(),
          status: 'FAILED',
          detail: `Resend API error (${res.status}): ${errBody.slice(0, 140)}`,
        };
        this.outbox.unshift(message);
        return { status: 'FAILED', detail: message.detail, message };
      } catch (err) {
        const message: OutgoingApprovalEmail = {
          to,
          subject,
          text,
          html,
          approvalUrl: entry.approvalUrl,
          sentAt: new Date().toISOString(),
          status: 'FAILED',
          detail: err instanceof Error ? err.message : 'Email provider network failure',
        };
        this.outbox.unshift(message);
        return { status: 'FAILED', detail: message.detail, message };
      }
    }

    const message: OutgoingApprovalEmail = {
      to,
      subject,
      text,
      html,
      approvalUrl: entry.approvalUrl,
      sentAt: new Date().toISOString(),
      status: 'MOCK_OUTBOX',
      detail: `Captured in server mock outbox targeting ${to} (configure RESEND_API_KEY for live SMTP/API delivery).`,
    };
    this.outbox.unshift(message);
    return { status: 'MOCK_OUTBOX', detail: message.detail, message };
  }
}
