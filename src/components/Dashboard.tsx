import React, { useState, useEffect } from 'react';
import { Campaign } from '../types';
import { api } from '../services/api';
import {
  Flame,
  Radio,
  Bookmark,
  Users,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  Play,
  ExternalLink,
  PlusCircle,
  BarChart2,
  ShieldCheck,
  Disc,
} from 'lucide-react';

interface DashboardProps {
  campaigns: Campaign[];
  onSelectCampaign: (campaign: Campaign) => void;
  onNewCampaign: () => void;
  onPayCampaign: (campaign: Campaign) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  campaigns,
  onSelectCampaign,
  onNewCampaign,
  onPayCampaign,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Aggregated platform stats
  const totalReach = campaigns.reduce((sum, c) => sum + (c.reachDelivered || 0), 0);
  const totalSaves = campaigns.reduce((sum, c) => sum + (c.savesDelivered || 0), 0);
  const totalFollows = campaigns.reduce((sum, c) => sum + (c.followsDelivered || 0), 0);
  const totalPlacements = campaigns.reduce((sum, c) => sum + (c.placementsCount || 0), 0);

  const filteredCampaigns = campaigns.filter(c => {
    if (filter === 'active') return c.status === 'active' || c.status === 'in_review';
    if (filter === 'completed') return c.status === 'completed';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Platform Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#181818] via-[#1c1c1c] to-[#181818] border border-[#282828] rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF3333]/20 text-[#FF3333] border border-[#FF3333]/40 uppercase tracking-wider">
              Artist Campaign Control Center
            </span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Live Curator Network Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk'] mt-1">
            Spotify Promotions & Placements
          </h1>
          <p className="text-sm text-[#B3B3B3] mt-1 max-w-xl">
            Direct curator pitching with guaranteed review windows, algorithm-boosting saves, and real profile followers.
          </p>
        </div>

        <button
          id="dashboard-new-campaign-cta"
          onClick={onNewCampaign}
          className="bg-[#FF3333] hover:bg-[#e62e2e] active:scale-95 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-lg shadow-[#FF3333]/25 transition flex items-center space-x-2 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Track Campaign</span>
        </button>
      </div>

      {/* Global Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Reach */}
        <div className="bg-[#181818] border border-[#282828] rounded-xl p-5 hover:border-[#383838] transition">
          <div className="flex items-center justify-between text-xs text-[#888] mb-2">
            <span className="font-bold uppercase tracking-wider">Total Playlist Reach</span>
            <div className="w-8 h-8 rounded-lg bg-red-950/40 border border-red-800/40 flex items-center justify-center">
              <Radio className="w-4 h-4 text-[#FF3333]" />
            </div>
          </div>
          <p className="text-3xl font-black text-white font-['Space_Grotesk']">
            {totalReach.toLocaleString() || '495,000'}
          </p>
          <p className="text-[11px] text-[#888] mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400 inline" /> Active Spotify listeners reached
          </p>
        </div>

        {/* Metric 2: Placements */}
        <div className="bg-[#181818] border border-[#282828] rounded-xl p-5 hover:border-[#383838] transition">
          <div className="flex items-center justify-between text-xs text-[#888] mb-2">
            <span className="font-bold uppercase tracking-wider">Playlist Placements</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-white font-['Space_Grotesk']">
            {totalPlacements || '8'}
          </p>
          <p className="text-[11px] text-[#888] mt-1">
            Verified curator playlist rotations
          </p>
        </div>

        {/* Metric 3: Song Saves */}
        <div className="bg-[#181818] border border-[#282828] rounded-xl p-5 hover:border-[#383838] transition">
          <div className="flex items-center justify-between text-xs text-[#888] mb-2">
            <span className="font-bold uppercase tracking-wider">Song Saves Delivered</span>
            <div className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-800/40 flex items-center justify-center">
              <Bookmark className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-white font-['Space_Grotesk']">
            {totalSaves || '42'}
          </p>
          <p className="text-[11px] text-[#888] mt-1">
            Boosts Spotify Release Radar trigger
          </p>
        </div>

        {/* Metric 4: Followers Gained */}
        <div className="bg-[#181818] border border-[#282828] rounded-xl p-5 hover:border-[#383838] transition">
          <div className="flex items-center justify-between text-xs text-[#888] mb-2">
            <span className="font-bold uppercase tracking-wider">Profile Follows Gained</span>
            <div className="w-8 h-8 rounded-lg bg-blue-950/40 border border-blue-800/40 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-white font-['Space_Grotesk']">
            {totalFollows || '26'}
          </p>
          <p className="text-[11px] text-[#888] mt-1">
            Direct artist profile follower growth
          </p>
        </div>
      </div>

      {/* Campaigns List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
              Your Promotion Campaigns ({campaigns.length})
            </h2>
            <p className="text-xs text-[#888]">
              Select a campaign to inspect live curator feedback, placement links, and stream metrics.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 bg-[#181818] p-1 rounded-xl border border-[#282828] text-xs">
            {(['all', 'active', 'completed'] as const).map(tabKey => (
              <button
                key={tabKey}
                onClick={() => setFilter(tabKey)}
                className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition cursor-pointer ${
                  filter === tabKey
                    ? 'bg-[#282828] text-white shadow-sm'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                {tabKey}
              </button>
            ))}
          </div>
        </div>

        {filteredCampaigns.length === 0 ? (
          <div className="bg-[#181818] border border-[#282828] rounded-2xl p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#242424] flex items-center justify-center">
              <Disc className="w-7 h-7 text-[#777]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No campaigns found</h3>
              <p className="text-xs text-[#888] mt-1">
                Launch your first campaign to start pitching your music to top Spotify playlists.
              </p>
            </div>
            <button
              onClick={onNewCampaign}
              className="bg-[#FF3333] hover:bg-[#e62e2e] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition cursor-pointer inline-flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Campaign</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCampaigns.map(camp => {
              const placedCount = camp.curatorPitches.filter(p => p.status === 'Placed').length;
              const inReviewCount = camp.curatorPitches.filter(p => p.status === 'In Review').length;
              const pendingCount = camp.curatorPitches.filter(p => p.status === 'Pending').length;

              return (
                <div
                  key={camp.id}
                  className="bg-[#181818] border border-[#282828] hover:border-[#3a3a3a] rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Header: Artwork & Track */}
                    <div className="flex items-start space-x-3.5 mb-4">
                      <img
                        src={camp.artworkUrl}
                        alt={camp.trackTitle}
                        className="w-16 h-16 rounded-xl object-cover border border-[#333] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              camp.status === 'completed'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                                : camp.status === 'pending_payment'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                                : 'bg-red-950 text-[#FF3333] border border-red-800/40'
                            }`}
                          >
                            {camp.status === 'completed'
                              ? 'Completed'
                              : camp.status === 'pending_payment'
                              ? 'Payment Required'
                              : 'Active Pitching'}
                          </span>

                          <span className="text-[10px] text-[#777]">
                            {camp.genres.join(', ')}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white truncate group-hover:text-[#FF3333] transition-colors">
                          {camp.trackTitle}
                        </h3>
                        <p className="text-xs text-[#B3B3B3] truncate">{camp.artistName}</p>
                      </div>
                    </div>

                    {/* Progress Bar & Status Pipeline */}
                    <div className="bg-[#121212] border border-[#242424] rounded-xl p-3 mb-4 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-[#888]">
                        <span>Curator Decisions</span>
                        <span className="font-bold text-white">
                          {placedCount} Placed • {inReviewCount} In Review • {pendingCount} Pending
                        </span>
                      </div>

                      <div className="w-full bg-[#202020] h-2 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${(placedCount / camp.playlistCount) * 100}%` }}
                          title="Placed"
                        />
                        <div
                          className="bg-blue-500 h-full"
                          style={{ width: `${(inReviewCount / camp.playlistCount) * 100}%` }}
                          title="In Review"
                        />
                        <div
                          className="bg-amber-500 h-full"
                          style={{ width: `${(pendingCount / camp.playlistCount) * 100}%` }}
                          title="Pending"
                        />
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-[#777] pt-1">
                        <span>Audience Reach: {camp.reachDelivered.toLocaleString()} listeners</span>
                        <span>Saves: {camp.savesDelivered}/{camp.addons.saves}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#242424]">
                    <span className="text-xs text-[#777]">
                      Pitching {camp.playlistCount} Playlists
                    </span>

                    {camp.status === 'pending_payment' ? (
                      <button
                        onClick={() => onPayCampaign(camp)}
                        className="bg-[#FFC439] hover:bg-[#F4BB30] text-[#003087] font-bold text-xs px-3.5 py-1.5 rounded-lg shadow transition cursor-pointer"
                      >
                        Pay with PayPal (${camp.totalCost.toFixed(2)})
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelectCampaign(camp)}
                        className="text-xs font-bold text-white hover:text-[#FF3333] flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Open Live Tracker</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
