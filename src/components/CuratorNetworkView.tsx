import React, { useState } from 'react';
import { CURATOR_CATALOG } from '../data/curatorCatalog';
import {
  Users,
  ShieldCheck,
  Radio,
  Clock,
  ExternalLink,
  Search,
  Flame,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface CuratorNetworkViewProps {
  onStartCampaign: () => void;
}

export const CuratorNetworkView: React.FC<CuratorNetworkViewProps> = ({ onStartCampaign }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');

  const allGenres = ['All', 'EDM', 'Pop', 'Hip Hop', 'Indie Rock', 'R&B', 'Techno', 'Lo-Fi', 'Latin', 'Afrobeat'];

  const filteredCurators = CURATOR_CATALOG.filter(curator => {
    const matchesSearch =
      curator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      curator.playlist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      curator.genres.some(g => g.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGenre =
      selectedGenre === 'All' || curator.genres.some(g => g.toLowerCase() === selectedGenre.toLowerCase());
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#181818] border border-[#282828] rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40 uppercase tracking-wider">
              Verified Curator Network
            </span>
            <span className="text-xs text-[#888]">Over 2.8M Active Listeners Combined</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk'] mt-1">
            Browse Verified Spotify Playlist Curators
          </h1>
          <p className="text-sm text-[#B3B3B3] mt-1 max-w-2xl">
            Each curator is verified for genuine organic listener engagement, no bot-farming, and adheres to strict review deadlines.
          </p>
        </div>

        <button
          onClick={onStartCampaign}
          className="bg-[#FF3333] hover:bg-[#e62e2e] active:scale-95 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-lg shadow-[#FF3333]/25 transition cursor-pointer flex items-center space-x-2 shrink-0"
        >
          <Flame className="w-4 h-4" />
          <span>Pitch Your Music</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#777]" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search curator, playlist, genre..."
            className="w-full bg-[#181818] border border-[#282828] focus:border-[#FF3333] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-[#555] outline-none transition"
          />
        </div>

        {/* Genre filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {allGenres.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedGenre === g
                  ? 'bg-[#FF3333] text-white shadow-md shadow-[#FF3333]/20'
                  : 'bg-[#181818] text-[#888] hover:text-white border border-[#282828]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Curators Catalog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCurators.map((curator, idx) => (
          <div
            key={idx}
            className="bg-[#181818] border border-[#282828] hover:border-[#3a3a3a] rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#222] to-[#333] border border-[#444] flex items-center justify-center font-bold text-white text-sm shadow">
                    {curator.avatar}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#FF3333] transition-colors">
                      {curator.name}
                    </h3>
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3 h-3" /> Verified Curator
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded bg-[#121212] text-[10px] font-bold text-[#FF3333] border border-red-900/30">
                  Top Tier
                </span>
              </div>

              {/* Playlist Feature Card */}
              <div className="bg-[#121212] border border-[#242424] rounded-xl p-3 mb-3">
                <p className="text-[10px] text-[#777] uppercase font-bold tracking-wider mb-1">
                  Primary Playlist
                </p>
                <p className="text-xs font-bold text-white truncate">
                  {curator.playlist}
                </p>
                <div className="flex items-center justify-between text-[11px] text-[#888] mt-2 pt-2 border-t border-[#1f1f1f]">
                  <span>{curator.followers.toLocaleString()} Active Followers</span>
                  <span className="text-emerald-400 font-semibold">48h SLA</span>
                </div>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {curator.genres.map(g => (
                  <span
                    key={g}
                    className="px-2 py-0.5 bg-[#202020] text-[#B3B3B3] rounded text-[10px] font-medium"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Action */}
            <div className="pt-3 border-t border-[#242424] flex items-center justify-between">
              <span className="text-[11px] text-[#777]">Open for Submissions</span>
              <button
                onClick={onStartCampaign}
                className="text-xs font-bold text-[#FF3333] hover:text-white flex items-center space-x-1 cursor-pointer"
              >
                <span>Pitch to Playlist</span>
                <Flame className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
