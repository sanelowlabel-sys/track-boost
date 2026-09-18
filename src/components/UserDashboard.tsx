import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  ExternalLink, 
  Search, 
  TrendingUp, 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Radio, 
  BarChart3, 
  ListMusic, 
  Sparkles, 
  RefreshCw, 
  Music2, 
  Layers, 
  Filter
} from 'lucide-react';
import type { Submission, SubmissionStatus } from '../types';
import { 
  subscribeToSubmissions, 
  updateSubmissionStatus, 
  isSupabaseConfigured, 
  type AuthUser 
} from '../lib/supabase';

interface UserDashboardProps {
  user: AuthUser;
  onOpenWizard: () => void;
  onSignOut: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  onOpenWizard,
  onSignOut,
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [statusFilter, setStatusFilter] = useState<'All' | SubmissionStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [realtimePulse, setRealtimePulse] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Subscribe to Realtime Updates
  useEffect(() => {
    const unsubscribe = subscribeToSubmissions((updatedList) => {
      setSubmissions(updatedList);
      setRealtimePulse(true);
      const timer = setTimeout(() => setRealtimePulse(false), 1200);
      return () => clearTimeout(timer);
    });

    return () => {
      unsubscribe();
    };
  }, []);

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
    const pending = submissions.filter((s) => s.status === 'Pending').length;
    const completed = submissions.filter((s) => s.status === 'Completed').length;
    const rejected = submissions.filter((s) => s.status === 'Rejected').length;
    const totalDelivered = submissions.reduce((acc, curr) => acc + (curr.delivered_streams || 0), 0);
    const totalPlaylists = submissions.reduce((acc, curr) => acc + (curr.playlists_added || 0), 0);
    const totalSaves = submissions.reduce((acc, curr) => acc + (curr.saves_count || 0), 0);
    const approvalRate = total > 0 ? Math.round(((total - rejected) / total) * 100) : 100;

    return {
      total,
      active,
      approved,
      pending,
      completed,
      rejected,
      totalDelivered,
      totalPlaylists,
      totalSaves,
      approvalRate,
    };
  }, [submissions]);

  // Realtime Simulation trigger: advances a pending or live campaign to demonstrate live synchronization
  const handleSimulateRealtimeUpdate = async () => {
    setIsSimulating(true);
    // Find first pending item to approve, or live item to update streams
    const pending = submissions.find((s) => s.status === 'Pending');
    if (pending) {
      await updateSubmissionStatus(pending.id, 'Approved');
    } else {
      const approved = submissions.find((s) => s.status === 'Approved');
      if (approved) {
        await updateSubmissionStatus(approved.id, 'Live');
      } else {
        const live = submissions.find((s) => s.status === 'Live');
        if (live) {
          // Increment live streams
          const nextVal = Math.min(live.target_streams, live.delivered_streams + 1250);
          const newStatus = nextVal >= live.target_streams ? 'Completed' : 'Live';
          await updateSubmissionStatus(live.id, newStatus);
        }
      }
    }
    setTimeout(() => setIsSimulating(false), 500);
  };

  const getStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
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
              <span>{isSupabaseConfigured ? 'Supabase Realtime Live' : 'Realtime Sync Active'}</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            Logged in as <span className="text-white font-medium">{user.email}</span> • Submissions update live across curator networks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSimulateRealtimeUpdate}
            disabled={isSimulating}
            title="Simulate a real-time event trigger from curator/streaming backend"
            className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-2 border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin text-[#82C321]' : ''}`} />
            <span>Simulate Realtime Event</span>
          </button>

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
          <div className="text-xs text-[#82C321] font-medium mt-1">Real-time Verified</div>
        </div>

        <div className="bg-[#181818] border border-white/10 rounded-2xl p-5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Playlist Adds</div>
          <div className="text-3xl font-bold text-white tracking-tight">{stats.totalPlaylists}</div>
          <div className="text-xs text-gray-500 mt-1">Curator Placements</div>
        </div>

        <div className="bg-[#181818] border border-white/10 rounded-2xl p-5 col-span-2 lg:col-span-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Approval Rate</div>
          <div className="text-3xl font-bold text-white tracking-tight">{stats.approvalRate}%</div>
          <div className="text-xs text-gray-500 mt-1">Curator Acceptance</div>
        </div>
      </div>

      {/* Main Submissions Table Section */}
      <div className="bg-[#181818] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        {/* Table Controls (Search & Status Filters) */}
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#121212] p-1.5 rounded-2xl border border-white/5">
            {(['All', 'Live', 'Approved', 'Pending', 'Completed', 'Rejected'] as const).map((tab) => {
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

        {/* Submissions List / Table */}
        {filteredSubmissions.length === 0 ? (
          <div className="py-20 px-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500">
              <Music2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Submissions Found</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
              {searchQuery || statusFilter !== 'All'
                ? 'No campaigns matched your search or status filter. Try clearing filters.'
                : 'You have not submitted any Spotify links yet. Launch your first campaign in minutes!'}
            </p>
            <button
              onClick={onOpenWizard}
              className="h-10 px-5 bg-[#82C321] hover:bg-[#8fd524] text-black text-xs font-bold rounded-xl inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Submit Spotify Link</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#141414] text-xs uppercase tracking-wider text-gray-400 border-b border-white/5">
                <tr>
                  <th className="py-4 px-6 font-semibold">Track / Release</th>
                  <th className="py-4 px-6 font-semibold">Campaign Tier</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                  <th className="py-4 px-6 font-semibold">Streams Progress</th>
                  <th className="py-4 px-6 font-semibold">Playlists</th>
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
                          {sub.target_streams.toLocaleString()} target
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
                            {sub.delivered_streams.toLocaleString()}
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
                        <div className="text-white font-bold">{sub.playlists_added} lists</div>
                        <div className="text-xs text-gray-400">{sub.saves_count} saves</div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
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
                  className="p-1 rounded-full text-gray-400 hover:text-white"
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
                      {selectedSubmission.target_streams.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Delivered Streams</span>
                    <div className="mt-0.5 font-bold text-[#82C321]">
                      {selectedSubmission.delivered_streams.toLocaleString()}
                    </div>
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

                {selectedSubmission.notes && (
                  <div className="p-3 bg-[#121212] rounded-xl border border-white/5 text-xs text-gray-300">
                    <span className="font-semibold text-gray-400 block mb-1">Curator & Algorithmic Notes:</span>
                    {selectedSubmission.notes}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <a
                    href={selectedSubmission.spotify_url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Spotify</span>
                  </a>

                  {/* Advance status button for quick interactive testing */}
                  <button
                    onClick={async () => {
                      const nextStatusMap: Record<SubmissionStatus, SubmissionStatus> = {
                        Pending: 'Approved',
                        Approved: 'Live',
                        Live: 'Completed',
                        Completed: 'Live',
                        Rejected: 'Pending',
                      };
                      const next = nextStatusMap[selectedSubmission.status];
                      await updateSubmissionStatus(selectedSubmission.id, next);
                      setSelectedSubmission({
                        ...selectedSubmission,
                        status: next,
                      });
                    }}
                    className="h-10 px-4 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Advance Status (Test Realtime)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};
