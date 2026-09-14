import React, { useState, useEffect } from 'react';
import { PlatformAnalytics } from '../types';
import { api } from '../services/api';
import {
  BarChart3,
  TrendingUp,
  Radio,
  Bookmark,
  Users,
  CheckCircle2,
  Clock,
  Zap,
  Activity,
  Award,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await api.getAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading || !analytics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-2 border-[#FF3333] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-[#888]">Loading platform real-time analytics...</p>
      </div>
    );
  }

  const maxStreams = Math.max(...analytics.dailyGrowth.map(d => d.streams));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Analytics Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF3333]/20 text-[#FF3333] border border-[#FF3333]/40 uppercase tracking-wider">
            Spotify Intelligence Feed
          </span>
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" /> Synchronized with Spotify Algorithms
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk'] mt-1">
          Performance Metrics & Growth Analytics
        </h1>
        <p className="text-sm text-[#B3B3B3] mt-1 max-w-2xl">
          Track curator decision velocities, stream lift from placed playlists, listener save retention, and follower conversion.
        </p>
      </div>

      {/* Top Stat Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#181818] border border-[#282828] rounded-xl p-5">
          <div className="flex justify-between items-center text-xs text-[#888] mb-1">
            <span className="font-semibold uppercase tracking-wider">Average Placement Rate</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white font-['Space_Grotesk']">
            {analytics.placementRatePercent}%
          </p>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +4.2% higher than industry benchmark
          </p>
        </div>

        <div className="bg-[#181818] border border-[#282828] rounded-xl p-5">
          <div className="flex justify-between items-center text-xs text-[#888] mb-1">
            <span className="font-semibold uppercase tracking-wider">Total Playlist Reach</span>
            <Radio className="w-4 h-4 text-[#FF3333]" />
          </div>
          <p className="text-3xl font-black text-white font-['Space_Grotesk']">
            {(analytics.totalAudienceReach).toLocaleString()}
          </p>
          <p className="text-[11px] text-[#888] mt-1">Active cumulative listeners</p>
        </div>

        <div className="bg-[#181818] border border-[#282828] rounded-xl p-5">
          <div className="flex justify-between items-center text-xs text-[#888] mb-1">
            <span className="font-semibold uppercase tracking-wider">Song Saves Delivered</span>
            <Bookmark className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-white font-['Space_Grotesk']">
            {analytics.totalSavesDelivered.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#888] mt-1">Algorithm save triggers</p>
        </div>

        <div className="bg-[#181818] border border-[#282828] rounded-xl p-5">
          <div className="flex justify-between items-center text-xs text-[#888] mb-1">
            <span className="font-semibold uppercase tracking-wider">Avg Curator Response</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-black text-white font-['Space_Grotesk']">
            {analytics.averageResponseHours}h
          </p>
          <p className="text-[11px] text-[#888] mt-1">Guaranteed 48h turnaround</p>
        </div>
      </div>

      {/* Visual Chart 1: Daily Stream Lift & Weekly Growth */}
      <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
              Weekly Stream Velocity Across Placements
            </h3>
            <p className="text-xs text-[#888]">
              Daily estimated Spotify stream gains originating from verified playlist additions.
            </p>
          </div>
          <span className="text-xs font-bold text-[#FF3333] bg-red-950/40 border border-red-800/40 px-3 py-1 rounded-full">
            +517% 7-Day Acceleration
          </span>
        </div>

        {/* Bar Chart Visualization */}
        <div className="h-56 flex items-end justify-between gap-3 pt-6 border-b border-[#262626]">
          {analytics.dailyGrowth.map((day, idx) => {
            const heightPercent = Math.round((day.streams / maxStreams) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-[#222] border border-[#333] text-white px-2 py-1 rounded shadow-lg text-center pointer-events-none whitespace-nowrap">
                  <p className="font-bold text-[#FF3333]">{day.streams.toLocaleString()} streams</p>
                  <p className="text-[#888]">+{day.saves} saves • +{day.follows} follows</p>
                </div>

                {/* Stream Bar */}
                <div
                  className="w-full max-w-[48px] bg-gradient-to-t from-red-700 to-[#FF3333] rounded-t-lg transition-all duration-500 group-hover:from-red-600 group-hover:to-[#ff5555]"
                  style={{ height: `${heightPercent}%` }}
                />

                <span className="text-[11px] font-semibold text-[#888] group-hover:text-white transition-colors">
                  {day.date}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center text-xs text-[#777] mt-3">
          <span>Baseline Day 1</span>
          <span>Peak Algorithm Momentum</span>
        </div>
      </div>

      {/* Grid: Genre Placement Distribution & Spotify Algorithm Multipliers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Genre Breakdown */}
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6">
          <h3 className="text-base font-bold text-white font-['Space_Grotesk'] mb-2">
            Placement Distribution by Genre
          </h3>
          <p className="text-xs text-[#888] mb-5">
            Curator acceptance and placement distribution across primary music categories.
          </p>

          <div className="space-y-3.5">
            {analytics.genreBreakdown.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">{item.genre}</span>
                  <span className="text-[#888]">{item.count} placements ({item.percentage}%)</span>
                </div>
                <div className="w-full bg-[#121212] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#FF3333] h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Algorithm Trigger Explanation */}
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-['Space_Grotesk'] mb-2">
              Spotify Algorithm Trigger Engine
            </h3>
            <p className="text-xs text-[#888] mb-4">
              How TrackBoost placements and add-on actions impact Spotify's internal recommendation models.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#121212] border border-[#262626]">
                <div className="flex items-center space-x-2 mb-1">
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-white">Save-to-Stream Ratio Threshold</span>
                </div>
                <p className="text-[#888]">
                  When a song exceeds a 4% save rate, Spotify flags the track for inclusion on automated Discover Weekly queues.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#121212] border border-[#262626]">
                <div className="flex items-center space-x-2 mb-1">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-bold text-white">Profile Follower Release Radar</span>
                </div>
                <p className="text-[#888]">
                  Every verified profile follower automatically receives all future releases inside their Friday Release Radar playlist.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#121212] border border-[#262626]">
                <div className="flex items-center space-x-2 mb-1">
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold text-white">Editorial Co-Listening Affinity</span>
                </div>
                <p className="text-[#888]">
                  Curator placements expose your track to audiences who listen to verified major artists, building Spotify algorithmic associations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
