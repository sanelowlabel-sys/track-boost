import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { Submission, SubmissionFormData, SubmissionStatus, SpotifyItemType } from '../types';

// Environment variables
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Stored credentials if configured via UI
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('jamboost_supabase_url') || '' : '';
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('jamboost_supabase_key') || '' : '';

export const supabaseUrl = envUrl || storedUrl;
export const supabaseAnonKey = envKey || storedKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('https://')
);

// Real Supabase client instance if configured
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

// Initial sample seed data for user submissions
const INITIAL_DEMO_SUBMISSIONS: Submission[] = [
  {
    id: 'sub-001',
    user_id: 'usr-demo-1',
    user_email: 'aikenmusique@gmail.com',
    spotify_url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    spotify_id: '4cOdK2wGLETKBW3PvgPWqT',
    item_type: 'track',
    title: 'Neon Nights (Original Mix)',
    artist: 'The Midnight',
    genre: 'Synthwave / Retro',
    territory: 'North America & Europe',
    plan: 'Pro',
    status: 'Live',
    delivered_streams: 9420,
    target_streams: 15000,
    saves_count: 684,
    playlists_added: 14,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    notes: 'Placed in 14 active editorial & independent curator lists.',
  },
  {
    id: 'sub-002',
    user_id: 'usr-demo-1',
    user_email: 'aikenmusique@gmail.com',
    spotify_url: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    spotify_id: '0VjIjW4GlUZAMYd2vXMi3b',
    item_type: 'track',
    title: 'Blinding Horizons',
    artist: 'Aiken & Friends',
    genre: 'Electronic / Dance',
    territory: 'Global Worldwide',
    plan: 'Viral',
    status: 'Live',
    delivered_streams: 31200,
    target_streams: 50000,
    saves_count: 2150,
    playlists_added: 38,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
    notes: 'Algorithmic trigger detected on Release Radar.',
  },
  {
    id: 'sub-003',
    user_id: 'usr-demo-1',
    user_email: 'aikenmusique@gmail.com',
    spotify_url: 'https://open.spotify.com/album/1xJ43j2oF8Yc7lqO6Wk8Qn',
    spotify_id: '1xJ43j2oF8Yc7lqO6Wk8Qn',
    item_type: 'album',
    title: 'Midnight Echoes EP',
    artist: 'Aiken',
    genre: 'Lo-Fi / Chill Beats',
    territory: 'United States',
    plan: 'Starter',
    status: 'Approved',
    delivered_streams: 420,
    target_streams: 3000,
    saves_count: 55,
    playlists_added: 4,
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    updated_at: new Date().toISOString(),
    notes: 'Approved by curator network. Initial playlist batch queuing.',
  },
  {
    id: 'sub-004',
    user_id: 'usr-demo-1',
    user_email: 'aikenmusique@gmail.com',
    spotify_url: 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp',
    spotify_id: '3n3Ppam7vgaVa1iaRUc9Lp',
    item_type: 'track',
    title: 'Late Night Passenger',
    artist: 'Kavinsky & Aiken',
    genre: 'Synthwave',
    territory: 'Europe',
    plan: 'Starter',
    status: 'Pending',
    delivered_streams: 0,
    target_streams: 3000,
    saves_count: 0,
    playlists_added: 0,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    notes: 'Awaiting curator review queue.',
  },
];

const LOCAL_SUBMISSIONS_KEY = 'jamboost_submissions_data';
const LOCAL_USER_KEY = 'jamboost_auth_user';

// Listeners for Realtime updates
type RealtimeListener = (submissions: Submission[]) => void;
const realtimeListeners: Set<RealtimeListener> = new Set();

export function getLocalSubmissions(): Submission[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_SUBMISSIONS;
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(INITIAL_DEMO_SUBMISSIONS));
      return INITIAL_DEMO_SUBMISSIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_SUBMISSIONS;
  }
}

export function saveLocalSubmissions(subs: Submission[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(subs));
  notifyListeners(subs);
}

function notifyListeners(subs: Submission[]) {
  realtimeListeners.forEach(listener => {
    try {
      listener(subs);
    } catch (e) {
      console.error('Error notifying realtime listener', e);
    }
  });
}

// Subscribe to realtime submission updates
export function subscribeToSubmissions(callback: RealtimeListener): () => void {
  realtimeListeners.add(callback);
  // Send current state immediately
  callback(getLocalSubmissions());

  // Also hook into Supabase Realtime if configured
  let supabaseChannel: ReturnType<SupabaseClient['channel']> | null = null;
  if (supabase) {
    supabaseChannel = supabase
      .channel('public:submissions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        async () => {
          // Fetch refreshed data from Supabase
          const { data } = await supabase!.from('submissions').select('*').order('created_at', { ascending: false });
          if (data && data.length > 0) {
            callback(data as Submission[]);
          }
        }
      )
      .subscribe();
  }

  // Cross-tab synchronization via storage event
  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_SUBMISSIONS_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch {}
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    realtimeListeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}

