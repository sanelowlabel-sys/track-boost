import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Submission, SubmissionFormData, SpotifyItemType } from '../types';

// Environment variables for Supabase configuration
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabaseUrl = envUrl.trim();
export const supabaseAnonKey = envKey.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://')
);

// Real Supabase client instance
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// User session types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface SignUpResult {
  user: AuthUser | null;
  needsEmailConfirmation: boolean;
  error: string | null;
}

// Friendly Supabase error message formatter
export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const msg = typeof error === 'string' ? error : error.message || '';
  const lower = msg.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'Invalid email or password. Please verify your credentials and try again.';
  }
  if (
    lower.includes('user already registered') || 
    lower.includes('email already in use') || 
    lower.includes('already exists')
  ) {
    return 'This email address is already registered. Please sign in instead.';
  }
  if (
    lower.includes('too many requests') || 
    lower.includes('rate limit') || 
    lower.includes('over_email_send_rate_limit')
  ) {
    return 'Too many attempts. Please wait a few moments before trying again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Your email address has not been confirmed yet. Please check your inbox for the confirmation email.';
  }
  if (lower.includes('password should be at least')) {
    return 'Password must be at least 10 characters long.';
  }
  if (lower.includes('user not found')) {
    return 'No account was found with that email address.';
  }
  return msg || 'Authentication request failed. Please try again.';
}

// Auth Actions with Turnstile & Per-IP Server Rate Limiting
export async function checkAuthRateLimit(action: 'signup' | 'reset' | 'signin'): Promise<{ allowed: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/auth/rate-limit-check?action=${action}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { allowed: false, error: data.error || 'Too many attempts. Please try again later.' };
    }
    return { allowed: true };
  } catch {
    // If endpoint is not reachable, do not hard-block auth
    return { allowed: true };
  }
}

export async function signInWithEmail(
  email: string, 
  pass: string,
  captchaToken?: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!supabase) {
    return { user: null, error: 'Database service is not configured.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) {
      return { user: null, error: formatAuthError(error) };
    }
    if (data.user) {
      return {
        user: {
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.name || email.split('@')[0],
        },
        error: null,
      };
    }
    return { user: null, error: 'Sign in failed.' };
  } catch (err: any) {
    return { user: null, error: formatAuthError(err) };
  }
}

export async function signUpWithEmail(
  email: string, 
  pass: string, 
  name?: string,
  captchaToken?: string
): Promise<SignUpResult> {
  if (!supabase) {
    return { user: null, needsEmailConfirmation: false, error: 'Database service is not configured.' };
  }

  // Enforce server-side 5 per hour per-IP rate limit
  const rateCheck = await checkAuthRateLimit('signup');
  if (!rateCheck.allowed) {
    return { user: null, needsEmailConfirmation: false, error: rateCheck.error || 'Too many attempts. Please try again later.' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { name: name || email.split('@')[0] },
        captchaToken: captchaToken || undefined,
      },
    });

    if (error) {
      return { user: null, needsEmailConfirmation: false, error: formatAuthError(error) };
    }

    if (data.user) {
      const u: AuthUser = {
        id: data.user.id,
        email: data.user.email || email,
        name: data.user.user_metadata?.name || email.split('@')[0],
      };
      // If no active session was created, email confirmation is required by Supabase
      const needsEmailConfirmation = !data.session;
      return {
        user: needsEmailConfirmation ? null : u,
        needsEmailConfirmation,
        error: null,
      };
    }

    return { user: null, needsEmailConfirmation: false, error: 'Registration failed.' };
  } catch (err: any) {
    return { user: null, needsEmailConfirmation: false, error: formatAuthError(err) };
  }
}

export async function resetPasswordForEmail(email: string): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'Database service is not configured.' };
  }

  // Enforce server-side 5 per hour per-IP rate limit
  const rateCheck = await checkAuthRateLimit('reset');
  if (!rateCheck.allowed) {
    return { error: rateCheck.error || 'Too many attempts. Please try again later.' };
  }

  try {
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      return { error: formatAuthError(error) };
    }
    return { error: null };
  } catch (err: any) {
    return { error: formatAuthError(err) };
  }
}

export async function updateUserPassword(newPassword: string): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'Database service is not configured.' };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      return { error: formatAuthError(error) };
    }
    return { error: null };
  } catch (err: any) {
    return { error: formatAuthError(err) };
  }
}

export async function signOutUser(): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Supabase sign out error:', e);
    }
  }
}

// Submission Creation: Only inserts allowed client fields
// spotify_url, spotify_id, item_type, title, artist, genre, territory, plan, target_streams
export async function createSubmission(formData: SubmissionFormData): Promise<Submission> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const payload = {
    spotify_url: formData.spotify_url,
    spotify_id: extractSpotifyId(formData.spotify_url) || formData.spotify_url,
    item_type: formData.item_type,
    title: formData.title,
    artist: formData.artist,
    genre: formData.genre,
    territory: formData.territory,
    plan: formData.plan,
    target_streams: formData.target_streams,
    image_url: formData.image_url || null,
  };

  const { data, error } = await supabase
    .from('submissions')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to submit campaign.');
  }

  return data as Submission;
}

// Spotify Link Parser Helper
export function extractSpotifyId(url: string): string | null {
  try {
    const cleaned = url.trim();
    // open.spotify.com/track/xxxx?si=...
    const match = cleaned.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
    if (match && match[2]) return match[2];
    // spotify:track:xxxx
    const uriMatch = cleaned.match(/spotify:(track|album|playlist):([a-zA-Z0-9]+)/);
    if (uriMatch && uriMatch[2]) return uriMatch[2];
    return null;
  } catch {
    return null;
  }
}

export function detectSpotifyType(url: string): SpotifyItemType | null {
  const cleaned = url.trim().toLowerCase();
  if (cleaned.includes('/track/') || cleaned.includes(':track:')) return 'track';
  if (cleaned.includes('/album/') || cleaned.includes(':album:')) return 'album';
  if (cleaned.includes('/playlist/') || cleaned.includes(':playlist:')) return 'playlist';
  return null;
}
