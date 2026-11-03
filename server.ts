import http from 'http';
import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  sendArtistPaymentReceivedEmail,
  sendAdminNewPaidSubmissionAlert,
  sendArtistSubmissionApprovedEmail,
  sendArtistSubmissionRejectedEmail,
  sendArtistSubmissionCompletedEmail,
} from './server/email.ts';

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
    { key: 'RESEND_API_KEY', fallback: null, desc: 'Resend API key for transactional emails' },
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

  // Derive Supabase hosts for Content-Security-Policy
  const cleanSupabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  let supabaseOrigin = '';
  let supabaseWsOrigin = '';
  try {
    if (cleanSupabaseUrl) {
      const parsedUrl = new URL(cleanSupabaseUrl);
      supabaseOrigin = parsedUrl.origin;
      supabaseWsOrigin = `wss://${parsedUrl.host}`;
    }
  } catch {
    // fallback
  }

  // Helmet Security Headers & Content-Security-Policy
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://challenges.cloudflare.com',
            'https://plausible.io',
            'https://*.paypal.com',
            'https://*.sandbox.paypal.com',
          ],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://i.scdn.co',
            'https://*.scdn.co',
            'https://mosaic.scdn.co',
            'https://*.spotifycdn.com',
            'https://www.paypalobjects.com',
            'https://*.paypal.com',
          ],
          connectSrc: [
            "'self'",
            supabaseOrigin || 'https://*.supabase.co',
            supabaseWsOrigin || 'wss://*.supabase.co',
            'https://*.supabase.co',
            'wss://*.supabase.co',
            'https://api-m.paypal.com',
            'https://api-m.sandbox.paypal.com',
            'https://challenges.cloudflare.com',
            'https://plausible.io',
          ].filter(Boolean),
          frameSrc: [
            "'self'",
            'https://challenges.cloudflare.com',
            'https://*.paypal.com',
            'https://*.sandbox.paypal.com',
          ],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'", 'https://*.paypal.com', 'https://*.sandbox.paypal.com'],
        },
      },
    })
  );

  // Strict CORS to our own domain
  const configuredAppUrl = (process.env.APP_URL || '').trim();
  let appOrigin = '';
  try {
    if (configuredAppUrl) {
      appOrigin = new URL(configuredAppUrl).origin;
    }
  } catch {
    // fallback
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production') {
          if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            return callback(null, true);
          }
        }
        if (appOrigin && origin === appOrigin) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );

  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // In-Memory Per-IP Rate Limiting Stores
  const ipRateLimits = new Map<string, number[]>();

  function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || '127.0.0.1';
  }

  function checkIpRateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = (ipRateLimits.get(key) || []).filter((t) => t > now - windowMs);
    if (timestamps.length >= limit) {
      ipRateLimits.set(key, timestamps);
      return false;
    }
    timestamps.push(now);
    ipRateLimits.set(key, timestamps);
    return true;
  }

  // Cleanup stale IP entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [k, timestamps] of ipRateLimits.entries()) {
      const valid = timestamps.filter((t) => t > now - 3600000);
      if (valid.length === 0) ipRateLimits.delete(k);
      else ipRateLimits.set(k, valid);
    }
  }, 300000);

  // Per-IP Rate Limiters:
  // - checkout 20 per hour
  // - all other API calls 120 per minute
  function generalApiRateLimiter(req: Request, res: Response, next: NextFunction) {
    const ip = getClientIp(req);
    if (!checkIpRateLimit(`api:${ip}`, 120, 60 * 1000)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  }

  function checkoutRateLimiter(req: Request, res: Response, next: NextFunction) {
    const ip = getClientIp(req);
    if (!checkIpRateLimit(`checkout:${ip}`, 20, 60 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  }

  // Apply rate limiters to /api routes
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/checkout' || req.path === '/checkout/capture') {
      return checkoutRateLimiter(req, res, next);
    }
    return generalApiRateLimiter(req, res, next);
  });

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

  // POST /api/auth/rate-limit-check?action=signup|reset|signin
  // Enforces 5 per hour per-IP for sign-up and password reset
  app.post('/api/auth/rate-limit-check', (req: Request, res: Response) => {
    const authCheckSchema = z.object({
      action: z.enum(['signup', 'reset', 'signin']),
    });
    const parsed = authCheckSchema.safeParse(req.query);
    if (!parsed.success) {
      console.error('[Zod Validation Failed - /api/auth/rate-limit-check]:', parsed.error.format());
      return res.status(400).json({ error: 'Invalid request payload or parameters.' });
    }

    const { action } = parsed.data;
    const ip = getClientIp(req);

    if (action === 'signup' || action === 'reset') {
      if (!checkIpRateLimit(`auth:${action}:${ip}`, 5, 60 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many attempts. Please try again in an hour.' });
      }
    }

    return res.status(200).json({ allowed: true });
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

      // 3. Validate and parse Spotify URL with Zod (trim and length-limit)
      const lookupQuerySchema = z.object({
        url: z.string().trim().min(1).max(500),
      });
      const parsedQuery = lookupQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        console.error('[Zod Validation Error - /api/spotify/lookup]:', parsedQuery.error.format());
        return res.status(400).json({
          error: 'Invalid request payload or parameters.',
        });
      }

      const inputUrl = parsedQuery.data.url;
      const parsed = parseSpotifyUrl(inputUrl);
      if (!parsed) {
        return res.status(400).json({
          error: 'Invalid request payload or parameters.',
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
        console.warn(`[Spotify Lookup] 404 Not Found from Spotify API for ${parsed.type} ID: ${parsed.id}`);
        return res.status(404).json({
          error: 'Spotify item not found. Please verify the URL or ensure the release is publicly accessible.',
        });
      }

      if (!spotifyResponse.ok) {
        const errText = await spotifyResponse.text();
        console.error(`[Spotify Lookup Upstream Error] HTTP ${spotifyResponse.status}: ${errText}`);
        return res.status(spotifyResponse.status >= 500 ? 502 : 400).json({
          error: 'Unable to retrieve release details from Spotify. Please check the link and try again.',
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
      console.error('[Spotify Lookup Internal Error]:', err);
      return res.status(500).json({
        error: 'Unable to retrieve release details from Spotify. Please check the link and try again.',
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

      // Validate request body with Zod (trim and length-limit)
      const checkoutBodySchema = z.object({
        submission_id: z.string().trim().min(1).max(100),
      });
      const parsedBody = checkoutBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        console.error('[Zod Validation Error - /api/checkout]:', parsedBody.error.format());
        return res.status(400).json({
          error: 'Invalid request payload or parameters.',
        });
      }
      const submission_id = parsedBody.data.submission_id;

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

  // Shared payment processing function used by both Webhook and /api/checkout/capture
  interface ProcessPaymentParams {
    providerRef: string;
    customId?: string | null;
    amountCents: number;
    currency: string;
  }

  async function processPayPalPaymentSuccess(params: ProcessPaymentParams): Promise<{
    success: boolean;
    status: 'completed' | 'amount_mismatch' | 'submission_not_found';
    idempotent?: boolean;
    submissionId?: string;
  }> {
    const { providerRef, customId, amountCents, currency } = params;

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client is not configured.');
    }

    if (!customId) {
      console.warn(`[Payment Processing] No custom_id provided for provider_ref '${providerRef}'. Returning 200 without changing anything.`);
      return { success: true, status: 'submission_not_found' };
    }

    // 1. Load the submission with the service role client using custom_id
    const { data: submission, error: subError } = await supabaseAdmin
      .from('submissions')
      .select('id, user_id, plan, status, title, artist, user_email, genre, spotify_url, target_territory, item_type')
      .eq('id', customId)
      .maybeSingle();

    if (subError || !submission) {
      console.warn(`[Payment Processing] Submission '${customId}' not found in database for provider_ref '${providerRef}'. Error:`, subError);
      return { success: true, status: 'submission_not_found' };
    }

    // 2. Idempotency check: check if payment with provider_ref already exists
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id, provider_ref, status')
      .eq('provider_ref', providerRef)
      .maybeSingle();

    if (existingPayment) {
      console.log(`[Payment Processing] Idempotent hit: payment '${providerRef}' already recorded with status '${existingPayment.status}'.`);
      if (existingPayment.status === 'completed' && submission.status === 'Awaiting payment') {
        await supabaseAdmin
          .from('submissions')
          .update({ status: 'Pending', updated_at: new Date().toISOString() })
          .eq('id', submission.id);
      }
      return {
        success: true,
        idempotent: true,
        status: existingPayment.status as any,
        submissionId: submission.id,
      };
    }

    // 3. Before marking it Pending, check that the paid amount and currency equal
    //    SERVER_PLAN_PRICES for that submission's plan, and that its status is 'Awaiting payment';
    //    if not, record the payment with status 'amount_mismatch' and do not change the submission.
    const expectedPrice = SERVER_PLAN_PRICES[submission.plan];
    const normalizedCurrency = (currency || 'USD').toUpperCase();
    const expectedCurrency = (expectedPrice?.currency || 'USD').toUpperCase();

    const isAmountMatch =
      Boolean(expectedPrice) &&
      expectedPrice.amountCents === amountCents &&
      expectedCurrency === normalizedCurrency;

    const isStatusEligible = submission.status === 'Awaiting payment';

    if (!isAmountMatch || !isStatusEligible) {
      console.warn(
        `[Payment Processing] Amount mismatch or invalid status for submission '${submission.id}'. ` +
        `Expected: ${expectedPrice?.amountCents} ${expectedCurrency} in 'Awaiting payment'. ` +
        `Received: ${amountCents} ${normalizedCurrency} with submission status '${submission.status}'. ` +
        `Recording payment as 'amount_mismatch' and not changing submission.`
      );

      // Record payment with status 'amount_mismatch' including submission_id and user_id
      await supabaseAdmin.from('payments').insert([
        {
          provider: 'paypal',
          provider_ref: providerRef,
          submission_id: submission.id,
          user_id: submission.user_id,
          amount_cents: amountCents,
          currency: (currency || 'usd').toLowerCase(),
          status: 'amount_mismatch',
        },
      ]);

      return {
        success: true,
        status: 'amount_mismatch',
        submissionId: submission.id,
      };
    }

    // 4. Amount and status valid: insert into payments including submission_id and user_id
    const { error: insertErr } = await supabaseAdmin.from('payments').insert([
      {
        provider: 'paypal',
        provider_ref: providerRef,
        submission_id: submission.id,
        user_id: submission.user_id,
        amount_cents: amountCents,
        currency: (currency || 'usd').toLowerCase(),
        status: 'completed',
      },
    ]);

    if (insertErr) {
      if (
        insertErr.code === '23505' ||
        insertErr.message?.toLowerCase().includes('duplicate') ||
        insertErr.message?.toLowerCase().includes('unique')
      ) {
        console.log(`[Payment Processing] Concurrent duplicate insert caught for '${providerRef}'. Idempotency preserved.`);
      } else {
        console.error('[Payment Processing] Error inserting payment row:', insertErr);
        throw insertErr;
      }
    } else {
      console.log(`[Payment Processing] Payment recorded for submission '${submission.id}', user '${submission.user_id}', ref '${providerRef}'.`);
    }

    // Update submission status to 'Pending'
    const { error: updateErr } = await supabaseAdmin
      .from('submissions')
      .update({ status: 'Pending', updated_at: new Date().toISOString() })
      .eq('id', submission.id);

    if (updateErr) {
      console.error(`[Payment Processing] Error updating submission '${submission.id}' status to Pending:`, updateErr);
      throw updateErr;
    }

    console.log(`[Payment Processing] Submission '${submission.id}' successfully marked 'Pending'.`);

    // Fetch user profile for display name and email if available
    let artistEmail = submission.user_email;
    let artistName = submission.artist;
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('display_name, email')
        .eq('id', submission.user_id)
        .maybeSingle();

      if (profile?.email) artistEmail = profile.email;
      if (profile?.display_name) artistName = profile.display_name;
    } catch (e) {
      console.warn('[Payment Processing] Could not load profile for email:', e);
    }

    // 1. Send confirmation email to artist
    if (artistEmail) {
      sendArtistPaymentReceivedEmail({
        artistEmail,
        artistName,
        submission: {
          id: submission.id,
          title: submission.title,
          artist: submission.artist,
          plan: submission.plan,
          amountCents,
          currency,
        },
      }).catch((err) => console.error('[Resend Email Error]:', err));
    } else {
      console.warn(`[Resend Email] No artist email found for submission '${submission.id}'.`);
    }

    // 2. Send new paid submission alert to orders@sanelowmusiclabel.co.za
    sendAdminNewPaidSubmissionAlert({
      submission: {
        id: submission.id,
        title: submission.title,
        artist: submission.artist,
        plan: submission.plan,
        amountCents,
        currency,
        spotify_url: submission.spotify_url,
        genre: submission.genre,
        target_territory: submission.target_territory,
        item_type: submission.item_type,
      },
      userEmail: artistEmail || submission.user_email || 'Artist',
      displayName: artistName,
    }).catch((err) => console.error('[Resend Email Error]:', err));

    return {
      success: true,
      status: 'completed',
      submissionId: submission.id,
    };
  }

  // POST /api/checkout/capture { order_id }
  app.post('/api/checkout/capture', async (req: Request, res: Response) => {
    try {
      // 1. Verify Authorization Header with Supabase Bearer Token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized: Missing or invalid Authorization header.',
        });
      }

      const token = authHeader.substring(7).trim();
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Bearer token is empty.' });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Server database service role key is not configured.' });
      }

      const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !userData?.user) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token.' });
      }

      // Validate request body with Zod (trim and length-limit)
      const captureBodySchema = z.object({
        order_id: z.string().trim().min(1).max(100),
      });
      const parsedBody = captureBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        console.error('[Zod Validation Error - /api/checkout/capture]:', parsedBody.error.format());
        return res.status(400).json({ error: 'Invalid request payload or parameters.' });
      }
      const order_id = parsedBody.data.order_id;

      // 2. Fetch PayPal access token
      const payPalAccessToken = await getPayPalAccessToken(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);

      // 3. Capture the PayPal order
      let providerRef = '';
      let customId = '';
      let amountCents = 0;
      let currency = 'USD';

      const captureRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${order_id}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${payPalAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (captureRes.ok) {
        const captureData = (await captureRes.json()) as any;
        const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
        providerRef = capture?.id || order_id;
        customId =
          capture?.custom_id ||
          captureData.purchase_units?.[0]?.reference_id ||
          captureData.purchase_units?.[0]?.custom_id ||
          '';
        amountCents = Math.round(
          parseFloat(capture?.amount?.value || captureData.purchase_units?.[0]?.amount?.value || '0') * 100
        );
        currency = capture?.amount?.currency_code || captureData.purchase_units?.[0]?.amount?.currency_code || 'USD';
      } else {
        // If initial capture returned error, check if order is already captured
        const captureErrText = await captureRes.text();
        console.warn(`[Checkout Capture] Capture call returned status ${captureRes.status}:`, captureErrText);

        const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${order_id}`, {
          headers: { Authorization: `Bearer ${payPalAccessToken}` },
        });

        if (!orderRes.ok) {
          return res.status(400).json({
            error: `Failed to retrieve PayPal order: HTTP ${orderRes.status}.`,
          });
        }

        const orderData = (await orderRes.json()) as any;
        const capture = orderData.purchase_units?.[0]?.payments?.captures?.[0];
        providerRef = capture?.id || order_id;
        customId =
          capture?.custom_id ||
          orderData.purchase_units?.[0]?.reference_id ||
          orderData.purchase_units?.[0]?.custom_id ||
          '';
        amountCents = Math.round(
          parseFloat(capture?.amount?.value || orderData.purchase_units?.[0]?.amount?.value || '0') * 100
        );
        currency = capture?.amount?.currency_code || orderData.purchase_units?.[0]?.amount?.currency_code || 'USD';
      }

      // 4. Shared payment processing function
      const result = await processPayPalPaymentSuccess({
        providerRef,
        customId,
        amountCents,
        currency,
      });

      if (result.status === 'submission_not_found') {
        return res.status(404).json({ error: 'Campaign submission not found.', status: result.status });
      }

      if (result.status === 'amount_mismatch') {
        return res.status(400).json({
          error: 'Payment amount mismatch. Please contact support.',
          status: result.status,
          submission_id: result.submissionId,
        });
      }

      return res.status(200).json({
        success: true,
        submission_id: result.submissionId,
        status: result.status,
        idempotent: Boolean(result.idempotent),
      });
    } catch (err: any) {
      console.error('[Checkout Capture Error]:', err);
      return res.status(500).json({
        error: err?.message || 'Internal server error while capturing PayPal payment.',
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

        const result = await processPayPalPaymentSuccess({
          providerRef,
          customId: submissionId,
          amountCents,
          currency,
        });

        return res.status(200).json({ received: true, ...result });
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

        let providerRef = orderId;
        let submissionId =
          webhookEvent.resource?.purchase_units?.[0]?.custom_id ||
          webhookEvent.resource?.purchase_units?.[0]?.reference_id;
        let amountCents = 0;
        let currency = 'USD';

        if (captureRes.ok) {
          const captureData = (await captureRes.json()) as any;
          const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
          providerRef = capture?.id || orderId;
          submissionId =
            capture?.custom_id ||
            captureData.purchase_units?.[0]?.reference_id ||
            captureData.purchase_units?.[0]?.custom_id ||
            submissionId;
          amountCents = Math.round(
            parseFloat(capture?.amount?.value || captureData.purchase_units?.[0]?.amount?.value || '0') * 100
          );
          currency = capture?.amount?.currency_code || captureData.purchase_units?.[0]?.amount?.currency_code || 'USD';
        } else {
          const captureErr = await captureRes.text();
          console.warn(`[Webhook Outcome] Order capture call returned status ${captureRes.status}:`, captureErr);

          // If already captured, fetch order
          const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${payPalAccessToken}` },
          });
          if (orderRes.ok) {
            const orderData = (await orderRes.json()) as any;
            const capture = orderData.purchase_units?.[0]?.payments?.captures?.[0];
            providerRef = capture?.id || orderId;
            submissionId =
              capture?.custom_id ||
              orderData.purchase_units?.[0]?.reference_id ||
              orderData.purchase_units?.[0]?.custom_id ||
              submissionId;
            amountCents = Math.round(
              parseFloat(capture?.amount?.value || orderData.purchase_units?.[0]?.amount?.value || '0') * 100
            );
            currency = capture?.amount?.currency_code || orderData.purchase_units?.[0]?.amount?.currency_code || 'USD';
          }
        }

        const result = await processPayPalPaymentSuccess({
          providerRef,
          customId: submissionId,
          amountCents,
          currency,
        });

        return res.status(200).json({ received: true, captured: true, ...result });
      }

      // Handle PAYMENT.CAPTURE.DENIED
      if (eventType === 'PAYMENT.CAPTURE.DENIED') {
        const resource = webhookEvent.resource || {};
        const providerRef = resource.id;
        console.warn(`[Webhook Outcome] PAYMENT.CAPTURE.DENIED received for capture '${providerRef}'.`);
        if (providerRef) {
          const { error: updateErr } = await supabaseAdmin
            .from('payments')
            .update({ status: 'denied' })
            .eq('provider_ref', providerRef);
          if (updateErr) {
            console.error('[Webhook Outcome] Error updating payment to denied:', updateErr);
          } else {
            console.log(`[Webhook Outcome] Payment '${providerRef}' status updated to 'denied'.`);
          }
        }
        return res.status(200).json({ received: true, status: 'denied' });
      }

      // Handle PAYMENT.CAPTURE.REFUNDED
      if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
        const resource = webhookEvent.resource || {};
        const refundId = resource.id;
        let captureId = resource.capture_id;
        if (!captureId && Array.isArray(resource.links)) {
          const upLink = resource.links.find((l: any) => l.rel === 'up');
          if (upLink?.href) {
            const parts = upLink.href.split('/');
            captureId = parts[parts.length - 1];
          }
        }
        console.log(`[Webhook Outcome] PAYMENT.CAPTURE.REFUNDED received (Refund ID: '${refundId}', Capture ID: '${captureId}').`);
        if (captureId) {
          const { error: updateErr } = await supabaseAdmin
            .from('payments')
            .update({ status: 'refunded' })
            .eq('provider_ref', captureId);
          if (updateErr) {
            console.error('[Webhook Outcome] Error updating payment to refunded:', updateErr);
          } else {
            console.log(`[Webhook Outcome] Payment '${captureId}' status updated to 'refunded'.`);
          }
        }
        return res.status(200).json({ received: true, status: 'refunded' });
      }

      console.log(`[Webhook Outcome] Ignored unhandled event type '${eventType}'.`);
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

  // POST /api/admin/submissions/:id/transition
  app.post('/api/admin/submissions/:id/transition', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing Authorization header.' });
      }
      const token = authHeader.substring(7).trim();
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Server database service role is not configured.' });
      }

      // Verify user identity
      const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (authErr || !userData?.user) {
        return res.status(401).json({ error: 'Unauthorized: Invalid session token.' });
      }

      // Verify user is an admin
      const { data: profile, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profErr || profile?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
      }

      // Validate request parameters and body with Zod (trim and length-limit)
      const transitionParamsSchema = z.object({
        id: z.string().trim().min(1).max(100),
      });
      const transitionBodySchema = z.object({
        status: z.enum(['Approved', 'Rejected', 'Live', 'Completed']),
        notes: z.string().trim().max(1000).optional(),
      });

      const parsedParams = transitionParamsSchema.safeParse(req.params);
      const parsedBody = transitionBodySchema.safeParse(req.body);

      if (!parsedParams.success || !parsedBody.success) {
        console.error(
          '[Zod Validation Error - /api/admin/submissions/transition]:',
          parsedParams.error?.format(),
          parsedBody.error?.format()
        );
        return res.status(400).json({ error: 'Invalid request payload or parameters.' });
      }

      const submissionId = parsedParams.data.id;
      const { status: newStatus, notes } = parsedBody.data;

      // Load existing submission
      const { data: submission, error: subErr } = await supabaseAdmin
        .from('submissions')
        .select('*, profiles(display_name, email)')
        .eq('id', submissionId)
        .single();

      if (subErr || !submission) {
        return res.status(404).json({ error: 'Submission not found.' });
      }

      // Validate strict transition order:
      // Pending -> Approved | Rejected
      // Approved -> Live
      // Live -> Completed
      const currentStatus = submission.status;
      let isValidTransition = false;
      if (currentStatus === 'Pending' && (newStatus === 'Approved' || newStatus === 'Rejected')) {
        isValidTransition = true;
      } else if (currentStatus === 'Approved' && newStatus === 'Live') {
        isValidTransition = true;
      } else if (currentStatus === 'Live' && newStatus === 'Completed') {
        isValidTransition = true;
      }

      if (!isValidTransition) {
        return res.status(400).json({
          error: `Invalid transition from '${currentStatus}' to '${newStatus}'. Strict order: Pending -> Approved -> Live -> Completed.`,
        });
      }

      if (newStatus === 'Rejected' && (!notes || !notes.trim())) {
        return res.status(400).json({ error: 'Rejection reason is required.' });
      }

      const updatePayload: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (notes !== undefined) {
        updatePayload.notes = notes;
      }

      const { data: updatedSub, error: updateErr } = await supabaseAdmin
        .from('submissions')
        .update(updatePayload)
        .eq('id', submissionId)
        .select('*, profiles(display_name, email)')
        .single();

      if (updateErr) {
        console.error('[Admin Transition Error]:', updateErr);
        return res.status(500).json({ error: 'Failed to update submission in database.' });
      }

      const artistEmail = updatedSub.profiles?.email || updatedSub.user_email;
      const artistName = updatedSub.profiles?.display_name || updatedSub.artist;

      // Send transactional emails via Resend
      if (artistEmail) {
        if (newStatus === 'Approved') {
          sendArtistSubmissionApprovedEmail({
            artistEmail,
            artistName,
            submission: {
              id: updatedSub.id,
              title: updatedSub.title,
              artist: updatedSub.artist,
              plan: updatedSub.plan,
            },
          }).catch((err) => console.error('[Resend Email Error]:', err));
        } else if (newStatus === 'Rejected') {
          sendArtistSubmissionRejectedEmail({
            artistEmail,
            artistName,
            submission: {
              id: updatedSub.id,
              title: updatedSub.title,
              artist: updatedSub.artist,
              plan: updatedSub.plan,
            },
            reason: notes || updatedSub.notes || 'Curator guidelines not met.',
          }).catch((err) => console.error('[Resend Email Error]:', err));
        } else if (newStatus === 'Completed') {
          sendArtistSubmissionCompletedEmail({
            artistEmail,
            artistName,
            submission: {
              id: updatedSub.id,
              title: updatedSub.title,
              artist: updatedSub.artist,
              plan: updatedSub.plan,
            },
            metrics: {
              delivered_streams: updatedSub.delivered_streams,
              saves_count: updatedSub.saves_count,
              playlists_added: updatedSub.playlists_added,
              notes: updatedSub.notes,
            },
          }).catch((err) => console.error('[Resend Email Error]:', err));
        }
      }

      return res.status(200).json({ success: true, submission: updatedSub });
    } catch (err: any) {
      console.error('[Admin Transition Exception]:', err);
      return res.status(500).json({ error: err?.message || 'Server error during status transition.' });
    }
  });

  // Serve Front-End
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
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
