/**
 * Server-side transactional email service using Resend.
 * ALL SECRETS STAY ON THE SERVER. NEVER IMPORT OR EXPOSE IN src/.
 */

interface BaseEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

const BRAND_NAME = 'JamBoost';
const BRAND_COLOR = '#82C321';
const ADMIN_ORDERS_EMAIL = 'orders@sanelowmusiclabel.co.za';

export async function sendResendEmail({
  to,
  subject,
  html,
  text,
}: BaseEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    console.warn(
      `[Resend Email] RESEND_API_KEY is not configured. Email to ${JSON.stringify(to)} skipped. Subject: "${subject}"`
    );
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  const fromEmail = (process.env.RESEND_FROM_EMAIL || `JamBoost <${ADMIN_ORDERS_EMAIL}>`).trim();

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Resend Email Error] HTTP ${res.status}: ${errText}`);
      // Fallback for Resend test accounts where domain is not yet verified
      if (res.status === 403 && !fromEmail.includes('onboarding@resend.dev') && errText.includes('domain')) {
        console.warn('[Resend Email] Custom domain not verified on Resend; retrying with onboarding@resend.dev...');
        const retryRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'JamBoost <onboarding@resend.dev>',
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text,
          }),
        });
        if (retryRes.ok) {
          const retryData = (await retryRes.json()) as { id: string };
          console.log(`[Resend Email] Sent fallback email (${retryData.id}) to ${JSON.stringify(to)}`);
          return { success: true, id: retryData.id };
        }
      }
      return { success: false, error: errText };
    }

    const data = (await res.json()) as { id: string };
    console.log(`[Resend Email] Sent email (${data.id}) to ${JSON.stringify(to)} - Subject: "${subject}"`);
    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('[Resend Email Exception]:', err?.message || err);
    return { success: false, error: err?.message || 'Network exception' };
  }
}

function getBaseTemplate({
  headline,
  preheader,
  contentHtml,
  ctaText,
  ctaUrl,
}: {
  headline: string;
  preheader: string;
  contentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
}): string {
  const appUrl = (process.env.APP_URL || 'https://jamboost.sanelowmusiclabel.co.za').replace(/\/$/, '');
  const buttonHref = ctaUrl?.startsWith('http') ? ctaUrl : `${appUrl}${ctaUrl || '/dashboard'}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #121212; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E5E7EB; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; padding: 24px 16px; box-sizing: border-box; }
    .card { background-color: #1A1A1A; border: 1px solid #282828; border-radius: 16px; overflow: hidden; padding: 32px 28px; }
    .header-bar { height: 4px; background: #82C321; margin: -32px -28px 28px -28px; }
    .brand { font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; margin-bottom: 24px; }
    .brand span { color: #82C321; }
    h1 { font-size: 20px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px 0; line-height: 1.3; }
    p { font-size: 14px; line-height: 1.6; color: #9CA3AF; margin: 0 0 16px 0; }
    .highlight-box { background-color: #141414; border: 1px solid #282828; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .data-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #222222; font-size: 13px; }
    .data-row:last-child { border-bottom: none; }
    .label { color: #6B7280; font-weight: 500; }
    .value { color: #FFFFFF; font-weight: 600; text-align: right; }
    .cta-button { display: inline-block; background-color: #82C321; color: #000000 !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; margin: 20px 0 12px 0; }
    .footer { text-align: center; font-size: 12px; color: #6B7280; margin-top: 32px; line-height: 1.6; }
    .footer a { color: #9CA3AF; text-decoration: underline; }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">${preheader}</div>
  <div class="wrapper">
    <div class="card">
      <div class="header-bar"></div>
      <div class="brand">Jam<span>Boost</span></div>
      <h1>${headline}</h1>
      ${contentHtml}
      ${ctaText && buttonHref ? `<div style="text-align: center;"><a href="${buttonHref}" class="cta-button">${ctaText}</a></div>` : ''}
    </div>
    <div class="footer">
      <p>JamBoost by Sanelow Music Label (Pty) Ltd &bull; South Africa</p>
      <p>We pitch your release to playlist curators. We do not sell streams, and results depend on curator decisions.</p>
      <p>
        <a href="${appUrl}/terms">Terms of Service</a> &bull;
        <a href="${appUrl}/privacy">Privacy Policy</a> &bull;
        <a href="${appUrl}/refunds">Refund Policy</a> &bull;
        <a href="${appUrl}/contact">Contact</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// 1. Email to Artist when payment is received (Pending review)
export async function sendArtistPaymentReceivedEmail({
  artistEmail,
  artistName,
  submission,
}: {
  artistEmail: string;
  artistName: string;
  submission: {
    id: string;
    title: string;
    artist: string;
    plan: string;
    amountCents: number;
    currency: string;
  };
}) {
  const formattedAmount = `${submission.currency.toUpperCase()} ${(submission.amountCents / 100).toFixed(2)}`;
  const headline = `Payment Received - Your Pitch is in Review`;
  const preheader = `We received your payment for ${submission.title}. Our curators are reviewing your release.`;

  const contentHtml = `
    <p>Hi ${artistName || submission.artist},</p>
    <p>Thank you for submitting <strong>"${submission.title}"</strong> to JamBoost! Your payment has been received and verified.</p>
    
    <div class="highlight-box">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Release:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600; text-align: right;">${submission.title}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Artist:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600; text-align: right;">${submission.artist}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Campaign Plan:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600; text-align: right;">${submission.plan}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Amount Paid:</td>
          <td style="padding: 6px 0; color: #82C321; font-weight: 700; text-align: right;">${formattedAmount}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Status:</td>
          <td style="padding: 6px 0; color: #F59E0B; font-weight: 600; text-align: right;">Pending Review</td>
        </tr>
      </table>
    </div>

    <p><strong>What happens next?</strong></p>
    <p>Our curation team evaluates your track for broadcast audio quality and genre fit. Once approved, we will begin pitching your release directly to independent playlist curators.</p>
    <p>You can track every update in real time from your JamBoost artist dashboard.</p>
  `;

  const text = `Hi ${artistName || submission.artist},

Thank you for submitting "${submission.title}" to JamBoost. Your payment of ${formattedAmount} for the ${submission.plan} plan has been received.

Your submission is now "Pending Review". Our curation team evaluates your track for broadcast audio quality and genre fit before pitching to playlist curators.

Track your status on your dashboard: https://jamboost.sanelowmusiclabel.co.za/dashboard

JamBoost by Sanelow Music Label
We pitch your release to playlist curators. We do not sell streams.`;

  return sendResendEmail({
    to: artistEmail,
    subject: `Payment Received: Your "${submission.title}" Pitch is in Review`,
    html: getBaseTemplate({
      headline,
      preheader,
      contentHtml,
      ctaText: 'View Campaign Dashboard',
      ctaUrl: '/dashboard',
    }),
    text,
  });
}

// 2. Email to orders@sanelowmusiclabel.co.za when a new paid submission arrives
export async function sendAdminNewPaidSubmissionAlert({
  submission,
  userEmail,
  displayName,
}: {
  submission: {
    id: string;
    title: string;
    artist: string;
    plan: string;
    amountCents: number;
    currency: string;
    spotify_url: string;
    genre: string;
    target_territory: string;
    item_type: string;
  };
  userEmail: string;
  displayName?: string;
}) {
  const formattedAmount = `${submission.currency.toUpperCase()} ${(submission.amountCents / 100).toFixed(2)}`;
  const headline = `New Paid Pitch: ${submission.artist} - "${submission.title}"`;
  const preheader = `A new paid ${submission.plan} submission was received from ${userEmail}.`;

  const contentHtml = `
    <p>A new paid submission has been confirmed and is awaiting review in the admin console:</p>
    
    <div class="highlight-box">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Release:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600; text-align: right;">${submission.title} (${submission.item_type || 'Track'})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Artist:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600; text-align: right;">${submission.artist}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">User / Email:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600; text-align: right;">${displayName ? `${displayName} (${userEmail})` : userEmail}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Plan:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600; text-align: right;">${submission.plan}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Amount:</td>
          <td style="padding: 6px 0; color: #82C321; font-weight: 700; text-align: right;">${formattedAmount}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Genre:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600; text-align: right;">${submission.genre || 'General'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Territory:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600; text-align: right;">${submission.target_territory || 'Global'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Spotify URL:</td>
          <td style="padding: 6px 0; color: #82C321; font-weight: 600; text-align: right;"><a href="${submission.spotify_url}" style="color: #82C321;" target="_blank">Open Link</a></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Submission ID:</td>
          <td style="padding: 6px 0; color: #9CA3AF; font-mono; font-size: 11px; text-align: right;">${submission.id}</td>
        </tr>
      </table>
    </div>

    <p>Please log in to the admin panel to review and approve/reject this campaign.</p>
  `;

  const text = `New Paid Submission:
Artist: ${submission.artist}
Title: ${submission.title} (${submission.item_type || 'Track'})
Plan: ${submission.plan}
Amount: ${formattedAmount}
User Email: ${userEmail}
Spotify: ${submission.spotify_url}
Submission ID: ${submission.id}

Admin review link: https://jamboost.sanelowmusiclabel.co.za/admin`;

  return sendResendEmail({
    to: ADMIN_ORDERS_EMAIL,
    subject: `[New Paid Submission] ${submission.artist} - "${submission.title}" (${submission.plan})`,
    html: getBaseTemplate({
      headline,
      preheader,
      contentHtml,
      ctaText: 'Open Admin Console',
      ctaUrl: '/admin',
    }),
    text,
  });
}

// 3. Email to Artist when submission is Approved
export async function sendArtistSubmissionApprovedEmail({
  artistEmail,
  artistName,
  submission,
}: {
  artistEmail: string;
  artistName: string;
  submission: {
    id: string;
    title: string;
    artist: string;
    plan: string;
  };
}) {
  const headline = `Your Submission Has Been Approved!`;
  const preheader = `Great news! "${submission.title}" has passed review and is approved for curator pitching.`;

  const contentHtml = `
    <p>Hi ${artistName || submission.artist},</p>
    <p>Good news! Your submission for <strong>"${submission.title}"</strong> has been approved by our curation team.</p>
    
    <div class="highlight-box">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Release:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600; text-align: right;">${submission.title}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Campaign:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600; text-align: right;">${submission.plan} Plan</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Current Status:</td>
          <td style="padding: 6px 0; color: #3B82F6; font-weight: 700; text-align: right;">Approved</td>
        </tr>
      </table>
    </div>

    <p><strong>What is happening now?</strong></p>
    <p>Our team is now actively pitching your release to active playlist curators matching your genre. When curators accept your release and add it to their lists, your status will transition to <strong>Live</strong>.</p>
    <p>You can follow the progress of curator adds directly on your JamBoost dashboard.</p>
  `;

  const text = `Hi ${artistName || submission.artist},

Good news! Your submission for "${submission.title}" has been approved by our curation team.

Status: Approved
Plan: ${submission.plan}

We are actively pitching your release to relevant playlist curators. Check your dashboard for live updates:
https://jamboost.sanelowmusiclabel.co.za/dashboard

JamBoost by Sanelow Music Label`;

  return sendResendEmail({
    to: artistEmail,
    subject: `Approved: Your "${submission.title}" Pitch is in Motion`,
    html: getBaseTemplate({
      headline,
      preheader,
      contentHtml,
      ctaText: 'Check Campaign Progress',
      ctaUrl: '/dashboard',
    }),
    text,
  });
}

// 4. Email to Artist when submission is Rejected (with mandatory reason)
export async function sendArtistSubmissionRejectedEmail({
  artistEmail,
  artistName,
  submission,
  reason,
}: {
  artistEmail: string;
  artistName: string;
  submission: {
    id: string;
    title: string;
    artist: string;
    plan: string;
  };
  reason: string;
}) {
  const headline = `Update on Your Submission: "${submission.title}"`;
  const preheader = `Review update for "${submission.title}". Curator review feedback enclosed.`;

  const contentHtml = `
    <p>Hi ${artistName || submission.artist},</p>
    <p>Our curation team has reviewed your submission <strong>"${submission.title}"</strong>. Unfortunately, we are unable to accept this campaign for curator pitching at this time.</p>
    
    <div class="highlight-box" style="border-left: 4px solid #EF4444;">
      <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #EF4444; font-weight: 700; margin-bottom: 8px;">
        Curator Review Reason:
      </p>
      <p style="color: #FFFFFF; font-size: 14px; margin: 0; white-space: pre-wrap;">${reason || 'The submission does not meet current playlist curator quality or genre placement guidelines.'}</p>
    </div>

    <p>We pride ourselves on transparent, honest curation. You can read our refund policy at <a href="https://jamboost.sanelowmusiclabel.co.za/refunds" style="color: #82C321;">jamboost.sanelowmusiclabel.co.za/refunds</a>, or contact our support team at <a href="mailto:${ADMIN_ORDERS_EMAIL}" style="color: #82C321;">${ADMIN_ORDERS_EMAIL}</a> with your submission ID.</p>
  `;

  const text = `Hi ${artistName || submission.artist},

Our curation team has reviewed your submission for "${submission.title}". Unfortunately, we are unable to accept this campaign for curator pitching at this time.

Curator Review Reason:
${reason}

For questions or refund eligibility, please review our refund policy at https://jamboost.sanelowmusiclabel.co.za/refunds or contact us at ${ADMIN_ORDERS_EMAIL}.

JamBoost by Sanelow Music Label`;

  return sendResendEmail({
    to: artistEmail,
    subject: `Update on Your JamBoost Submission: "${submission.title}"`,
    html: getBaseTemplate({
      headline,
      preheader,
      contentHtml,
      ctaText: 'View Dashboard & Notes',
      ctaUrl: '/dashboard',
    }),
    text,
  });
}

// 5. Email to Artist when submission is Completed
export async function sendArtistSubmissionCompletedEmail({
  artistEmail,
  artistName,
  submission,
  metrics,
}: {
  artistEmail: string;
  artistName: string;
  submission: {
    id: string;
    title: string;
    artist: string;
    plan: string;
  };
  metrics?: {
    delivered_streams?: number;
    saves_count?: number;
    playlists_added?: number;
    notes?: string;
  };
}) {
  const headline = `Campaign Complete: "${submission.title}"`;
  const preheader = `Your JamBoost campaign for "${submission.title}" has concluded. View your results report.`;

  const contentHtml = `
    <p>Hi ${artistName || submission.artist},</p>
    <p>Your promotion campaign for <strong>"${submission.title}"</strong> has successfully concluded!</p>
    
    <div class="highlight-box">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Release:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600; text-align: right;">${submission.title}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Plan Fulfilled:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-weight: 600; text-align: right;">${submission.plan}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Playlists Added:</td>
          <td style="padding: 6px 0; color: #82C321; font-weight: 700; text-align: right;">${metrics?.playlists_added ?? 'Reported in dashboard'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Reported Streams:</td>
          <td style="padding: 6px 0; color: #82C321; font-weight: 700; text-align: right;">${metrics?.delivered_streams?.toLocaleString() ?? 'Reported in dashboard'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6B7280;">Status:</td>
          <td style="padding: 6px 0; color: #A855F7; font-weight: 700; text-align: right;">Completed</td>
        </tr>
      </table>
    </div>

    ${metrics?.notes ? `<p><strong>Curator Notes:</strong><br><span style="color: #9CA3AF; font-size: 13px;">${metrics.notes}</span></p>` : ''}

    <p>Thank you for partnering with JamBoost. You can review your campaign summary anytime from your artist dashboard, or submit your next release when ready.</p>
  `;

  const text = `Hi ${artistName || submission.artist},

Your promotion campaign for "${submission.title}" (${submission.plan} plan) has completed.

Playlists Added: ${metrics?.playlists_added ?? 0}
Reported Delivered Streams: ${metrics?.delivered_streams?.toLocaleString() ?? 0}
Status: Completed

View your full report on your JamBoost dashboard:
https://jamboost.sanelowmusiclabel.co.za/dashboard

Thank you for choosing JamBoost!
Sanelow Music Label`;

  return sendResendEmail({
    to: artistEmail,
    subject: `Campaign Completed: "${submission.title}" Performance Report Ready`,
    html: getBaseTemplate({
      headline,
      preheader,
      contentHtml,
      ctaText: 'View Final Campaign Report',
      ctaUrl: '/dashboard',
    }),
    text,
  });
}
