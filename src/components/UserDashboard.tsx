import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  ExternalLink, 
  Search, 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Radio, 
  Music2, 
  CreditCard,
  RefreshCw,
  Loader2,
  ArrowRight,
  X
} from 'lucide-react';
import type { Submission, SubmissionStatus } from '../types';
import { PLANS } from '../types';
import { supabase, type AuthUser } from '../lib/supabase';

interface UserDashboardProps {
  user: AuthUser;
  onOpenWizard: () => void;
  onSignOut: () => void;
}

const FILTER_TABS: ('All' | SubmissionStatus)[] = [
  'All', 
  'Awaiting payment', 
  'Pending', 
  'Approved', 
  'Live', 
  'Completed', 
  'Rejected'
];

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  onOpenWizard,
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | SubmissionStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [realtimePulse, setRealtimePulse] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Payment result banner from return URL (?payment=success / ?payment=cancelled)
  const [paymentBanner, setPaymentBanner] = useState<'success' | 'cancelled' | null>(null);

  // Pay Now Modal State
  const [paySubmission, setPaySubmission] = useState<Submission | null>(null);
  const [payingLoading, setPayingLoading] = useState(false);
  const [payingError, setPayingError] = useState<string | null>(null);

  // Load submissions from Supabase and subscribe to changes filtered by user_id
  const loadSubmissions = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) {
        setError(fetchErr.message || 'Failed to load submissions.');
      } else if (data) {
        setSubmissions(data as Submission[]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();

    // Check URL parameters for payment feedback: ?payment=success or ?payment=cancelled
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get('payment');
      if (paymentStatus === 'success') {
        setPaymentBanner('success');
      } else if (paymentStatus === 'cancelled') {
        setPaymentBanner('cancelled');
      }
    }

    if (!supabase || !user.id) return;

    // Realtime postgres_changes subscription filtered by user_id
    const channel = supabase
      .channel(`submissions-user-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setRealtimePulse(true);
          setTimeout(() => setRealtimePulse(false), 1200);

          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as Submission;
            setSubmissions((prev) => {
              if (prev.some((s) => s.id === newRow.id)) return prev;
              return [newRow, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as Submission;
            setSubmissions((prev) =>
              prev.map((s) => (s.id === updatedRow.id ? { ...s, ...updatedRow } : s))
            );
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as Partial<Submission>;
            if (oldRow?.id) {
              setSubmissions((prev) => prev.filter((s) => s.id !== oldRow.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const dismissPaymentBanner = () => {
    setPaymentBanner(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  };

  const handleStartCheckout = async (sub: Submission) => {
    setPayingLoading(true);
    setPayingError(null);
    try {
      const session = (await supabase?.auth.getSession())?.data.session;
      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ submission_id: sub.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start PayPal checkout.');
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL received from server.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setPayingError(err?.message || 'Error redirecting to PayPal.');
    } finally {
      setPayingLoading(false);
    }
  };

  // Filter submissions by status and search query
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = 
        !q || 
        item.title.toLowerCase().includes(q) || 
        item.artist.toLowerCase().includes(q) || 
        item.genre.toLowerCase().includes(q) ||
        item.spotify_url.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [submissions, statusFilter, searchQuery]);

  // Analytics Metrics
  const stats = useMemo(() => {
    const total = submissions.length;
    const active = submissions.filter((s) => s.status === 'Live').length;
    const approved = submissions.filter((s) => s.status === 'Approved').length;
    const completed = submissions.filter((s) => s.status === 'Completed').length;
    const totalDelivered = submissions.reduce((acc, curr) => acc + (curr.delivered_streams || 0), 0);
    const totalPlaylists = submissions.reduce((acc, curr) => acc + (curr.playlists_added || 0), 0);

    // Approval Rate: (Approved + Live + Completed) / (all submissions except Awaiting payment and Pending)
    const approvedGroup = approved + active + completed;
    const evaluatedTotal = submissions.filter(
      (s) => s.status !== 'Awaiting payment' && s.status !== 'Pending'
    ).length;

    const approvalRate = evaluatedTotal > 0
      ? `${Math.round((approvedGroup / evaluatedTotal) * 100)}%`
      : '-';

    return {
      total,
      active,
      totalDelivered,
      totalPlaylists,
      approvalRate,
    };
  }, [submissions]);

  const getStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case 'Awaiting payment':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <CreditCard className="w-3.5 h-3.5" />
            Awaiting payment
          </span>
        );
      case 'Live':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#82C321]/15 text-[#82C321] border border-[#82C321]/30">
            <span className="w-2 h-2 rounded-full bg-[#82C321] animate-pulse" />
            Live Promotion
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved & Queued
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Curator Review
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            Not Eligible
          </span>
        );
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Payment Result Banner */}
      {paymentBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-5 rounded-3xl border flex items-start justify-between gap-4 shadow-xl ${
            paymentBanner === 'success'
              ? 'bg-[#82C321]/15 border-[#82C321]/40 text-white'
              : 'bg-amber-500/15 border-amber-500/40 text-white'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                paymentBanner === 'success'
                  ? 'bg-[#82C321] text-black'
                  : 'bg-amber-400 text-black'
              }`}
            >
              {paymentBanner === 'success' ? (
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <AlertCircle className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {paymentBanner === 'success'
                  ? 'PayPal Payment Received Successfully'
                  : 'PayPal Checkout Cancelled'}
              </h3>
              <p className="text-xs text-gray-300 mt-1 max-w-2xl leading-relaxed">
                {paymentBanner === 'success'
                  ? 'Thank you! Your payment in USD has been confirmed. Your campaign is advancing to "Pending" (Curator Review) and will update automatically across networks via Supabase realtime.'
                  : 'Your PayPal checkout session was cancelled. Your campaign remains saved in "Awaiting payment" status. Click the "Pay now" button next to your submission at any time to resume checkout.'}
              </p>
            </div>
          </div>
          <button
            onClick={dismissPaymentBanner}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Top Banner / User Welcome Bar */}
      <div className="bg-[#181818] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Artist Campaign Dashboard
            </h1>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                realtimePulse
                  ? 'bg-[#82C321] text-black ring-4 ring-[#82C321]/30'
                  : 'bg-white/5 text-gray-300 border border-white/10'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-[#82C321]" />
              <span>Supabase Realtime Live</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            Logged in as <span className="text-white font-medium">{user.email}</span> • Submissions update live across curator networks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenWizard}
            className="h-11 px-5 rounded-xl bg-[#82C321] hover:bg-[#8fd524] text-black text-sm font-bold flex items-center gap-2 transition-transform hover:scale-[1.02] cursor-pointer shadow-lg shadow-[#82C321]/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Spotify Submission</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#181818] border border-white/10 rounded-2xl p-5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Submissions</div>
          <div className="text-3xl font-bold text-white tracking-tight">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-1">Tracks & Playlists</div>
        </div>

        <div className="bg-[#181818] border border-white/10 rounded-2xl p-5">
          <div className="text-xs font-bold text-[#82C321] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#82C321] animate-ping" />
            Live Campaigns
          </div>
          <div className="text-3xl font-bold text-[#82C321] tracking-tight">{stats.active}</div>
          <div className="text-xs text-gray-400 mt-1">Currently Streaming</div>
        </div>

        <div className="bg-[#181818] border border-white/10 rounded-2xl p-5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Streams Delivered</div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {stats.totalDelivered.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 font-medium mt-1">Reported by JamBoost</div>
        </div>

        <div className="bg-[#181818] border border-white/10 rounded-2xl p-5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Playlist Adds</div>
          <div className="text-3xl font-bold text-white tracking-tight">{stats.totalPlaylists}</div>
          <div className="text-xs text-gray-500 mt-1">Reported by JamBoost</div>
        </div>

        <div className="bg-[#181818] border border-white/10 rounded-2xl p-5 col-span-2 lg:col-span-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Approval Rate</div>
          <div className="text-3xl font-bold text-white tracking-tight">{stats.approvalRate}</div>
          <div className="text-xs text-gray-500 mt-1">Curator Acceptance</div>
        </div>
      </div>

      {/* Main Submissions Table Section */}
      <div className="bg-[#181818] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        {/* Table Controls (Search & Status Filters) */}
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#121212] p-1.5 rounded-2xl border border-white/5">
            {FILTER_TABS.map((tab) => {
              const count = tab === 'All' 
                ? submissions.length 
                : submissions.filter(s => s.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === tab
                      ? 'bg-white text-black font-bold shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      statusFilter === tab ? 'bg-black/10 text-black' : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, artist, genre..."
              className="w-full h-10 pl-9 pr-4 bg-[#121212] border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#82C321] transition-colors"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 px-6 text-center">
            <div className="w-10 h-10 mx-auto mb-4 border-2 border-[#82C321] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading your campaigns...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="py-16 px-6 text-center max-w-md mx-auto">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Failed to Load Campaigns</h3>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">{error}</p>
            <button
              onClick={loadSubmissions}
              className="h-9 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : submissions.length === 0 ? (
          /* Empty State for New Users */
          <div className="py-20 px-6 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-[#82C321]/10 border border-[#82C321]/20 flex items-center justify-center text-[#82C321]">
              <Music2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Campaigns Yet</h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              You haven't launched any promotion campaigns yet. Submit a Spotify track, album, or playlist URL to start pitching directly to independent curators.
            </p>
            <button
              onClick={onOpenWizard}
              className="h-11 px-6 bg-[#82C321] hover:bg-[#8fd524] text-black text-sm font-bold rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-[#82C321]/20 transition-transform hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Launch First Campaign</span>
            </button>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          /* Empty State when search or filter returns 0 */
          <div className="py-16 px-6 text-center max-w-md mx-auto">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Matching Campaigns</h3>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              No campaigns matched your selected filter ({statusFilter}) or search term "{searchQuery}".
            </p>
            <button
              onClick={() => {
                setStatusFilter('All');
                setSearchQuery('');
              }}
              className="h-9 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          /* Submissions Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#141414] text-xs uppercase tracking-wider text-gray-400 border-b border-white/5">
                <tr>
                  <th className="py-4 px-6 font-semibold">Track / Release</th>
                  <th className="py-4 px-6 font-semibold">Campaign Tier</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                  <th className="py-4 px-6 font-semibold">
                    Streams Progress
                    <span className="block text-[10px] text-gray-500 font-normal">Reported by JamBoost</span>
                  </th>
                  <th className="py-4 px-6 font-semibold">
                    Playlists
                    <span className="block text-[10px] text-gray-500 font-normal">Reported by JamBoost</span>
                  </th>
                  <th className="py-4 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSubmissions.map((sub) => {
                  const progressPct = Math.min(
                    100,
                    Math.round(((sub.delivered_streams || 0) / (sub.target_streams || 1)) * 100)
                  );

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Track info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#222] flex items-center justify-center text-white shrink-0 border border-white/5">
                            <Play className="w-4 h-4 fill-white" />
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-[#82C321] transition-colors flex items-center gap-2">
                              <span>{sub.title}</span>
                              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-white/10 text-gray-300">
                                {sub.item_type}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400">
                              {sub.artist} • <span className="text-gray-500">{sub.genre}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tier */}
                      <td className="py-4 px-6">
                        <span className="font-semibold text-white">{sub.plan}</span>
                        <span className="block text-xs text-gray-500">
                          {PLANS[sub.plan]?.curatorsPitched ? `${PLANS[sub.plan].curatorsPitched} curators` : 'Curator Pitch'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {getStatusBadge(sub.status)}
                      </td>

                      {/* Progress */}
                      <td className="py-4 px-6 min-w-[180px]">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-bold text-white">
                            {(sub.delivered_streams || 0).toLocaleString()}
                          </span>
                          <span className="text-gray-400 font-medium">{progressPct}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#222] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              sub.status === 'Completed'
                                ? 'bg-purple-400'
                                : 'bg-[#82C321]'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Playlists & Saves */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="text-white font-bold">{sub.playlists_added || 0} lists</div>
                        <div className="text-xs text-gray-400">{sub.saves_count || 0} saves</div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {sub.status === 'Awaiting payment' && (
                            <button
                              onClick={() => {
                                setPaySubmission(sub);
                                setPayingError(null);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#82C321] hover:bg-[#8fd524] text-black text-xs font-bold inline-flex items-center gap-1.5 transition-transform hover:scale-[1.02] cursor-pointer shadow-sm"
                              title="Complete PayPal payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Pay now</span>
                            </button>
                          )}
                          <a
                            href={sub.spotify_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                            title="Open on Spotify"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedSubmission && (
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#181818] border border-white/10 rounded-3xl p-6 shadow-2xl text-white space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-xl font-bold">Campaign Details</h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-1 rounded-full text-gray-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Song / Release</div>
                  <div className="text-lg font-bold text-white">{selectedSubmission.title}</div>
                  <div className="text-gray-400">{selectedSubmission.artist}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 bg-[#121212] rounded-2xl border border-white/5">
                  <div>
                    <span className="text-xs text-gray-500">Status</span>
                    <div className="mt-1">{getStatusBadge(selectedSubmission.status)}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Plan Tier</span>
                    <div className="mt-1 font-bold text-white">{selectedSubmission.plan}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Target Streams</span>
                    <div className="mt-0.5 font-bold text-white">
                      {selectedSubmission.target_streams?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Delivered Streams</span>
                    <div className="mt-0.5 font-bold text-[#82C321]">
                      {(selectedSubmission.delivered_streams || 0).toLocaleString()}
                    </div>
                    <span className="text-[10px] text-gray-500 block">Reported by JamBoost</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Playlists & Saves</span>
                    <div className="mt-0.5 text-white font-semibold">
                      {selectedSubmission.playlists_added || 0} lists • {selectedSubmission.saves_count || 0} saves
                    </div>
                    <span className="text-[10px] text-gray-500 block">Reported by JamBoost</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Target Territory</span>
                    <div className="mt-0.5 text-gray-300">{selectedSubmission.territory}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Genre Network</span>
                    <div className="mt-0.5 text-gray-300">{selectedSubmission.genre}</div>
                  </div>
                </div>

                <div className="text-[11px] text-gray-500 italic px-1">
                  * Note: Campaign delivery streams, playlist placements, and saves are reported by JamBoost based on campaign tracking and are not Spotify-verified.
                </div>

                {selectedSubmission.notes && (
                  <div className="p-3.5 bg-[#121212] rounded-xl border border-white/5 text-xs text-gray-300">
                    <span className="font-semibold text-gray-400 block mb-1">
                      {selectedSubmission.status === 'Rejected'
                        ? 'Rejection Reason from Curator:'
                        : 'JamBoost Campaign & Curator Notes:'}
                    </span>
                    <p className="leading-relaxed">{selectedSubmission.notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  {selectedSubmission.status === 'Awaiting payment' && (
                    <button
                      onClick={() => {
                        const target = selectedSubmission;
                        setSelectedSubmission(null);
                        setPaySubmission(target);
                        setPayingError(null);
                      }}
                      className="h-10 px-4 bg-[#82C321] hover:bg-[#8fd524] text-black rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-md hover:scale-[1.02] transition-transform"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay now via PayPal</span>
                    </button>
                  )}
                  <a
                    href={selectedSubmission.spotify_url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Spotify</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}

      {/* Pay Now Checkout Confirmation Modal */}
      {paySubmission && (
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#181818] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl text-white space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#82C321]/15 text-[#82C321] flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Complete Campaign Payment</h3>
                </div>
                <button
                  onClick={() => {
                    if (!payingLoading) setPaySubmission(null);
                  }}
                  disabled={payingLoading}
                  className="p-1 rounded-full text-gray-400 hover:text-white cursor-pointer disabled:opacity-40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Release</span>
                <div className="text-base font-bold text-white truncate mt-0.5">{paySubmission.title}</div>
                <div className="text-xs text-gray-400 truncate">{paySubmission.artist}</div>
              </div>

              {/* Price & Currency clearly displayed */}
              <div className="p-4 bg-[#121212] rounded-2xl border border-white/5 space-y-2.5 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Selected Package:</span>
                  <span className="text-white font-semibold">
                    {PLANS[paySubmission.plan]?.name || paySubmission.plan} ({PLANS[paySubmission.plan]?.curatorsPitched || 20} Curators Pitched)
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Currency:</span>
                  <span className="text-white font-semibold">USD (United States Dollars)</span>
                </div>
                <div className="flex justify-between items-center text-gray-400 pt-2.5 border-t border-white/5">
                  <span className="text-white font-bold text-sm">Total Due:</span>
                  <span className="font-extrabold text-[#82C321] text-lg">
                    {PLANS[paySubmission.plan]?.priceDisplay || '$89'} USD
                  </span>
                </div>
              </div>

              {/* Link to refund policy at /refunds */}
              <div className="text-xs text-gray-400 leading-relaxed">
                Backed by our 100% Curator Rejection Guarantee. Review our{' '}
                <a
                  href="/refunds"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#82C321] underline hover:text-[#8fd524] font-semibold"
                >
                  Refund Policy at /refunds
                </a>
                .
              </div>

              {payingError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{payingError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPaySubmission(null)}
                  disabled={payingLoading}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStartCheckout(paySubmission)}
                  disabled={payingLoading}
                  className="h-11 px-6 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] shadow-lg shadow-[#82C321]/20 disabled:opacity-50"
                >
                  {payingLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting PayPal...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay {PLANS[paySubmission.plan]?.priceDisplay || '$89'} USD</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};
