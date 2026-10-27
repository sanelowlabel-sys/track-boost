import http from 'http';
import express, { type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate environment variables on startup
function validateProductionEnvironment(): { isValid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  const requiredProduction = [
    { key: 'VITE_SUPABASE_URL', fallback: 'SUPABASE_URL', desc: 'Supabase project URL' },
    { key: 'VITE_SUPABASE_ANON_KEY', fallback: null, desc: 'Supabase public anon key' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', fallback: null, desc: 'Supabase service role secret' },
    { key: 'SPOTIFY_CLIENT_ID', fallback: null, desc: 'Spotify Web API client ID' },
    { key: 'SPOTIFY_CLIENT_SECRET', fallback: null, desc: 'Spotify Web API client secret' },
    { key: 'PAYPAL_CLIENT_ID', fallback: null, desc: 'PayPal REST App client ID' },
    { key: 'PAYPAL_CLIENT_SECRET', fallback: null, desc: 'PayPal REST App client secret' },
    { key: 'PAYPAL_WEBHOOK_ID', fallback: null, desc: 'PayPal Webhook ID for signature verification' },
  ];

  for (const item of requiredProduction) {
    const val = (process.env[item.key] || (item.fallback ? process.env[item.fallback] : ''))?.trim();
    if (!val) {
      missing.push(`${item.key} (${item.desc})`);
    }
  }

  if (!process.env.APP_URL?.trim()) {
    warnings.push('APP_URL is not set; will dynamically resolve from incoming Host and X-Forwarded-Proto headers.');
  }

  return { isValid: missing.length === 0, missing, warnings };
}

// Supabase Admin Client using Service Role Key
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Spotify Web API Credentials
const SPOTIFY_CLIENT_ID = (process.env.SPOTIFY_CLIENT_ID || '').trim();
const SPOTIFY_CLIENT_SECRET = (process.env.SPOTIFY_CLIENT_SECRET || '').trim();

// PayPal Credentials & Base URL
const PAYPAL_CLIENT_ID = (process.env.PAYPAL_CLIENT_ID || '').trim();
const PAYPAL_CLIENT_SECRET = (process.env.PAYPAL_CLIENT_SECRET || '').trim();
const PAYPAL_WEBHOOK_ID = (process.env.PAYPAL_WEBHOOK_ID || '').trim();
const PAYPAL_MODE = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE ||
  (PAYPAL_MODE === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com');

// Server-authoritative Price Table keyed by plan (never trust client amounts)
export const SERVER_PLAN_PRICES: Record<
  string,
  { amountCents: number; currency: string; usdValue: string }
> = {
  Starter: { amountCents: 2900, currency: 'USD', usdValue: '29.00' },
  Pro: { amountCents: 8900, currency: 'USD', usdValue: '89.00' },
  Viral: { amountCents: 24900, currency: 'USD', usdValue: '249.00' },
  Premium: { amountCents: 24900, currency: 'USD', usdValue: '249.00' },
};

// Token cache for PayPal Client Credentials
let cachedPayPalToken: CachedToken | null = null;

async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  if (cachedPayPalToken && cachedPayPalToken.expiresAt > now + 60000) {
    return cachedPayPalToken.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal token request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedPayPalToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

// Token cache for Spotify Client Credentials
interface CachedToken {
  token: string;
  expiresAt: number;
}
let cachedSpotifyToken: CachedToken | null = null;

async function getSpotifyAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  if (cachedSpotifyToken && cachedSpotifyToken.expiresAt > now + 60000) {
    return cachedSpotifyToken.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify token request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedSpotifyToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

// In-Memory Rate Limiter: 30 lookups per user per hour
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const userRateLimits = new Map<string, RateLimitRecord>();

function checkUserRateLimit(userId: string): { allowed: boolean; remaining: number; resetInMinutes: number } {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const record = userRateLimits.get(userId);

  if (!record || now > record.resetTime) {
    userRateLimits.set(userId, { count: 1, resetTime: now + ONE_HOUR });
    return { allowed: true, remaining: 29, resetInMinutes: 60 };
  }

  if (record.count >= 30) {
    const resetInMinutes = Math.max(1, Math.ceil((record.resetTime - now) / 60000));
    return { allowed: false, remaining: 0, resetInMinutes };
  }

  record.count += 1;
  const resetInMinutes = Math.max(1, Math.ceil((record.resetTime - now) / 60000));
  return { allowed: true, remaining: 30 - record.count, resetInMinutes };
}

// Parser for Spotify URLs & URIs
export interface ParsedSpotifyUrl {
  type: 'track' | 'album' | 'playlist';
  id: string;
}

export function parseSpotifyUrl(rawUrl: string): ParsedSpotifyUrl | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  // Match https://open.spotify.com/(intl-[a-z]+/)?(track|album|playlist)/([a-zA-Z0-9]+)
  const webMatch = trimmed.match(
    /open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist)\/([a-zA-Z0-9]+)/i
  );
  if (webMatch && webMatch[1] && webMatch[2]) {
    const type = webMatch[1].toLowerCase() as 'track' | 'album' | 'playlist';
    const id = webMatch[2];
    return { type, id };
  }

  // Match spotify:(track|album|playlist):([a-zA-Z0-9]+)
  const uriMatch = trimmed.match(/spotify:(track|album|playlist):([a-zA-Z0-9]+)/i);
  if (uriMatch && uriMatch[1] && uriMatch[2]) {
    const type = uriMatch[1].toLowerCase() as 'track' | 'album' | 'playlist';
    const id = uriMatch[2];
    return { type, id };
  }

  return null;
}

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = Number(process.env.PORT) || 3000;

  // Validate production configuration
  const envCheck = validateProductionEnvironment();
  if (isProduction && !envCheck.isValid) {
    console.error('\n======================================================');
    console.error('❌ [FATAL STARTUP ERROR] Missing Required Production Environment Variables:');
    envCheck.missing.forEach((item) => console.error(`   • ${item}`));
    console.error('\nPlease configure these variables in your hosting dashboard before starting in production mode.');
    console.error('======================================================\n');
    process.exit(1);
  } else if (!envCheck.isValid) {
    console.warn('[Startup Notice] Running in development with partial credentials:');
    envCheck.missing.forEach((item) => console.warn(`   ⚠️  ${item}`));
  }

  if (envCheck.warnings.length > 0) {
    envCheck.warnings.forEach((warn) => console.log(`[Startup Info] ${warn}`));
  }

  const app = express();
  const httpServer = http.createServer(app);

  // Trust proxy for HTTPS headers behind reverse proxies (Render, Railway, Fly.io, Cloudflare)
  app.set('trust proxy', 1);

  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // GET /api/health - Health check endpoint for container / hosting platforms
  app.get('/api/health', (_req: Request, res: Response) => {
    return res.status(200).json({
      status: 'ok',
      service: 'jamboost',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      paypalMode: PAYPAL_MODE,
      supabaseConfigured: Boolean(supabaseAdmin),
    });
  });

  // GET /api/spotify/lookup?url=<spotify url>
  app.get('/api/spotify/lookup', async (req: Request, res: Response) => {
    try {
      // 1. Verify Authorization Header with Supabase getUser(token)
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized: Missing or invalid Authorization header. A valid Supabase access token is required.',
        });
      }

      const token = authHeader.substring(7).trim();
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Bearer token is empty.' });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          error: 'Server authentication is not configured: SUPABASE_SERVICE_ROLE_KEY is required on the server.',
        });
      }

      const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !userData?.user) {
        return res.status(401).json({
          error: 'Unauthorized: Invalid or expired session token.',
        });
      }

      const user = userData.user;

      // 2. Check User Rate Limit (30 lookups per user per hour)
      const rateLimit = checkUserRateLimit(user.id);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: `Rate limit reached: You can make up to 30 Spotify lookups per hour. Please wait ${rateLimit.resetInMinutes} minute(s) before trying again.`,
        });
      }

      // 3. Parse Spotify URL / URI
      const inputUrl = req.query.url;
      if (!inputUrl || typeof inputUrl !== 'string') {
        return res.status(400).json({
          error: 'Missing required "url" query parameter.',
        });
      }

      const parsed = parseSpotifyUrl(inputUrl);
      if (!parsed) {
        return res.status(400).json({
          error: 'Invalid Spotify link. Please provide a valid Track, Album, or Playlist URL or Spotify URI.',
        });
      }

      // 4. Verify Spotify API Credentials
      if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        return res.status(500).json({
          error: 'Spotify API credentials (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET) are not configured on the server.',
        });
      }

      // 5. Fetch Spotify Access Token
      const spotifyToken = await getSpotifyAccessToken(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);

      // 6. Query Spotify Web API based on type
      let spotifyApiUrl = '';
      if (parsed.type === 'track') {
        spotifyApiUrl = `https://api.spotify.com/v1/tracks/${parsed.id}`;
      } else if (parsed.type === 'album') {
        spotifyApiUrl = `https://api.spotify.com/v1/albums/${parsed.id}`;
      } else if (parsed.type === 'playlist') {
        spotifyApiUrl = `https://api.spotify.com/v1/playlists/${parsed.id}?fields=id,name,external_urls,images,owner`;
      }

      const spotifyResponse = await fetch(spotifyApiUrl, {
        headers: {
          Authorization: `Bearer ${spotifyToken}`,
        },
      });

      if (spotifyResponse.status === 404) {
        return res.status(404).json({
          error: `Spotify ${parsed.type} not found. Please verify the URL or ensure the item is public.`,
        });
      }

      if (!spotifyResponse.ok) {
        const errText = await spotifyResponse.text();
        return res.status(spotifyResponse.status).json({
          error: `Spotify API error (${spotifyResponse.status}): ${errText}`,
        });
      }

      const spotifyData = await spotifyResponse.json();

      let title = '';
      let artists: string[] = [];
      let imageUrl = '';
      let spotifyUrl = '';

      if (parsed.type === 'track') {
        title = spotifyData.name || '';
        artists = Array.isArray(spotifyData.artists)
          ? spotifyData.artists.map((a: any) => a.name).filter(Boolean)
          : [];
        imageUrl = spotifyData.album?.images?.[0]?.url || '';
        spotifyUrl = spotifyData.external_urls?.spotify || `https://open.spotify.com/track/${parsed.id}`;
      } else if (parsed.type === 'album') {
        title = spotifyData.name || '';
        artists = Array.isArray(spotifyData.artists)
          ? spotifyData.artists.map((a: any) => a.name).filter(Boolean)
          : [];
        imageUrl = spotifyData.images?.[0]?.url || '';
        spotifyUrl = spotifyData.external_urls?.spotify || `https://open.spotify.com/album/${parsed.id}`;
      } else if (parsed.type === 'playlist') {
        title = spotifyData.name || '';
        const ownerName = spotifyData.owner?.display_name || 'Spotify Curator';
        artists = [ownerName];
        imageUrl = spotifyData.images?.[0]?.url || '';
        spotifyUrl = spotifyData.external_urls?.spotify || `https://open.spotify.com/playlist/${parsed.id}`;
      }

      return res.json({
        type: parsed.type,
        id: parsed.id,
        title,
        artists,
        image_url: imageUrl,
        spotify_url: spotifyUrl,
      });
    } catch (err: any) {
      console.error('Error in /api/spotify/lookup:', err);
      return res.status(500).json({
        error: err?.message || 'Internal server error while looking up Spotify item.',
      });
    }
  });

  // POST /api/checkout { submission_id }
  app.post('/api/checkout', async (req: Request, res: Response) => {
    try {
      // 1. Verify Authorization Header with Supabase Bearer Token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized: Missing or invalid Authorization header. A valid Supabase access token is required.',
        });
      }

      const token = authHeader.substring(7).trim();
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Bearer token is empty.' });
      }

      if (!supabaseUrl) {
        return res.status(500).json({ error: 'Supabase URL is not configured on the server.' });
      }

      // 2. Load submission as that user using their token so Row-Level Security applies
      const userSupabase = createClient(
        supabaseUrl,
        process.env.VITE_SUPABASE_ANON_KEY || supabaseServiceRoleKey || '',
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

      const { data: userData, error: userError } = await userSupabase.auth.getUser(token);
      if (userError || !userData?.user) {
        return res.status(401).json({
          error: 'Unauthorized: Invalid or expired session token.',
        });
      }

      const { submission_id } = req.body || {};
      if (!submission_id || typeof submission_id !== 'string') {
        return res.status(400).json({
          error: 'Missing required "submission_id" in request body.',
        });
      }

      // Query submission - RLS ensures users can only select their own rows
      const { data: submission, error: subError } = await userSupabase
        .from('submissions')
        .select('*')
        .eq('id', submission_id)
        .single();

      if (subError || !submission) {
        return res.status(403).json({
          error: 'Submission not found or access denied. You can only checkout campaigns you own.',
        });
      }

      // Reject if status is not 'Awaiting payment'
      if (submission.status !== 'Awaiting payment') {
        return res.status(400).json({
          error: `Cannot initiate checkout: campaign status is '${submission.status}' (expected 'Awaiting payment').`,
        });
      }

      // 3. Look up the price from server-side price table keyed by plan (never accept amount from browser)
      const planPrice = SERVER_PLAN_PRICES[submission.plan];
      if (!planPrice) {
        return res.status(400).json({
          error: `Invalid campaign plan tier: ${submission.plan}`,
        });
      }

      // 4. Verify PayPal Credentials
      if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        return res.status(500).json({
          error: 'PayPal credentials (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET) are not configured on the server.',
        });
      }

      const payPalAccessToken = await getPayPalAccessToken(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);

      const host = req.get('host') || `localhost:${PORT}`;
      const protoHeader = (req.headers['x-forwarded-proto'] as string)?.split(',')[0].trim();
      const protocol = protoHeader || (req.secure ? 'https' : req.protocol);
      const fallbackUrl = `${protocol}://${host}`;
      const appUrl = (process.env.APP_URL || fallbackUrl).replace(/\/$/, '');
      const returnUrl = `${appUrl}/dashboard?payment=success`;
      const cancelUrl = `${appUrl}/dashboard?payment=cancelled`;

      // 5. Create PayPal Hosted Checkout Session (Orders v2 API)
      const orderPayload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: submission.id,
            custom_id: submission.id,
            description: `JamBoost ${submission.plan} Plan - ${submission.title}`,
            amount: {
              currency_code: 'USD',
              value: planPrice.usdValue,
            },
          },
        ],
        application_context: {
          brand_name: 'JamBoost',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      };

      const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${payPalAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!orderResponse.ok) {
        const errText = await orderResponse.text();
        console.error('PayPal Order creation failed:', orderResponse.status, errText);
        return res.status(orderResponse.status).json({
          error: `Failed to create PayPal checkout session: ${errText}`,
        });
      }

      const orderData = (await orderResponse.json()) as any;
      const approveLink = orderData.links?.find(
        (l: any) => l.rel === 'approve' || l.rel === 'payer-action'
      );

      if (!approveLink || !approveLink.href) {
        return res.status(500).json({
          error: 'PayPal did not return a valid checkout approval URL.',
        });
      }

      return res.json({
        checkout_url: approveLink.href,
        order_id: orderData.id,
        submission_id: submission.id,
        plan: submission.plan,
        amount_cents: planPrice.amountCents,
        currency: 'USD',
      });
    } catch (err: any) {
      console.error('Error in /api/checkout:', err);
      return res.status(500).json({
        error: err?.message || 'Internal server error while creating checkout session.',
      });
    }
  });

  // Webhook handler logic for PayPal
  const handlePayPalWebhook = async (req: Request, res: Response) => {
    const rawBody: Buffer | undefined = (req as any).rawBody;

    // 1. Verify provider signature headers on the raw request body and reject anything unsigned
    const authAlgo = req.headers['paypal-auth-algo'] as string;
    const certUrl = req.headers['paypal-cert-url'] as string;
    const transmissionId = req.headers['paypal-transmission-id'] as string;
    const transmissionSig = req.headers['paypal-transmission-sig'] as string;
    const transmissionTime = req.headers['paypal-transmission-time'] as string;

    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime || !rawBody) {
      console.warn('[Webhook] Rejected unsigned webhook request: missing required PayPal signature headers or body.');
      return res.status(400).json({
        error: 'Rejected: Missing required PayPal webhook signature headers or raw body.',
      });
    }

    if (!PAYPAL_WEBHOOK_ID) {
      console.error('[Webhook] PAYPAL_WEBHOOK_ID is not configured on the server.');
      return res.status(500).json({
        error: 'PAYPAL_WEBHOOK_ID is not configured on the server.',
      });
    }

    let webhookEvent: any;
    try {
      webhookEvent =
        typeof req.body === 'object' && req.body !== null
          ? req.body
          : JSON.parse(rawBody.toString('utf8'));
    } catch (parseErr) {
      console.error('[Webhook] Failed to parse JSON webhook payload:', parseErr);
      return res.status(400).json({ error: 'Invalid JSON payload.' });
    }

    try {
      // 2. Verify signature with PayPal verification API
      const payPalAccessToken = await getPayPalAccessToken(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);
      const verifyRes = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${payPalAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: PAYPAL_WEBHOOK_ID,
          webhook_event: webhookEvent,
        }),
      });

      if (!verifyRes.ok) {
        const verifyErr = await verifyRes.text();
        console.error(`[Webhook] Signature verification API returned ${verifyRes.status}:`, verifyErr);
        return res.status(400).json({ error: 'PayPal signature verification call failed.' });
      }

      const verifyData = (await verifyRes.json()) as any;
      if (verifyData.verification_status !== 'SUCCESS') {
        console.warn(`[Webhook] Rejected: Signature verification failed with status: ${verifyData.verification_status}`);
        return res.status(400).json({ error: 'Invalid PayPal webhook signature.' });
      }

      console.log(`[Webhook] Verified PayPal webhook event: ${webhookEvent.event_type} (ID: ${webhookEvent.id})`);

      if (!supabaseAdmin) {
        console.error('[Webhook] Database admin client is not available (SUPABASE_SERVICE_ROLE_KEY required).');
        return res.status(500).json({ error: 'Server database service role key is not configured.' });
      }

      const eventType = webhookEvent.event_type;

      // Handle PAYMENT.CAPTURE.COMPLETED
      if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
        const resource = webhookEvent.resource || {};
        const providerRef = resource.id; // Capture ID
        let submissionId = resource.custom_id;
        const amountCents = Math.round(parseFloat(resource.amount?.value || '0') * 100);
        const currency = (resource.amount?.currency_code || 'usd').toLowerCase();

        if (!providerRef) {
          console.warn('[Webhook] PAYMENT.CAPTURE.COMPLETED event missing capture resource id.');
          return res.status(400).json({ error: 'Missing provider_ref in resource.' });
        }

        // If custom_id wasn't on capture directly, attempt lookup via related order
        if (!submissionId && resource.supplementary_data?.related_ids?.order_id) {
          try {
            const orderLookupRes = await fetch(
              `${PAYPAL_API_BASE}/v2/checkout/orders/${resource.supplementary_data.related_ids.order_id}`,
              {
                headers: { Authorization: `Bearer ${payPalAccessToken}` },
              }
            );
            if (orderLookupRes.ok) {
              const orderData = await orderLookupRes.json();
              submissionId =
                orderData.purchase_units?.[0]?.reference_id ||
                orderData.purchase_units?.[0]?.custom_id;
            }
          } catch (lookupErr) {
            console.warn('[Webhook] Order lookup fallback error:', lookupErr);
          }
        }

        // 3. Idempotency Check: query existing payment with this provider_ref
        const { data: existingPayment } = await supabaseAdmin
          .from('payments')
          .select('id, provider_ref')
          .eq('provider_ref', providerRef)
          .maybeSingle();

        if (existingPayment) {
          console.log(`[Webhook Outcome] Idempotent hit: provider_ref '${providerRef}' already processed. Skipping duplicate insert.`);
          if (submissionId) {
            await supabaseAdmin
              .from('submissions')
              .update({ status: 'Pending' })
              .eq('id', submissionId);
          }
          return res.status(200).json({ received: true, idempotent: true });
        }

        // Insert row in payments (provider, provider_ref, amount_cents, currency, status) using service role key
        const paymentRow = {
          provider: 'paypal',
          provider_ref: providerRef,
          amount_cents: amountCents,
          currency: currency || 'usd',
          status: 'completed',
        };

        const { error: insertErr } = await supabaseAdmin.from('payments').insert([paymentRow]);
        if (insertErr) {
          if (
            insertErr.code === '23505' ||
            insertErr.message.toLowerCase().includes('unique') ||
            insertErr.message.toLowerCase().includes('duplicate')
          ) {
            console.log(`[Webhook Outcome] Concurrent duplicate payment caught for '${providerRef}'. Idempotency preserved.`);
          } else {
            console.error('[Webhook Outcome] Error inserting payment row:', insertErr);
            return res.status(500).json({ error: 'Database insert failed: ' + insertErr.message });
          }
        } else {
          console.log(`[Webhook Outcome] Payment row inserted successfully for provider_ref '${providerRef}' ($${(amountCents / 100).toFixed(2)} USD).`);
        }

        // Set the submission status to 'Pending'
        if (submissionId) {
          const { error: updateSubErr } = await supabaseAdmin
            .from('submissions')
            .update({ status: 'Pending' })
            .eq('id', submissionId);

          if (updateSubErr) {
            console.error(`[Webhook Outcome] Error updating submission '${submissionId}' status to Pending:`, updateSubErr);
          } else {
            console.log(`[Webhook Outcome] Submission '${submissionId}' status updated to 'Pending'.`);
          }
        }

        return res.status(200).json({ received: true, success: true });
      }

      // Handle CHECKOUT.ORDER.APPROVED
      if (eventType === 'CHECKOUT.ORDER.APPROVED') {
        const orderId = webhookEvent.resource?.id;
        console.log(`[Webhook] Order approved (${orderId}). Capturing order via PayPal API...`);

        const captureRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${payPalAccessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!captureRes.ok) {
          const captureErr = await captureRes.text();
          console.warn(`[Webhook Outcome] Order capture call returned status ${captureRes.status}:`, captureErr);
        } else {
          const captureData = (await captureRes.json()) as any;
          const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
          const providerRef = capture?.id || orderId;
          const submissionId =
            capture?.custom_id ||
            captureData.purchase_units?.[0]?.reference_id ||
            captureData.purchase_units?.[0]?.custom_id ||
            webhookEvent.resource?.purchase_units?.[0]?.custom_id;
          const amountCents = Math.round(
            parseFloat(capture?.amount?.value || captureData.purchase_units?.[0]?.amount?.value || '0') * 100
          );
          const currency = (capture?.amount?.currency_code || 'usd').toLowerCase();

          // Idempotency check
          const { data: existingPayment } = await supabaseAdmin
            .from('payments')
            .select('id, provider_ref')
            .eq('provider_ref', providerRef)
            .maybeSingle();

          if (!existingPayment) {
            const { error: insertErr } = await supabaseAdmin.from('payments').insert([
              {
                provider: 'paypal',
                provider_ref: providerRef,
                amount_cents: amountCents,
                currency: currency || 'usd',
                status: 'completed',
              },
            ]);
            if (insertErr) {
              console.error('[Webhook Outcome] Error inserting payment from order capture:', insertErr);
            } else {
              console.log(`[Webhook Outcome] Inserted payment row for captured order '${providerRef}' ($${(amountCents / 100).toFixed(2)} USD).`);
            }
          }

          if (submissionId) {
            await supabaseAdmin
              .from('submissions')
              .update({ status: 'Pending' })
              .eq('id', submissionId);
            console.log(`[Webhook Outcome] Submission '${submissionId}' status updated to 'Pending' via order capture.`);
          }
        }

        return res.status(200).json({ received: true, captured: true });
      }

      console.log(`[Webhook Outcome] Ignored non-payment event type '${eventType}'.`);
      return res.status(200).json({ received: true, ignored: true });
    } catch (err: any) {
      console.error('[Webhook Outcome] Fatal error while processing PayPal webhook:', err);
      return res.status(500).json({ error: err?.message || 'Internal webhook error.' });
    }
  };

  // POST /api/webhooks/paypal
  app.post('/api/webhooks/paypal', handlePayPalWebhook);

  // POST /api/webhooks/:provider (supports /api/webhooks/paypal and rejects other providers)
  app.post('/api/webhooks/:provider', (req: Request, res: Response) => {
    if (req.params.provider.toLowerCase() !== 'paypal') {
      console.warn(`[Webhook Outcome] Rejected unsupported provider: ${req.params.provider}`);
      return res.status(404).json({ error: `Unsupported payment provider: ${req.params.provider}` });
    }
    return handlePayPalWebhook(req, res);
  });

  // Serve Front-End
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const indexPath = path.resolve(distPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.warn(
        `⚠️ [Production Warning] Static build file '${indexPath}' was not found.\n` +
          `   Please make sure to execute 'npm run build' before running 'npm start'.`
      );
    }
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send(
          '<html><body style="font-family:sans-serif;padding:40px;background:#121212;color:#fff;"><h2>503 - Application Assets Not Built</h2><p>Please run <code>npm run build</code> to compile the client application before starting the production server.</p></body></html>'
        );
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`JamBoost server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
