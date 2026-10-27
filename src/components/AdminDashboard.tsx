import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Search, 
  ExternalLink, 
  Clock, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  RefreshCw, 
  Music2, 
  DollarSign, 
  Check, 
  X, 
  Save, 
  Sliders, 
  Calendar, 
  User, 
  CreditCard,
  TrendingUp,
  Loader2,
  ChevronRight,
  Filter
} from 'lucide-react';
import type { Submission, SubmissionStatus, CampaignTier } from '../types';
import { supabase, type AuthUser } from '../lib/supabase';
import { PLANS } from '../types';

interface AdminDashboardProps {
  currentUser: AuthUser;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | SubmissionStatus>('All');
  const [planFilter, setPlanFilter] = useState<'All' | CampaignTier>('All');

  // Realtime pulse
  const [realtimePulse, setRealtimePulse] = useState(false);

  // Summary strip data
  const [totalPaidThisMonth, setTotalPaidThisMonth] = useState<number>(0);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Selected Submission for Detail / Edit Modal
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Modal State for Manual Metrics Form
  const [editStreams, setEditStreams] = useState<number>(0);
  const [editSaves, setEditSaves] = useState<number>(0);
  const [editPlaylists, setEditPlaylists] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Modal State for Rejection Prompt
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  // State Transition Loading
  const [transitioning, setTransitioning] = useState(false);

  // Artwork cache for submissions (url -> artworkUrl)
  const [artworkMap, setArtworkMap] = useState<Record<string, string>>({});

