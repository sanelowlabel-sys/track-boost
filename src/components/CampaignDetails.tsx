import React, { useState } from 'react';
import { Campaign, CuratorPitch } from '../types';
import { api } from '../services/api';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Flame,
  Radio,
  Bookmark,
  Users,
  Play,
  RotateCw,
  Sparkles,
  ArrowLeft,
  Headphones,
  Check,
  XCircle,
  TrendingUp,
  Award,
} from 'lucide-react';

interface CampaignDetailsProps {
  campaign: Campaign;
  onBack: () => void;
  onCampaignUpdated: (updated: Campaign) => void;
}

export const CampaignDetails: React.FC<CampaignDetailsProps> = ({
  campaign,
  onBack,
  onCampaignUpdated,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleSimulateStep = async () => {
    setIsSimulating(true);
    try {
      const updated = await api.simulateCampaignStep(campaign.id);
      onCampaignUpdated(updated);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredPitches = campaign.curatorPitches.filter(p => {
    if (filterStatus === 'all') return true;
    return p.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const placedPitches = campaign.curatorPitches.filter(p => p.status === 'Placed');
  const inReviewPitches = campaign.curatorPitches.filter(p => p.status === 'In Review');
  const pendingPitches = campaign.curatorPitches.filter(p => p.status === 'Pending');
  const declinedPitches = campaign.curatorPitches.filter(p => p.status === 'Declined');

  const savesPct = campaign.addons.saves > 0
    ? Math.min(100, Math.round((campaign.savesDelivered / campaign.addons.saves) * 100))
    : 100;

  const followsPct = campaign.addons.follows > 0
    ? Math.min(100, Math.round((campaign.followsDelivered / campaign.addons.follows) * 100))
    : 100;

  const reachPct = campaign.estimatedReach > 0
    ? Math.min(100, Math.round((campaign.reachDelivered / campaign.estimatedReach) * 100))
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Back & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-semibold text-[#B3B3B3] hover:text-white bg-[#181818] border border-[#282828] hover:bg-[#202020] px-3.5 py-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Campaigns</span>
        </button>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Live Simulation Action Trigger */}
          <button
            id="simulate-curator-step-btn"
            onClick={handleSimulateStep}
            disabled={isSimulating}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 to-[#FF3333] hover:from-red-500 hover:to-[#ff4d4d] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-red-900/30 transition cursor-pointer disabled:opacity-50"
            title="Simulate real-time curator review, decision & delivery advancement"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Updating Live Feed...' : 'Simulate Curator Decision & Delivery'}</span>
          </button>
        </div>
      </div>

      {/* Campaign Hero Card */}
      <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative group shrink-0">
            <img
              src={campaign.artworkUrl}
              alt={campaign.trackTitle}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover shadow-2xl border border-[#333]"
            />
            <a
              href={campaign.spotifyUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition"
            >
              <ExternalLink className="w-6 h-6 text-white" />
            </a>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                campaign.status === 'completed'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                  : 'bg-red-950 text-[#FF3333] border border-red-800/40 flex items-center gap-1.5'
              }`}>
                {campaign.status === 'completed' ? (
                  'Campaign Completed'
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF3333] animate-ping" />
                    Active Pitching
                  </>
                )}
              </span>

              <span className="text-xs text-[#888]">ID: {campaign.id}</span>
              <span className="text-xs text-[#888]">•</span>
              <span className="text-xs text-[#888]">Target: {campaign.genres.join(', ')}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white truncate font-['Space_Grotesk']">
              {campaign.trackTitle}
            </h1>
            <p className="text-base text-[#B3B3B3] font-medium">{campaign.artistName}</p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#999]">
              <div className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-[#FF3333]" />
                <span>{campaign.playlistCount} Target Playlists</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">{campaign.placementsCount} Placed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <span>{campaign.savesDelivered} / {campaign.addons.saves} Saves Delivered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-400" />
                <span>{campaign.followsDelivered} / {campaign.addons.follows} Follows Delivered</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Metrics & Progress Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Placements */}
        <div className="bg-[#181818] border border-[#282828] rounded-xl p-4.5">
          <div className="flex justify-between items-center text-xs text-[#888] mb-1">
            <span className="font-semibold uppercase tracking-wider">Playlist Placements</span>
            <span className="text-emerald-400 font-bold">
              {campaign.curatorPitches.length > 0
                ? `${Math.round((placedPitches.length / campaign.curatorPitches.length) * 100)}% Rate`
                : '0%'}
            </span>
          </div>
          <p className="text-2xl font-black text-white">
            {placedPitches.length} <span className="text-sm font-normal text-[#888]">/ {campaign.playlistCount}</span>
          </p>
          <div className="w-full bg-[#121212] h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (placedPitches.length / campaign.playlistCount) * 100)}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Total Reach */}
        <div className="bg-[#181818] border border-[#282828] rounded-xl p-4.5">
          <div className="flex justify-between items-center text-xs text-[#888] mb-1">
            <span className="font-semibold uppercase tracking-wider">Audience Reach</span>
            <span className="text-[#FF3333] font-bold">{reachPct}%</span>
          </div>
          <p className="text-2xl font-black text-white">
            {campaign.reachDelivered.toLocaleString()} <span className="text-sm font-normal text-[#888]">listeners</span>
          </p>
          <div className="w-full bg-[#121212] h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#FF3333] h-full rounded-full transition-all duration-500"
              style={{ width: `${reachPct}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Song Saves Delivered */}
        <div className="bg-[#181818] border border-[#282828] rounded-xl p-4.5">
          <div className="flex justify-between items-center text-xs text-[#888] mb-1">
            <span className="font-semibold uppercase tracking-wider">Song Saves Delivered</span>
            <span className="text-amber-400 font-bold">{savesPct}%</span>
          </div>
          <p className="text-2xl font-black text-white">
            {campaign.savesDelivered} <span className="text-sm font-normal text-[#888]">/ {campaign.addons.saves}</span>
          </p>
          <div className="w-full bg-[#121212] h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${savesPct}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Follower Growth */}
        <div className="bg-[#181818] border border-[#282828] rounded-xl p-4.5">
          <div className="flex justify-between items-center text-xs text-[#888] mb-1">
            <span className="font-semibold uppercase tracking-wider">Follower Growth</span>
            <span className="text-blue-400 font-bold">{followsPct}%</span>
          </div>
          <p className="text-2xl font-black text-white">
            {campaign.followsDelivered} <span className="text-sm font-normal text-[#888]">/ {campaign.addons.follows}</span>
          </p>
          <div className="w-full bg-[#121212] h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${followsPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Curator Pitches & Live Decision Feed */}
      <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
              Curator Review Pipeline ({campaign.curatorPitches.length})
            </h2>
            <p className="text-xs text-[#888]">
              Live tracking for each playlist curator pitch, listening status, and placement details.
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1.5 bg-[#121212] p-1 rounded-xl border border-[#282828] text-xs">
            {[
              { id: 'all', label: `All (${campaign.curatorPitches.length})` },
              { id: 'placed', label: `Placed (${placedPitches.length})` },
              { id: 'in review', label: `In Review (${inReviewPitches.length})` },
              { id: 'pending', label: `Pending (${pendingPitches.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-[#262626] text-white shadow-sm'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pitch Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredPitches.map(pitch => (
            <div
              key={pitch.id}
              className={`p-4 rounded-xl border transition-all ${
                pitch.status === 'Placed'
                  ? 'bg-[#151d16] border-emerald-800/50 hover:border-emerald-700'
                  : pitch.status === 'In Review'
                  ? 'bg-[#141924] border-blue-900/50 hover:border-blue-700'
                  : pitch.status === 'Declined'
                  ? 'bg-[#141414] border-[#262626] opacity-75'
                  : 'bg-[#141414] border-[#262626]'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white truncate max-w-[220px]">
                      {pitch.playlistName}
                    </h3>
                    {pitch.position && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        #{pitch.position}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#888]">
                    Curator: <span className="text-[#B3B3B3] font-medium">{pitch.curatorName}</span>
                  </p>
                </div>

                {/* Status Badges */}
                <div>
                  {pitch.status === 'Placed' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Placed
                    </span>
                  )}
                  {pitch.status === 'In Review' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" /> In Review
                    </span>
                  )}
                  {pitch.status === 'Pending' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/70 text-amber-400 border border-amber-800/40 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> In Queue
                    </span>
                  )}
                  {pitch.status === 'Declined' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#202020] text-[#888] border border-[#303030] flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Feedback Given
                    </span>
                  )}
                </div>
              </div>

              {/* Follower Reach & Genre */}
              <div className="flex items-center justify-between text-xs text-[#888] mt-2 pt-2 border-t border-[#222]">
                <span>{pitch.playlistFollowers.toLocaleString()} Followers</span>
                <span className="px-2 py-0.5 rounded bg-[#1e1e1e] text-[10px] font-semibold text-[#B3B3B3]">
                  {pitch.genre}
                </span>
              </div>

              {/* Feedback Note or Placement Link */}
              {pitch.feedback && (
                <div className="mt-2.5 p-2.5 bg-[#121212] rounded-lg border border-[#262626] text-xs">
                  <p className="text-[#888] text-[10px] uppercase font-bold tracking-wider mb-0.5">
                    Curator Feedback:
                  </p>
                  <p className="text-white italic">"{pitch.feedback}"</p>
                </div>
              )}

              {pitch.playlistUrl && pitch.status === 'Placed' && (
                <div className="mt-2.5 flex justify-end">
                  <a
                    href={pitch.playlistUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-xs text-[#FF3333] hover:underline font-semibold"
                  >
                    <span>View on Spotify</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
          Real-Time Campaign Timeline
        </h3>

        <div className="space-y-4">
          {campaign.timeline.map((event, idx) => (
            <div key={event.id || idx} className="flex items-start space-x-3 text-xs">
              <div className="w-2 h-2 rounded-full bg-[#FF3333] mt-1.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <p className="font-bold text-white">{event.title}</p>
                  <span className="text-[10px] text-[#666]">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[#B3B3B3] mt-0.5">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