// Authentication Helpers
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        return {
          id: data.session.user.id,
          email: data.session.user.email || '',
          name: data.session.user.user_metadata?.name || data.session.user.email?.split('@')[0] || 'User',
        };
      }
    } catch (err) {
      console.warn('Supabase getSession error, checking local fallback:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
  }
  return null;
}

export async function signInWithEmail(email: string, pass: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) {
        return { user: null, error: error.message };
      }
      if (data.user) {
        const u: AuthUser = {
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.name || email.split('@')[0],
        };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
        return { user: u, error: null };
      }
    } catch (e: any) {
      console.warn('Supabase sign-in error, using fallback:', e);
    }
  }

  // Local/Fallback Authentication
  if (!email || !email.includes('@')) {
    return { user: null, error: 'Please enter a valid email address.' };
  }
  if (!pass || pass.length < 6) {
    return { user: null, error: 'Password must be at least 6 characters.' };
  }

  const user: AuthUser = {
    id: 'usr-' + Math.random().toString(36).substring(2, 9),
    email,
    name: email.split('@')[0],
  };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  return { user, error: null };
}

export async function signUpWithEmail(email: string, pass: string, name?: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { name: name || email.split('@')[0] },
        },
      });
      if (error) {
        return { user: null, error: error.message };
      }
      if (data.user) {
        const u: AuthUser = {
          id: data.user.id,
          email: data.user.email || email,
          name: name || email.split('@')[0],
        };
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
        return { user: u, error: null };
      }
    } catch (e: any) {
      console.warn('Supabase sign-up error, using fallback:', e);
    }
  }

  if (!email || !email.includes('@')) {
    return { user: null, error: 'Please enter a valid email address.' };
  }
  if (!pass || pass.length < 6) {
    return { user: null, error: 'Password must be at least 6 characters.' };
  }

  const user: AuthUser = {
    id: 'usr-' + Math.random().toString(36).substring(2, 9),
    email,
    name: name || email.split('@')[0],
  };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  return { user, error: null };
}

export async function signOutUser(): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign out error:', e);
    }
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_USER_KEY);
  }
}

// Submission creation and updates
export async function createSubmission(formData: SubmissionFormData, user: AuthUser): Promise<Submission> {
  const newSubmission: Submission = {
    id: 'sub-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
    user_id: user.id,
    user_email: user.email,
    spotify_url: formData.spotify_url,
    spotify_id: extractSpotifyId(formData.spotify_url) || 'spotify-id',
    item_type: formData.item_type,
    title: formData.title,
    artist: formData.artist,
    genre: formData.genre,
    territory: formData.territory,
    plan: formData.plan,
    status: 'Pending',
    delivered_streams: 0,
    target_streams: formData.target_streams,
    saves_count: 0,
    playlists_added: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notes: 'Submitted and queued for curator verification.',
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .insert([newSubmission])
        .select()
        .single();
      if (!error && data) {
        // Also update local cache
        const all = [data as Submission, ...getLocalSubmissions()];
        saveLocalSubmissions(all);
        return data as Submission;
      }
    } catch (err) {
      console.warn('Supabase insert failed, storing locally:', err);
    }
  }

  const all = [newSubmission, ...getLocalSubmissions()];
  saveLocalSubmissions(all);
  return newSubmission;
}

export async function updateSubmissionStatus(id: string, newStatus: SubmissionStatus): Promise<void> {
  const current = getLocalSubmissions();
  const updated = current.map((item) => {
    if (item.id === id) {
      let streams = item.delivered_streams;
      let saves = item.saves_count;
      let playlists = item.playlists_added;

      if (newStatus === 'Live' && streams === 0) {
        streams = Math.floor(item.target_streams * 0.15);
        saves = Math.floor(streams * 0.08);
        playlists = item.plan === 'Viral' ? 12 : item.plan === 'Pro' ? 6 : 2;
      } else if (newStatus === 'Completed') {
        streams = item.target_streams;
        saves = Math.floor(streams * 0.09);
        playlists = item.plan === 'Viral' ? 52 : item.plan === 'Pro' ? 18 : 6;
      }

      return {
        ...item,
        status: newStatus,
        delivered_streams: streams,
        saves_count: saves,
        playlists_added: playlists,
        updated_at: new Date().toISOString(),
      };
    }
    return item;
  });

  saveLocalSubmissions(updated);

  if (supabase) {
    try {
      await supabase
        .from('submissions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (e) {
      console.warn('Supabase status update error:', e);
    }
  }
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