  // 1. Load summary payments for current month
  const loadMonthlyPayments = async () => {
    if (!supabase) return;
    setPaymentsLoading(true);
    try {
      const now = new Date();
      // First day of current month in UTC
      const firstDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString();

      const { data, error: payErr } = await supabase
        .from('payments')
        .select('amount_cents, status, created_at')
        .eq('status', 'completed')
        .gte('created_at', firstDay);

      if (payErr) {
        console.warn('Error fetching monthly payments:', payErr);
      } else if (data) {
        const sumCents = data.reduce((acc, curr) => acc + (curr.amount_cents || 0), 0);
        setTotalPaidThisMonth(sumCents / 100);
      }
    } catch (err) {
      console.warn('Monthly payments calculation error:', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // 2. Load all submissions across users + join profiles
  const loadSubmissions = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    try {
      // First attempt to fetch with PostgREST join on profiles
      let subsData: any[] | null = null;
      let profilesMap: Record<string, { display_name?: string; email?: string }> = {};

      const { data: joinedData, error: joinErr } = await supabase
        .from('submissions')
        .select('*, profiles:user_id(display_name, email)')
        .order('created_at', { ascending: false });

      if (!joinErr && joinedData) {
        subsData = joinedData;
      } else {
        // Fallback: fetch submissions and profiles separately to guarantee resilience
        const { data: rawSubs, error: subsErr } = await supabase
          .from('submissions')
          .select('*')
          .order('created_at', { ascending: false });

        if (subsErr) {
          throw subsErr;
        }

        subsData = rawSubs || [];

        // Fetch profiles
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, email');

        if (profilesData) {
          profilesData.forEach((p) => {
            profilesMap[p.id] = { display_name: p.display_name, email: p.email };
          });
        }
      }

      const formatted: Submission[] = (subsData || []).map((sub: any) => {
        const prof = sub.profiles || (profilesMap[sub.user_id] ? profilesMap[sub.user_id] : null);
        return {
          ...sub,
          profiles: prof,
          display_name: prof?.display_name || sub.user_email || 'Artist',
        };
      });

      setSubmissions(formatted);
    } catch (err: any) {
      console.error('Error loading admin submissions:', err);
      setError(err?.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
    loadMonthlyPayments();

    if (!supabase) return;

    // Realtime postgres_changes subscription across all submissions
    const channel = supabase
      .channel('admin-submissions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
        },
        async (payload) => {
          setRealtimePulse(true);
          setTimeout(() => setRealtimePulse(false), 1200);

          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as Submission;
            // Fetch profile for newly inserted row
            let prof: any = null;
            try {
              const { data: p } = await supabase!
                .from('profiles')
                .select('display_name, email')
                .eq('id', newRow.user_id)
                .maybeSingle();
              prof = p;
            } catch {
              // ignore
            }
            const formattedRow: Submission = {
              ...newRow,
              profiles: prof,
              display_name: prof?.display_name || newRow.user_email || 'Artist',
            };

            setSubmissions((prev) => [formattedRow, ...prev.filter((s) => s.id !== newRow.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as Submission;
            setSubmissions((prev) =>
              prev.map((s) => {
                if (s.id === updatedRow.id) {
                  return {
                    ...s,
                    ...updatedRow,
                    profiles: s.profiles, // preserve joined profile info
                    display_name: s.display_name,
                  };
                }
                return s;
              })
            );

            // If updated row is currently opened in modal, update modal view too
            setSelectedSubmission((prev) => {
              if (prev && prev.id === updatedRow.id) {
                return {
                  ...prev,
                  ...updatedRow,
                  profiles: prev.profiles,
                  display_name: prev.display_name,
                };
              }
              return prev;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as Partial<Submission>;
            if (oldRow?.id) {
              setSubmissions((prev) => prev.filter((s) => s.id !== oldRow.id));
              setSelectedSubmission((prev) => (prev?.id === oldRow.id ? null : prev));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // When a submission is selected for the detail modal, initialize manual metrics & fetch artwork if needed
  useEffect(() => {
    if (selectedSubmission) {
      setEditStreams(selectedSubmission.delivered_streams || 0);
      setEditSaves(selectedSubmission.saves_count || 0);
      setEditPlaylists(selectedSubmission.playlists_added || 0);
      setEditNotes(selectedSubmission.notes || '');
      setSaveSuccessMsg(null);
      setSaveErrorMsg(null);
      setIsRejectOpen(false);
      setRejectReason('');
      setRejectError(null);

      // Fetch cover art via /api/spotify/lookup if not yet cached
      if (
        !selectedSubmission.image_url &&
        !selectedSubmission.cover_image_url &&
        !artworkMap[selectedSubmission.spotify_url]
      ) {
        fetchCoverArt(selectedSubmission.spotify_url);
      }
    }
  }, [selectedSubmission?.id]);

  const fetchCoverArt = async (spotifyUrl: string) => {
    try {
      const session = (await supabase?.auth.getSession())?.data.session;
      if (!session?.access_token) return;

      const res = await fetch(`/api/spotify/lookup?url=${encodeURIComponent(spotifyUrl)}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.image_url) {
          setArtworkMap((prev) => ({ ...prev, [spotifyUrl]: data.image_url }));
        }
      }
    } catch (err) {
      // Non-critical artwork fallback
      console.warn('Cover art lookup error:', err);
    }
  };

  // Summary Metrics calculations
  const awaitingReviewCount = useMemo(() => {
    return submissions.filter((s) => s.status === 'Pending').length;
  }, [submissions]);

  const liveCampaignsCount = useMemo(() => {
    return submissions.filter((s) => s.status === 'Live').length;
  }, [submissions]);

  // Filtered submissions list
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      const matchesPlan = planFilter === 'All' || item.plan === planFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.artist.toLowerCase().includes(q) ||
        item.genre.toLowerCase().includes(q) ||
        item.spotify_url.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.display_name && item.display_name.toLowerCase().includes(q)) ||
        (item.profiles?.email && item.profiles.email.toLowerCase().includes(q));

      return matchesStatus && matchesPlan && matchesQuery;
    });
  }, [submissions, statusFilter, planFilter, searchQuery]);

  // Strict Ordered State Transition Handlers
  // Order: Pending -> Approved -> Live -> Completed (or Pending -> Rejected with required reason)
  const handleTransitionStatus = async (newStatus: SubmissionStatus, requiredNotes?: string) => {
    if (!supabase || !selectedSubmission) return;

    // Validate permitted transitions
    const currentStatus = selectedSubmission.status;
    let isValid = false;

    if (currentStatus === 'Pending' && (newStatus === 'Approved' || newStatus === 'Rejected')) {
      isValid = true;
    } else if (currentStatus === 'Approved' && newStatus === 'Live') {
      isValid = true;
    } else if (currentStatus === 'Live' && newStatus === 'Completed') {
      isValid = true;
    }

    if (!isValid) {
      alert(`Invalid transition: Cannot move from ${currentStatus} to ${newStatus}. Transitions must strictly follow: Pending -> Approved -> Live -> Completed.`);
      return;
    }

    setTransitioning(true);
    try {
      const updatePayload: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (requiredNotes !== undefined) {
        updatePayload.notes = requiredNotes;
      }

      const { data, error: updateErr } = await supabase
        .from('submissions')
        .update(updatePayload)
        .eq('id', selectedSubmission.id)
        .select()
        .single();

      if (updateErr) {
        throw updateErr;
      }

      // Update local state
      const updatedSub = { ...selectedSubmission, ...updatePayload };
      setSelectedSubmission(updatedSub);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === selectedSubmission.id ? { ...s, ...updatePayload } : s))
      );
      setSaveSuccessMsg(`Campaign successfully moved to "${newStatus}".`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Status transition error:', err);
      setSaveErrorMsg(err?.message || 'Failed to update campaign status.');
      setTimeout(() => setSaveErrorMsg(null), 4000);
    } finally {
      setTransitioning(false);
    }
  };

  // Rejection with mandatory reason
  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError('Rejection reason is required and will be shown to the artist.');
      return;
    }

    setRejecting(true);
    setRejectError(null);
    try {
      await handleTransitionStatus('Rejected', rejectReason.trim());
      setIsRejectOpen(false);
      setRejectReason('');
    } catch (err: any) {
      setRejectError(err?.message || 'Failed to reject campaign.');
    } finally {
      setRejecting(false);
    }
  };

  // Save Manual Results / Metrics by Hand
  const handleSaveMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selectedSubmission) return;

    setSavingMetrics(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    const payload = {
      delivered_streams: Number(editStreams) || 0,
      saves_count: Number(editSaves) || 0,
      playlists_added: Number(editPlaylists) || 0,
      notes: editNotes.trim(),
      updated_at: new Date().toISOString(), // Update updated_at on every change
    };

    try {
      const { error: updateErr } = await supabase
        .from('submissions')
        .update(payload)
        .eq('id', selectedSubmission.id);

      if (updateErr) {
        throw updateErr;
      }

      const updatedSub = { ...selectedSubmission, ...payload };
      setSelectedSubmission(updatedSub);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === selectedSubmission.id ? { ...s, ...payload } : s))
      );

      setSaveSuccessMsg('Campaign metrics and curator notes saved successfully.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error saving metrics:', err);
      setSaveErrorMsg(err?.message || 'Failed to save metrics.');
    } finally {
      setSavingMetrics(false);
    }
  };

  const getStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case 'Awaiting payment':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <CreditCard className="w-3 h-3" />
            Awaiting payment
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            Pending Review
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'Live':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#82C321]/15 text-[#82C321] border border-[#82C321]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#82C321] animate-ping" />
            Live Campaign
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            <AlertCircle className="w-3 h-3" />
            Rejected
          </span>
        );
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Admin Header Strip */}
      <div className="bg-[#181818] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#82C321]/15 border border-[#82C321]/30 flex items-center justify-center text-[#82C321]">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              JamBoost Admin Area
            </h1>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                realtimePulse
                  ? 'bg-[#82C321] text-black ring-4 ring-[#82C321]/30'
                  : 'bg-white/5 text-gray-300 border border-white/10'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-[#82C321]" />
              <span>Realtime Sync</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            Curator & Operations Console • Submissions management, review pipeline, and manual stream metric delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadSubmissions();
              loadMonthlyPayments();
            }}
            className="h-10 px-4 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Summary Strip at the top */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Submissions awaiting review */}
        <div className="bg-[#181818] border border-white/10 rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Awaiting Review
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/20">
              Needs Action
            </span>
          </div>
          <div className="text-4xl font-extrabold text-white tracking-tight mb-1">
            {awaitingReviewCount}
          </div>
          <p className="text-xs text-gray-400">
            Pending submissions requiring curator review or approval.
          </p>
        </div>

        {/* Live campaigns */}
        <div className="bg-[#181818] border border-white/10 rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#82C321] uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Live Campaigns
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#82C321]/10 text-[#82C321] border border-[#82C321]/20">
              Active Now
            </span>
          </div>
          <div className="text-4xl font-extrabold text-[#82C321] tracking-tight mb-1">
            {liveCampaignsCount}
          </div>
          <p className="text-xs text-gray-400">
            Campaigns currently active on curator playlists.
          </p>
        </div>

        {/* Total paid this month */}
        <div className="bg-[#181818] border border-white/10 rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Total Paid This Month
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-400/10 text-blue-300 border border-blue-400/20">
              USD Revenue
            </span>
          </div>
          <div className="text-4xl font-extrabold text-white tracking-tight mb-1">
            {paymentsLoading ? (
              <span className="text-2xl text-gray-500 font-normal">Loading...</span>
            ) : (
              `$${totalPaidThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            )}
          </div>
          <p className="text-xs text-gray-400">
            Completed payments received in {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}.
          </p>
        </div>
      </div>

      {/* Main Submissions Table Card */}
      <div className="bg-[#181818] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Table Controls (Search, Status Filter, Plan Filter) */}
        <div className="p-6 border-b border-white/5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Status Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#121212] p-1.5 rounded-2xl border border-white/5">
              {(['All', 'Pending', 'Approved', 'Live', 'Completed', 'Rejected', 'Awaiting payment'] as const).map(
                (tab) => {
                  const count =
                    tab === 'All'
                      ? submissions.length
                      : submissions.filter((s) => s.status === tab).length;
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
                          statusFilter === tab
                            ? 'bg-black/10 text-black font-bold'
                            : 'bg-white/10 text-gray-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            {/* Plan Filter & Search Input */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Plan dropdown */}
              <div className="flex items-center gap-2 bg-[#121212] px-3 py-2 rounded-xl border border-white/10 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-400">Plan:</span>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value as any)}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-semibold"
                >
                  <option value="All" className="bg-[#181818] text-white">All Plans</option>
                  <option value="Starter" className="bg-[#181818] text-white">Starter ($29)</option>
                  <option value="Pro" className="bg-[#181818] text-white">Pro ($89)</option>
                  <option value="Viral" className="bg-[#181818] text-white">Viral ($249)</option>
                </select>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search release, artist, user..."
                  className="w-full h-10 pl-9 pr-4 bg-[#121212] border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#82C321] transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-24 px-6 text-center">
            <div className="w-10 h-10 mx-auto mb-4 border-2 border-[#82C321] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading submissions across all users...</p>
          </div>
        ) : error ? (
          <div className="py-16 px-6 text-center max-w-md mx-auto">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Failed to Load Submissions</h3>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">{error}</p>
            <button
              onClick={loadSubmissions}
              className="h-9 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="py-16 px-6 text-center max-w-md mx-auto">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Submissions Found</h3>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              No submissions match the current filter criteria (Status: {statusFilter}, Plan: {planFilter}).
            </p>
            <button
              onClick={() => {
                setStatusFilter('All');
                setPlanFilter('All');
                setSearchQuery('');
              }}
              className="h-9 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#141414] text-xs uppercase tracking-wider text-gray-400 border-b border-white/5">
                <tr>
                  <th className="py-4 px-6 font-semibold">Release</th>
                  <th className="py-4 px-6 font-semibold">Artist / User</th>
                  <th className="py-4 px-6 font-semibold">Plan</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                  <th className="py-4 px-6 font-semibold">Reported Streams</th>
                  <th className="py-4 px-6 font-semibold">Date Submitted</th>
                  <th className="py-4 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSubmissions.map((sub) => {
                  const cover = artworkMap[sub.spotify_url] || sub.image_url || sub.cover_image_url;

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      onClick={() => setSelectedSubmission(sub)}
                    >
                      {/* Release */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {cover ? (
                            <img
                              src={cover}
                              alt={sub.title}
                              className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/10"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#222] flex items-center justify-center text-white shrink-0 border border-white/5">
                              <Music2 className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-white group-hover:text-[#82C321] transition-colors flex items-center gap-2 truncate">
                              <span className="truncate">{sub.title}</span>
                              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-white/10 text-gray-300 shrink-0">
                                {sub.item_type}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              {sub.artist} • <span className="text-gray-500">{sub.genre}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* User / Submitter */}
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white truncate max-w-[150px]">
                          {sub.profiles?.display_name || sub.display_name || 'Artist'}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px]">
                          {sub.profiles?.email || sub.user_email || '—'}
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="font-bold text-white">{sub.plan}</span>
                        <div className="text-xs text-gray-400">
                          {PLANS[sub.plan]?.priceDisplay || '$89'} USD
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {getStatusBadge(sub.status)}
                      </td>

                      {/* Reported Streams Progress */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-bold text-white">
                          {(sub.delivered_streams || 0).toLocaleString()}{' '}
                          <span className="text-xs font-normal text-gray-500">
                            / {(sub.target_streams || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {sub.playlists_added || 0} lists • {sub.saves_count || 0} saves
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-xs text-gray-400 whitespace-nowrap">
                        {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '—'}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="px-3 py-1.5 bg-[#82C321] hover:bg-[#8fd524] text-black text-xs font-bold rounded-xl transition-transform hover:scale-[1.02] cursor-pointer shadow-sm"
                          >
                            Manage
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

      {/* DETAIL / EDIT / STATUS TRANSITION MODAL */}
      {selectedSubmission && (
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-3xl bg-[#181818] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-white max-h-[92vh] flex flex-col space-y-6"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#82C321]/20 text-[#82C321] text-xs font-bold uppercase tracking-wider">
                    Admin Campaign Review
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    ID: {selectedSubmission.id.slice(0, 8)}...
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                {/* Release Card with Cover Art, Spotify Link, Artist, Genre, Territory, Plan, Payment Status */}
                <div className="p-5 bg-[#121212] rounded-2xl border border-white/5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    {artworkMap[selectedSubmission.spotify_url] || selectedSubmission.image_url || selectedSubmission.cover_image_url ? (
                      <img
                        src={artworkMap[selectedSubmission.spotify_url] || selectedSubmission.image_url || selectedSubmission.cover_image_url}
                        alt={selectedSubmission.title}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shrink-0 border border-white/10 shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <Music2 className="w-8 h-8 text-gray-500" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[#82C321] uppercase tracking-wider">
                          Spotify {selectedSubmission.item_type}
                        </span>
                        <span className="text-gray-500 text-xs">•</span>
                        <span className="text-xs text-gray-400">
                          {selectedSubmission.genre}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-white truncate">
                        {selectedSubmission.title}
                      </h2>
                      <p className="text-sm text-gray-400 font-medium truncate">
                        By {selectedSubmission.artist}
                      </p>

                      <div className="mt-2.5 flex items-center gap-3">
                        <a
                          href={selectedSubmission.spotify_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[#82C321] hover:underline font-semibold"
                        >
                          <span>Open in Spotify</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/5 text-xs">
                    <div>
                      <span className="text-gray-500">Artist / Submitter:</span>
                      <p className="font-semibold text-white mt-0.5 truncate">
                        {selectedSubmission.profiles?.display_name || selectedSubmission.display_name || 'Artist'}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {selectedSubmission.profiles?.email || selectedSubmission.user_email || '—'}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500">Campaign Tier:</span>
                      <p className="font-semibold text-white mt-0.5">
                        {selectedSubmission.plan} ({PLANS[selectedSubmission.plan]?.priceDisplay || '$89'} USD)
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Target: {selectedSubmission.target_streams?.toLocaleString()} streams
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500">Territory:</span>
                      <p className="font-semibold text-white mt-0.5">
                        {selectedSubmission.territory || 'Global Worldwide'}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-500">Payment Status:</span>
                      <div className="mt-1">
                        {selectedSubmission.status === 'Awaiting payment' ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                            <Clock className="w-3 h-3" /> Unpaid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#82C321] font-bold">
                            <Check className="w-3 h-3 stroke-[3]" /> Paid (PayPal USD)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Transitions Section */}
                <div className="p-5 bg-[#121212] rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Workflow Status Progression
                      </h3>
                      <p className="text-xs text-gray-400">
                        Strict workflow ordering: Pending → Approved → Live → Completed (or Reject with required reason).
                      </p>
                    </div>
                    <div>{getStatusBadge(selectedSubmission.status)}</div>
                  </div>

                  {/* Transition Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    {/* If Pending: Approve (Pending -> Approved) or Reject (Pending -> Rejected) */}
                    {selectedSubmission.status === 'Pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTransitionStatus('Approved')}
                          disabled={transitioning}
                          className="h-10 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] disabled:opacity-50 shadow-md"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve Campaign (Pending → Approved)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsRejectOpen(true);
                            setRejectError(null);
                          }}
                          disabled={transitioning}
                          className="h-10 px-5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject Campaign...</span>
                        </button>
                      </>
                    )}

                    {/* If Approved: Mark Live (Approved -> Live) */}
                    {selectedSubmission.status === 'Approved' && (
                      <button
                        type="button"
                        onClick={() => handleTransitionStatus('Live')}
                        disabled={transitioning}
                        className="h-10 px-5 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] disabled:opacity-50 shadow-lg shadow-[#82C321]/20"
                      >
                        <Radio className="w-4 h-4" />
                        <span>Mark Live (Approved → Live)</span>
                      </button>
                    )}

                    {/* If Live: Mark Completed (Live -> Completed) */}
                    {selectedSubmission.status === 'Live' && (
                      <button
                        type="button"
                        onClick={() => handleTransitionStatus('Completed')}
                        disabled={transitioning}
                        className="h-10 px-5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] disabled:opacity-50 shadow-md"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Completed (Live → Completed)</span>
                      </button>
                    )}

                    {selectedSubmission.status === 'Completed' && (
                      <div className="text-xs text-purple-400 font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Campaign completed and fulfilled.</span>
                      </div>
                    )}

                    {selectedSubmission.status === 'Rejected' && (
                      <div className="text-xs text-red-400 font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Campaign was rejected. Rejection reason shown below.</span>
                      </div>
                    )}

                    {selectedSubmission.status === 'Awaiting payment' && (
                      <div className="text-xs text-amber-400 font-semibold flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Awaiting artist checkout via PayPal before review.</span>
                      </div>
                    )}
                  </div>

                  {/* Rejection Prompt Box (Mandatory reason shown to artist) */}
                  {isRejectOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-950/30 border border-red-500/40 rounded-2xl space-y-3 mt-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Rejection Reason (Required)
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsRejectOpen(false)}
                          className="text-gray-400 hover:text-white text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <p className="text-xs text-gray-300">
                        This reason will be saved in the <code className="text-red-300 font-mono">notes</code> field and displayed directly to the artist on their dashboard.
                      </p>

                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g., Track audio quality does not meet curator broadcast guidelines, or release is explicit without appropriate tagging."
                        rows={3}
                        className="w-full p-3 bg-[#181818] border border-red-500/30 rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500"
                        required
                      />

                      {rejectError && (
                        <div className="text-xs text-red-400 font-medium">{rejectError}</div>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsRejectOpen(false)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmReject}
                          disabled={rejecting || !rejectReason.trim()}
                          className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-40"
                        >
                          {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Record Results By Hand (Manual Metrics) */}
                <form onSubmit={handleSaveMetrics} className="p-5 bg-[#121212] rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-[#82C321]" />
                        <span>Record Results by Hand</span>
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Admin manual campaign metrics. Labeled as "reported by JamBoost" on the artist dashboard.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Delivered Streams
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editStreams}
                        onChange={(e) => setEditStreams(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full h-11 px-3.5 bg-[#181818] border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-[#82C321]"
                      />
                      <span className="text-[11px] text-gray-500 mt-1 block">
                        Target: {selectedSubmission.target_streams?.toLocaleString()} streams
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Playlists Added
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editPlaylists}
                        onChange={(e) => setEditPlaylists(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full h-11 px-3.5 bg-[#181818] border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-[#82C321]"
                      />
                      <span className="text-[11px] text-gray-500 mt-1 block">
                        Active curator placements
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Saves Count
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editSaves}
                        onChange={(e) => setEditSaves(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full h-11 px-3.5 bg-[#181818] border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-[#82C321]"
                      />
                      <span className="text-[11px] text-gray-500 mt-1 block">
                        Reported listener saves
                      </span>
                    </div>
                  </div>

                  {/* Notes Field */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Campaign Notes & Curator Feedback (Visible to Artist)
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      placeholder="Add notes for the artist on curator reviews, playlist names, or rejection feedback..."
                      className="w-full p-3 bg-[#181818] border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#82C321]"
                    />
                  </div>

                  {/* Feedback alerts */}
                  {saveSuccessMsg && (
                    <div className="p-3 bg-[#82C321]/15 border border-[#82C321]/30 rounded-xl text-xs text-[#82C321] flex items-center gap-2">
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{saveSuccessMsg}</span>
                    </div>
                  )}

                  {saveErrorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{saveErrorMsg}</span>
                    </div>
                  )}

                  {/* Save button & timestamp */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                    <div className="text-[11px] text-gray-500">
                      Last updated:{' '}
                      <span className="text-gray-400 font-mono">
                        {selectedSubmission.updated_at
                          ? new Date(selectedSubmission.updated_at).toLocaleString()
                          : '—'}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={savingMetrics}
                      className="h-11 px-6 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] shadow-md disabled:opacity-50"
                    >
                      {savingMetrics ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Metrics & Notes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};
