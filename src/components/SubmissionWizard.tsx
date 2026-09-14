import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { Campaign, SpotifyTrackMeta, CreateCampaignInput, Transaction } from '../types';
import { useAuth } from '../context/AuthContext';
import { playSynthPreview, stopSynthPreview } from '../utils/audioPreview';
import {
  Search,
  Music2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  UserPlus,
  BookmarkPlus,
  Play,
  Square,
  ExternalLink,
  Shield,
  Layers,
  Sliders,
  Check,
  Zap,
  Radio,
  Clock,
  Flame,
  CreditCard,
  Lock,
  Wallet,
  User,
  Volume2,
  Plus,
  Minus,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface SubmissionWizardProps {
  onCampaignCreated: (campaign: Campaign) => void;
  onOpenPayPal: (campaign: Campaign) => void;
}

// 13 Primary Genres
const GENRE_LIST = [
  'Pop',
  'Hip-Hop',
  'EDM & Dance',
  'R&B & Soul',
  'Rock',
  'Indie & Alternative',
  'Techno & House',
  'Trap & Drill',
  'Afrobeat & Amapiano',
  'Latin & Reggaeton',
  'Lo-Fi & Chill',
  'Acoustic & Folk',
  'Synthwave & Cyberpunk',
];

// Sub-genre tags
const SUBGENRE_TAGS = [
  'Commercial Pop',
  'Melodic Rap',
  'Slap House',
  'Future Bass',
  'Boom Bap',
  'Hyperpop',
  'Tech House',
  'Indie Rock',
  'Bedroom Pop',
  'Drill',
  'Deep House',
  'Synthpop',
  'Club Anthems',
  'Psytrance',
];

// Target Moods
const MOODS = [
  'Energetic & Hype',
  'Late Night Driving',
  'Chill & Relaxed',
  'Gym & Workout',
  'Party & Club',
  'Emotional & Melodic',
  'Focus & Study',
];

// Presets for instant testing
const PRESET_TRACKS = [
  {
    name: 'Midnight Drive (Remix)',
    artist: 'Sanelow & K-Vibe',
    url: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    genre: 'EDM & Dance',
    subgenre: 'Slap House',
    artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Espresso',
    artist: 'Sabrina Carpenter',
    url: 'https://open.spotify.com/track/2HRgqmZQC0VFi01crRTaFX',
    genre: 'Pop',
    subgenre: 'Commercial Pop',
    artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Paint The Town Red',
    artist: 'Doja Cat',
    url: 'https://open.spotify.com/track/2VJw5456s7s8829929',
    genre: 'Hip-Hop',
    subgenre: 'Melodic Rap',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
  },
];

export const SubmissionWizard: React.FC<SubmissionWizardProps> = ({
  onCampaignCreated,
  onOpenPayPal,
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Core State Management Blueprint
  const [campaignData, setCampaignData] = useState({
    spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    trackMeta: {
      title: 'Midnight Drive (Remix)',
      artist: 'Sanelow & K-Vibe',
      coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=400&q=80',
      previewUrl: '',
    },
    genres: ['EDM & Dance'],
    subgenres: ['Slap House'],
    targetMood: 'Energetic & Hype',
    playlistCount: 15,
    playlistCostPerUnit: 3.50, // Base unit rate
    songSavesCount: 25,
    profileFollowsCount: 15,
  });

  // Fetching & Audio preview state
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthStopRef = useRef<(() => void) | null>(null);

  // Checkout submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [createdCampaign, setCreatedCampaign] = useState<Campaign | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (synthStopRef.current) {
        synthStopRef.current();
      }
      stopSynthPreview();
    };
  }, []);

  // Real-time calculation helper
  const calculateTotal = () => {
    const playlistTotal = campaignData.playlistCount * campaignData.playlistCostPerUnit;
    const savesTotal = campaignData.songSavesCount * 2.00;
    const followsTotal = campaignData.profileFollowsCount * 2.00;
    const subtotal = playlistTotal + savesTotal + followsTotal;
    const discount = campaignData.playlistCount >= 25 ? subtotal * 0.10 : 0;
    const total = subtotal - discount;

    return {
      playlistTotal: Number(playlistTotal.toFixed(2)),
      savesTotal: Number(savesTotal.toFixed(2)),
      followsTotal: Number(followsTotal.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  };

  const totals = calculateTotal();
  const estimatedReach = campaignData.playlistCount * 35000;

  // Spotify URL Regex validation
  const isValidSpotifyTrackUrl = (url: string) => {
    return /^(https?:\/\/)?(open\.spotify\.com\/(intl-[a-z]{2}\/)?track\/|spotify:track:)([a-zA-Z0-9]+)/i.test(url.trim());
  };

  // Step 1: Metadata Fetcher
  const handleFetchMetadata = async (urlToFetch?: string) => {
    const targetUrl = (urlToFetch || campaignData.spotifyUrl).trim();
    if (!targetUrl) return;

    if (!isValidSpotifyTrackUrl(targetUrl)) {
      setMetaError('Please provide a valid Spotify track URL (e.g. https://open.spotify.com/track/...)');
      return;
    }

    setFetchingMeta(true);
    setMetaError(null);

    try {
      const meta = await api.fetchSpotifyMeta(targetUrl);
      setCampaignData(prev => ({
        ...prev,
        spotifyUrl: targetUrl,
        trackMeta: {
          title: meta.title,
          artist: meta.artist,
          coverUrl: meta.artwork,
          previewUrl: meta.previewUrl || '',
        },
      }));
    } catch (err: any) {
      setMetaError('Unable to extract Spotify metadata. Please verify the URL format.');
    } finally {
      setFetchingMeta(false);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_TRACKS[0]) => {
    setCampaignData(prev => ({
      ...prev,
      spotifyUrl: preset.url,
      trackMeta: {
        title: preset.name,
        artist: preset.artist,
        coverUrl: preset.artwork,
        previewUrl: '',
      },
      genres: [preset.genre],
      subgenres: [preset.subgenre],
    }));
    setMetaError(null);
  };

  // Audio Preview Toggle
  const toggleAudioPreview = () => {
    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (synthStopRef.current) {
        synthStopRef.current();
        synthStopRef.current = null;
      }
      stopSynthPreview();
      setIsPlayingAudio(false);
    } else {
      if (campaignData.trackMeta.previewUrl) {
        if (!audioRef.current) {
          audioRef.current = new Audio(campaignData.trackMeta.previewUrl);
          audioRef.current.onended = () => setIsPlayingAudio(false);
        }
        audioRef.current.play().catch(() => {
          // Fallback to synth if audio cannot be played
          synthStopRef.current = playSynthPreview();
        });
      } else {
        synthStopRef.current = playSynthPreview();
      }
      setIsPlayingAudio(true);
    }
  };

  // Step 2: Genres & Subgenres
  const toggleGenre = (genre: string) => {
    setCampaignData(prev => {
      const exists = prev.genres.includes(genre);
      if (exists) {
        if (prev.genres.length > 1) {
          return { ...prev, genres: prev.genres.filter(g => g !== genre) };
        }
        return prev;
      } else {
        if (prev.genres.length < 4) {
          return { ...prev, genres: [...prev.genres, genre] };
        }
        return prev;
      }
    });
  };

  const toggleSubgenre = (sub: string) => {
    setCampaignData(prev => {
      const exists = prev.subgenres.includes(sub);
      if (exists) {
        return { ...prev, subgenres: prev.subgenres.filter(s => s !== sub) };
      } else {
        if (prev.subgenres.length < 3) {
          return { ...prev, subgenres: [...prev.subgenres, sub] };
        }
        return prev;
      }
    });
  };

  // Step 5: Direct Checkout execution
  const handleExecutePayPalCheckout = async () => {
    setIsSubmitting(true);
    setCheckoutStatus('processing');

    try {
      // 1. Create Campaign
      const input: CreateCampaignInput = {
        spotifyUrl: campaignData.spotifyUrl,
        trackTitle: campaignData.trackMeta.title,
        artistName: campaignData.trackMeta.artist,
        artworkUrl: campaignData.trackMeta.coverUrl,
        genres: campaignData.genres,
        targetMood: campaignData.targetMood,
        playlistCount: campaignData.playlistCount,
        addons: {
          saves: campaignData.songSavesCount,
          follows: campaignData.profileFollowsCount,
        },
      };

      const newCampaign = await api.createCampaign(input);
      setCreatedCampaign(newCampaign);

      // 2. Create PayPal Order
      const orderData = await api.createPayPalOrder(newCampaign.id, totals.total);

      // Brief simulated payment processing
      await new Promise(r => setTimeout(r, 1200));

      // 3. Capture PayPal Order
      const captureResult = await api.capturePayPalOrder(orderData.orderId, newCampaign.id);
      setTransaction(captureResult.transaction);
      setCheckoutStatus('success');

      // Trigger Confetti Celebration
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#E50914', '#FFFFFF', '#0070BA', '#003087', '#FFC439'],
        });
      } catch (e) {
        console.log('Confetti executed');
      }

      onCampaignCreated(captureResult.campaign);
    } catch (err: any) {
      console.error('PayPal checkout failed:', err);
      setCheckoutStatus('idle');
      alert(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Track Details', short: 'Track' },
    { num: 2, label: 'Genre & Tags', short: 'Genres' },
    { num: 3, label: 'Playlist Reach', short: 'Playlists' },
    { num: 4, label: 'Add-on Boosters', short: 'Add-ons' },
    { num: 5, label: 'Summary & Pay', short: 'Checkout' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 1. Header Component (User Profile, Credits/Balance, Step Progress Bar: 1 to 5) */}
      <div className="bg-[#181818] border border-[#262626] rounded-2xl p-5 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#262626]">
          {/* User Profile & Account Ticker */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#E50914] to-[#800] p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-[#181818] rounded-[10px] flex items-center justify-center">
                <User className="w-5 h-5 text-[#E50914]" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white font-['Space_Grotesk']">
                  {user?.artistName || user?.name || 'Sanelow & K-Vibe'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30 uppercase tracking-wider">
                  Verified Artist
                </span>
              </div>
              <p className="text-xs text-[#888] flex items-center gap-1.5 mt-0.5">
                <span>{user?.email || 'artist@sanelow.com'}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Tier 1 Pitch Priority
                </span>
              </p>
            </div>
          </div>

          {/* Credits & Balance */}
          <div className="flex items-center space-x-4">
            <div className="bg-[#121212] border border-[#2c2c2c] rounded-xl px-4 py-2 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#222] flex items-center justify-center text-[#E50914]">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#777] font-semibold block">
                  Campaign Credits
                </span>
                <span className="text-sm font-bold text-white font-mono">$0.00 USD</span>
              </div>
            </div>

            <div className="hidden sm:block text-right">
              <span className="text-xs text-[#888] block">Curator Queue Status</span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                Live: 1,420+ Curators Active
              </span>
            </div>
          </div>
        </div>

        {/* Step Progress Bar: 1 to 5 */}
        <div className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#E50914] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 inline" />
              Step {currentStep} of 5: {stepsList[currentStep - 1].label}
            </span>
            <span className="text-xs font-medium text-[#888]">
              {Math.round((currentStep / 5) * 100)}% Completed
            </span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-5 gap-2">
            {stepsList.map(s => {
              const isCompleted = s.num < currentStep;
              const isCurrent = s.num === currentStep;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num <= currentStep || (s.num === 2 && campaignData.trackMeta.title)) {
                      setCurrentStep(s.num as any);
                    }
                  }}
                  disabled={s.num > currentStep && !campaignData.trackMeta.title}
                  className={`group text-left transition cursor-pointer disabled:cursor-not-allowed ${
                    s.num > currentStep ? 'opacity-60' : 'opacity-100'
                  }`}
                >
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isCompleted
                        ? 'bg-emerald-500'
                        : isCurrent
                        ? 'bg-[#E50914] shadow-md shadow-[#E50914]/50'
                        : 'bg-[#262626]'
                    }`}
                  />
                  <div className="mt-2 hidden sm:flex items-center space-x-1.5">
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isCurrent
                          ? 'bg-[#E50914] text-white'
                          : 'bg-[#262626] text-[#777]'
                      }`}
                    >
                      {isCompleted ? <Check className="w-2.5 h-2.5" /> : s.num}
                    </span>
                    <span
                      className={`text-xs font-semibold truncate ${
                        isCurrent ? 'text-white' : isCompleted ? 'text-emerald-400' : 'text-[#777]'
                      }`}
                    >
                      {s.short}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Main Content Container & Real-time Sticky Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Dynamic Form Step Component */}
        <div className="lg:col-span-8 bg-[#181818] border border-[#262626] rounded-2xl p-6 sm:p-7 shadow-xl relative min-h-[520px] flex flex-col justify-between">
          
          {/* ========================================================================= */}
          {/* [STEP 1] Track Details & Metadata Loader                                  */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#B3B3B3]">
                    Paste Spotify Track Link
                  </label>
                  <span className="text-xs text-[#777]">Song, Single, or Album Cut</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      id="spotify-track-input"
                      type="url"
                      value={campaignData.spotifyUrl}
                      onChange={e => {
                        const val = e.target.value;
                        setCampaignData(prev => ({ ...prev, spotifyUrl: val }));
                        if (metaError) setMetaError(null);
                      }}
                      placeholder="https://open.spotify.com/track/4cOdK2wGUT..."
                      className="w-full bg-[#121212] border border-[#2e2e2e] focus:border-[#E50914] rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#555] outline-none transition font-sans"
                    />
                  </div>
                  <button
                    id="load-verify-track-btn"
                    type="button"
                    onClick={() => handleFetchMetadata()}
                    disabled={fetchingMeta}
                    className="bg-[#E50914] hover:bg-[#c20811] active:scale-95 text-white font-bold text-xs px-6 py-3.5 rounded-xl transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer shadow-lg shadow-[#E50914]/25 disabled:opacity-50"
                  >
                    {fetchingMeta ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Load / Verify</span>
                      </>
                    )}
                  </button>
                </div>

                {metaError && (
                  <div className="flex items-center space-x-2 text-xs text-red-400 mt-2.5 bg-red-950/30 border border-red-900/40 rounded-lg p-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#E50914]" />
                    <span>{metaError}</span>
                  </div>
                )}
              </div>

              {/* Sample Track Presets */}
              <div>
                <p className="text-xs font-semibold text-[#888] mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E50914]" /> Quick Presets (Click to Test Instantly):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PRESET_TRACKS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`text-left p-2.5 rounded-xl border transition flex items-center space-x-3 cursor-pointer group ${
                        campaignData.spotifyUrl === preset.url
                          ? 'bg-[#222] border-[#E50914]'
                          : 'bg-[#121212] hover:bg-[#1e1e1e] border-[#282828]'
                      }`}
                    >
                      <img
                        src={preset.artwork}
                        alt={preset.name}
                        className="w-10 h-10 rounded-lg object-cover border border-[#333]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate group-hover:text-[#E50914] transition-colors">
                          {preset.name}
                        </p>
                        <p className="text-[11px] text-[#888] truncate">{preset.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Render Card Preview */}
              {campaignData.trackMeta.title && (
                <div className="bg-[#121212] border border-[#2c2c2c] rounded-2xl p-5 relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    {/* Album Art with Audio Preview Trigger */}
                    <div className="relative group shrink-0">
                      <img
                        src={campaignData.trackMeta.coverUrl}
                        alt={campaignData.trackMeta.title}
                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover shadow-2xl border border-[#333]"
                      />
                      <button
                        type="button"
                        onClick={toggleAudioPreview}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-xl flex flex-col items-center justify-center transition cursor-pointer space-y-1"
                      >
                        {isPlayingAudio ? (
                          <>
                            <Square className="w-8 h-8 text-[#E50914] fill-[#E50914]" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Stop</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-8 h-8 text-white fill-white ml-1" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">30s Preview</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Metadata Information */}
                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <div className="flex items-center justify-center sm:justify-start space-x-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/40 uppercase tracking-wider">
                          Verified Spotify Master
                        </span>
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pitch Ready
                        </span>
                      </div>

                      <h3 className="text-xl font-extrabold text-white truncate font-['Space_Grotesk']">
                        {campaignData.trackMeta.title}
                      </h3>
                      <p className="text-sm text-[#B3B3B3] font-medium mt-0.5">{campaignData.trackMeta.artist}</p>

                      {/* Interactive audio preview bar */}
                      <div className="mt-3.5 flex items-center justify-center sm:justify-start gap-3">
                        <button
                          type="button"
                          onClick={toggleAudioPreview}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                            isPlayingAudio
                              ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/30'
                              : 'bg-[#222] hover:bg-[#2c2c2c] text-white border border-[#333]'
                          }`}
                        >
                          {isPlayingAudio ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-white" />
                              <span>Pause Snippet</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-[#E50914]" />
                              <span>Play 30s Snippet</span>
                            </>
                          )}
                        </button>

                        <a
                          href={campaignData.spotifyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#888] hover:text-white flex items-center gap-1 transition"
                        >
                          Open in Spotify <ExternalLink className="w-3 h-3 text-[#E50914]" />
                        </a>
                      </div>

                      {/* Soundwave equalizer indicator if audio is playing */}
                      {isPlayingAudio && (
                        <div className="flex items-center space-x-1 mt-3 justify-center sm:justify-start">
                          <span className="text-[10px] text-[#E50914] font-semibold mr-1.5 uppercase">Previewing:</span>
                          {[8, 16, 24, 12, 20, 14, 26, 10, 18, 22].map((height, i) => (
                            <div
                              key={i}
                              style={{ height: `${height}px` }}
                              className="w-1 bg-[#E50914] rounded-full animate-pulse"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-[#252525]">
                <button
                  id="wizard-step1-next"
                  type="button"
                  disabled={!campaignData.trackMeta.title}
                  onClick={() => setCurrentStep(2)}
                  className="bg-[#E50914] hover:bg-[#c20811] active:scale-95 text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-lg shadow-[#E50914]/25 transition flex items-center space-x-2 cursor-pointer disabled:opacity-40"
                >
                  <span>Continue to Genre Selector</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* [STEP 2] Genre & Sub-genre Tag Selector                                    */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#B3B3B3]">
                    Select Primary Genres (Select 1 - 4)
                  </label>
                  <span className="text-xs text-[#888]">{campaignData.genres.length} of 4 selected</span>
                </div>
                <p className="text-xs text-[#777] mb-3">
                  Pitches are routed directly to verified curators categorized within these genres.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {GENRE_LIST.map(genre => {
                    const isSelected = campaignData.genres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={`p-3 rounded-xl text-left text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-red-950/50 text-white border-2 border-[#E50914] shadow-md shadow-[#E50914]/15'
                            : 'bg-[#121212] text-[#B3B3B3] hover:text-white border border-[#282828] hover:border-[#3a3a3a]'
                        }`}
                      >
                        <span>{genre}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#E50914]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subgenre pill tags */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#B3B3B3] mb-2">
                  Sub-Genre & Style Tags (Optional, up to 3)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUBGENRE_TAGS.map(sub => {
                    const isSelected = campaignData.subgenres.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleSubgenre(sub)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#E50914] text-white'
                            : 'bg-[#121212] text-[#888] border border-[#2c2c2c] hover:text-white'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Mood */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#B3B3B3] mb-2">
                  Target Sonic Vibe & Mood
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MOODS.map(mood => {
                    const isSelected = campaignData.targetMood === mood;
                    return (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => setCampaignData(prev => ({ ...prev, targetMood: mood }))}
                        className={`p-2.5 rounded-xl text-left text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-red-950/40 text-white border-2 border-[#E50914]'
                            : 'bg-[#121212] text-[#B3B3B3] hover:text-white border border-[#282828]'
                        }`}
                      >
                        <span>{mood}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#E50914]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#252525]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="bg-[#242424] hover:bg-[#2c2c2c] text-[#B3B3B3] hover:text-white text-xs font-semibold px-5 py-3 rounded-xl transition flex items-center space-x-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Track</span>
                </button>

                <button
                  id="wizard-step2-next"
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="bg-[#E50914] hover:bg-[#c20811] active:scale-95 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-[#E50914]/25 transition flex items-center space-x-2 cursor-pointer"
                >
                  <span>Select Playlist Volume</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* [STEP 3] Target Playlist Selection / Quantity Sliders                     */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#B3B3B3] mb-1">
                  Target Playlist Volume
                </label>
                <p className="text-xs text-[#777] mb-5">
                  Choose how many verified Spotify curators will receive your track. Base rate: ${campaignData.playlistCostPerUnit.toFixed(2)} per curator review.
                </p>

                {/* Preset Quick Buttons */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
                  {[5, 10, 15, 25, 50, 100].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setCampaignData(prev => ({ ...prev, playlistCount: cnt }))}
                      className={`py-3 px-2 rounded-xl text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        campaignData.playlistCount === cnt
                          ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/25 font-bold'
                          : 'bg-[#121212] text-[#B3B3B3] hover:text-white border border-[#282828]'
                      }`}
                    >
                      <span className="text-base font-black font-['Space_Grotesk']">{cnt}</span>
                      <span className="text-[10px] opacity-80 uppercase tracking-tighter">Playlists</span>
                      {cnt >= 25 && (
                        <span className="mt-1 text-[9px] px-1 bg-white/20 text-white rounded font-bold">
                          -10% Off
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Interactive Slider & Stepper */}
                <div className="bg-[#121212] border border-[#282828] rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#B3B3B3] font-medium">Fine-tune submission count:</span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCampaignData(prev => ({
                            ...prev,
                            playlistCount: Math.max(3, prev.playlistCount - 1),
                          }))
                        }
                        className="w-8 h-8 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-white flex items-center justify-center cursor-pointer border border-[#333]"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-base font-extrabold text-[#E50914] min-w-[90px] text-center font-mono">
                        {campaignData.playlistCount} Playlists
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCampaignData(prev => ({
                            ...prev,
                            playlistCount: Math.min(100, prev.playlistCount + 1),
                          }))
                        }
                        className="w-8 h-8 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-white flex items-center justify-center cursor-pointer border border-[#333]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <input
                    id="playlist-volume-slider"
                    type="range"
                    min={3}
                    max={100}
                    step={1}
                    value={campaignData.playlistCount}
                    onChange={e =>
                      setCampaignData(prev => ({
                        ...prev,
                        playlistCount: Number(e.target.value),
                      }))
                    }
                    className="w-full h-2 bg-[#282828] rounded-lg appearance-none cursor-pointer accent-[#E50914]"
                  />

                  <div className="flex justify-between text-[11px] text-[#666] pt-1">
                    <span>Starter (3-10)</span>
                    <span>Pro Growth (15-25)</span>
                    <span>Breakthrough (50+)</span>
                    <span>Viral Push (100)</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Reach Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#121212] border border-[#282828] rounded-xl p-4">
                  <p className="text-[11px] text-[#888] font-medium">Estimated Audience Reach</p>
                  <p className="text-xl font-black text-white mt-1 font-['Space_Grotesk']">
                    {estimatedReach.toLocaleString()}+ <span className="text-xs text-[#888]">listeners</span>
                  </p>
                </div>
                <div className="bg-[#121212] border border-[#282828] rounded-xl p-4">
                  <p className="text-[11px] text-[#888] font-medium">Curator Response Window</p>
                  <p className="text-xl font-black text-white mt-1 font-['Space_Grotesk']">
                    24 - 48 <span className="text-xs text-[#888]">hours</span>
                  </p>
                </div>
                <div className="bg-[#121212] border border-[#282828] rounded-xl p-4">
                  <p className="text-[11px] text-[#888] font-medium">Placement Guarantee</p>
                  <p className="text-xl font-black text-emerald-400 mt-1 font-['Space_Grotesk']">100% Organic</p>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#252525]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="bg-[#242424] hover:bg-[#2c2c2c] text-[#B3B3B3] hover:text-white text-xs font-semibold px-5 py-3 rounded-xl transition flex items-center space-x-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Genres</span>
                </button>

                <button
                  id="wizard-step3-next"
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="bg-[#E50914] hover:bg-[#c20811] active:scale-95 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-[#E50914]/25 transition flex items-center space-x-2 cursor-pointer"
                >
                  <span>Configure Add-Ons</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* [STEP 4] Add-on Services (Song Saves & Profile Follows customizer)        */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-xl flex items-start gap-3">
                <Flame className="w-5 h-5 text-[#E50914] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-[#E50914] uppercase tracking-wider">
                    Spotify Algorithmic Radar Multiplier
                  </span>
                  <p className="text-xs text-[#B3B3B3] mt-0.5">
                    High save-to-stream ratios trigger Spotify Discover Weekly and Release Radar algorithmic recommendation engines. Hardcoded mathematically to $2.00 per unit.
                  </p>
                </div>
              </div>

              {/* Add-on 1: Song Saves */}
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-red-900/30 border border-red-800/40 flex items-center justify-center">
                      <BookmarkPlus className="w-5 h-5 text-[#E50914]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Song Saves Package</h4>
                      <p className="text-xs text-[#888]">Fixed flat-rate pricing: $2.00 per verified Spotify save</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-white font-mono">${totals.savesTotal.toFixed(2)}</span>
                    <p className="text-[11px] text-[#777]">({campaignData.songSavesCount} Saves × $2.00)</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCampaignData(prev => ({
                          ...prev,
                          songSavesCount: Math.max(0, prev.songSavesCount - 5),
                        }))
                      }
                      className="w-8 h-8 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-white flex items-center justify-center cursor-pointer border border-[#333]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      id="song-saves-slider"
                      type="range"
                      min={0}
                      max={200}
                      step={5}
                      value={campaignData.songSavesCount}
                      onChange={e =>
                        setCampaignData(prev => ({
                          ...prev,
                          songSavesCount: Number(e.target.value),
                        }))
                      }
                      className="w-full h-2 bg-[#282828] rounded-lg appearance-none cursor-pointer accent-[#E50914]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCampaignData(prev => ({
                          ...prev,
                          songSavesCount: Math.min(200, prev.songSavesCount + 5),
                        }))
                      }
                      className="w-8 h-8 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-white flex items-center justify-center cursor-pointer border border-[#333]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-xs font-bold text-white bg-[#1e1e1e] border border-[#333] px-3 py-1.5 rounded-lg shrink-0 min-w-[70px] text-center">
                      {campaignData.songSavesCount} Saves
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[0, 25, 50, 100].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setCampaignData(prev => ({ ...prev, songSavesCount: s }))}
                        className={`text-[11px] font-semibold px-3 py-1 rounded-lg border transition cursor-pointer ${
                          campaignData.songSavesCount === s
                            ? 'bg-[#E50914] text-white border-[#E50914]'
                            : 'bg-[#181818] text-[#888] border-[#2b2b2b] hover:text-white'
                        }`}
                      >
                        +{s} Saves (${(s * 2).toFixed(2)})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Add-on 2: Profile Follows */}
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-900/30 border border-blue-800/40 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Profile Follows Package</h4>
                      <p className="text-xs text-[#888]">Fixed flat-rate pricing: $2.00 per verified Spotify follower</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-white font-mono">${totals.followsTotal.toFixed(2)}</span>
                    <p className="text-[11px] text-[#777]">({campaignData.profileFollowsCount} Follows × $2.00)</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCampaignData(prev => ({
                          ...prev,
                          profileFollowsCount: Math.max(0, prev.profileFollowsCount - 5),
                        }))
                      }
                      className="w-8 h-8 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-white flex items-center justify-center cursor-pointer border border-[#333]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      id="profile-follows-slider"
                      type="range"
                      min={0}
                      max={150}
                      step={5}
                      value={campaignData.profileFollowsCount}
                      onChange={e =>
                        setCampaignData(prev => ({
                          ...prev,
                          profileFollowsCount: Number(e.target.value),
                        }))
                      }
                      className="w-full h-2 bg-[#282828] rounded-lg appearance-none cursor-pointer accent-[#E50914]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCampaignData(prev => ({
                          ...prev,
                          profileFollowsCount: Math.min(150, prev.profileFollowsCount + 5),
                        }))
                      }
                      className="w-8 h-8 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-white flex items-center justify-center cursor-pointer border border-[#333]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-xs font-bold text-white bg-[#1e1e1e] border border-[#333] px-3 py-1.5 rounded-lg shrink-0 min-w-[70px] text-center">
                      {campaignData.profileFollowsCount} Follows
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[0, 15, 30, 60].map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setCampaignData(prev => ({ ...prev, profileFollowsCount: f }))}
                        className={`text-[11px] font-semibold px-3 py-1 rounded-lg border transition cursor-pointer ${
                          campaignData.profileFollowsCount === f
                            ? 'bg-[#E50914] text-white border-[#E50914]'
                            : 'bg-[#181818] text-[#888] border-[#2b2b2b] hover:text-white'
                        }`}
                      >
                        +{f} Follows (${(f * 2).toFixed(2)})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#252525]">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="bg-[#242424] hover:bg-[#2c2c2c] text-[#B3B3B3] hover:text-white text-xs font-semibold px-5 py-3 rounded-xl transition flex items-center space-x-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Playlists</span>
                </button>

                <button
                  id="wizard-step4-next"
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="bg-[#E50914] hover:bg-[#c20811] active:scale-95 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-[#E50914]/25 transition flex items-center space-x-2 cursor-pointer"
                >
                  <span>Review & Checkout Gateway</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* [STEP 5] Order Summary & PayPal Checkout Gateway                          */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {checkoutStatus === 'success' ? (
                /* Payment Success View */
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-black text-white font-['Space_Grotesk']">
                    Payment Verified & Campaign Launched!
                  </h3>
                  <p className="text-sm text-[#B3B3B3] max-w-md mx-auto">
                    Your Spotify track has been queued for immediate pitch distribution to{' '}
                    <strong className="text-white">{campaignData.playlistCount} verified curators</strong>.
                  </p>

                  <div className="bg-[#121212] border border-[#2e2e2e] rounded-xl p-4 max-w-md mx-auto text-left space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-[#888]">
                      <span>Transaction ID:</span>
                      <span className="text-white font-bold">{transaction?.id || 'TX-829104821'}</span>
                    </div>
                    <div className="flex justify-between text-[#888]">
                      <span>PayPal Reference:</span>
                      <span className="text-[#0070BA] font-bold">
                        {transaction?.paypalOrderId || 'PAYID-LIVE-992140'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#888]">
                      <span>Total Paid:</span>
                      <span className="text-emerald-400 font-bold">${totals.total.toFixed(2)} USD</span>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (createdCampaign) {
                          onCampaignCreated(createdCampaign);
                        }
                      }}
                      className="bg-[#E50914] hover:bg-[#c20811] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-[#E50914]/25 transition flex items-center space-x-2 cursor-pointer"
                    >
                      <span>Go to Live Tracking Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Order Breakdown Receipt & PayPal Gateway */
                <div className="space-y-6">
                  {/* Selected Track Overview Header */}
                  <div className="flex items-center space-x-4 bg-[#121212] border border-[#2b2b2b] rounded-xl p-4">
                    <img
                      src={campaignData.trackMeta.coverUrl}
                      alt={campaignData.trackMeta.title}
                      className="w-16 h-16 rounded-xl object-cover border border-[#333]"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#E50914]">
                        Target Submission
                      </span>
                      <h4 className="text-base font-bold text-white truncate font-['Space_Grotesk']">
                        {campaignData.trackMeta.title}
                      </h4>
                      <p className="text-xs text-[#888]">{campaignData.trackMeta.artist}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {campaignData.genres.map(g => (
                          <span key={g} className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#bbb]">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Itemized Breakdown Receipt */}
                  <div className="bg-[#121212] border border-[#2b2b2b] rounded-xl p-5 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-[#242424]">
                      <span className="text-xs font-bold uppercase tracking-wider text-white">Itemized Receipt</span>
                      <span className="text-xs text-[#888]">Flat Rates Guaranteed</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-[#B3B3B3]">
                      <span>
                        Curator Playlist Pitching ({campaignData.playlistCount} Playlists × ${campaignData.playlistCostPerUnit.toFixed(2)})
                      </span>
                      <span className="font-mono font-bold text-white">${totals.playlistTotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-[#B3B3B3]">
                      <span>
                        Spotify Song Saves Add-on ({campaignData.songSavesCount} Saves × $2.00)
                      </span>
                      <span className="font-mono font-bold text-white">${totals.savesTotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-[#B3B3B3]">
                      <span>
                        Profile Follows Add-on ({campaignData.profileFollowsCount} Follows × $2.00)
                      </span>
                      <span className="font-mono font-bold text-white">${totals.followsTotal.toFixed(2)}</span>
                    </div>

                    {totals.discount > 0 && (
                      <div className="flex justify-between items-center text-xs text-emerald-400 font-semibold">
                        <span>High Volume Tier Discount (10% Off)</span>
                        <span className="font-mono">-${totals.discount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-[#262626] flex justify-between items-baseline">
                      <div>
                        <span className="text-sm font-bold text-white block">Total Amount Due</span>
                        <span className="text-[10px] text-[#777]">Includes all curator screening fees & taxes</span>
                      </div>
                      <span className="text-2xl font-black text-[#E50914] font-['Space_Grotesk']">
                        ${totals.total.toFixed(2)} <span className="text-xs text-[#888] font-normal">USD</span>
                      </span>
                    </div>
                  </div>

                  {/* PayPal Smart Payment Button Gateway */}
                  <div className="bg-[#141414] border border-[#2b2b2b] rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          PayPal Smart Payment Gateway
                        </span>
                      </div>
                      <span className="text-[10px] text-[#888] flex items-center gap-1 font-mono">
                        <Lock className="w-3 h-3 text-[#E50914]" /> 256-Bit SSL Encrypted
                      </span>
                    </div>

                    <p className="text-xs text-[#999]">
                      Click below to authorize and complete the payment of{' '}
                      <strong className="text-white">${totals.total.toFixed(2)} USD</strong> securely.
                    </p>

                    {/* PayPal Official Yellow Smart Button */}
                    <div className="space-y-2.5 pt-1">
                      <button
                        id="paypal-smart-button"
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleExecutePayPalCheckout}
                        className="w-full bg-[#FFC439] hover:bg-[#f2b82e] active:scale-[0.99] text-[#003087] font-extrabold text-sm py-3.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-[#003087]/30 border-t-[#003087] rounded-full animate-spin" />
                        ) : (
                          <>
                            <span className="italic font-serif text-lg font-black tracking-tight text-[#003087]">
                              Pay<span className="text-[#0070BA]">Pal</span>
                            </span>
                            <span className="text-xs font-bold text-[#003087] uppercase tracking-wider ml-1">
                              Checkout (${totals.total.toFixed(2)})
                            </span>
                          </>
                        )}
                      </button>

                      {/* Pay Later / Pay in 4 Button */}
                      <button
                        id="paypal-paylater-button"
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleExecutePayPalCheckout}
                        className="w-full bg-[#0070BA] hover:bg-[#005ea6] active:scale-[0.99] text-white font-bold text-xs py-3 px-4 rounded-xl shadow transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                      >
                        <span className="italic font-serif font-black text-sm">PayPal</span>
                        <span>Pay in 4 Interest-Free Installments</span>
                      </button>

                      {/* Debit or Credit Card Option */}
                      <button
                        id="paypal-card-button"
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleExecutePayPalCheckout}
                        className="w-full bg-[#242424] hover:bg-[#2c2c2c] active:scale-[0.99] text-[#ccc] hover:text-white font-semibold text-xs py-3 px-4 rounded-xl border border-[#383838] transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                      >
                        <CreditCard className="w-4 h-4 text-[#888]" />
                        <span>Debit or Credit Card</span>
                      </button>
                    </div>

                    <div className="pt-2 text-center">
                      <p className="text-[10px] text-[#777]">
                        Protected by PayPal Buyer Protection. If your song is not reviewed within 48 hours, full refund guaranteed.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-[#252525]">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="bg-[#242424] hover:bg-[#2c2c2c] text-[#B3B3B3] hover:text-white text-xs font-semibold px-5 py-3 rounded-xl transition flex items-center space-x-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Add-Ons</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* Sticky Real-Time Cost Summary Sidebar                                     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#181818] border border-[#262626] rounded-2xl p-5 shadow-xl sticky top-20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4 pb-2.5 border-b border-[#262626] flex items-center justify-between">
              <span>Real-Time Receipt</span>
              <span className="text-[#E50914] font-bold">USD</span>
            </h3>

            {campaignData.trackMeta.title && (
              <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-[#222]">
                <img
                  src={campaignData.trackMeta.coverUrl}
                  alt={campaignData.trackMeta.title}
                  className="w-11 h-11 rounded-lg object-cover border border-[#333]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{campaignData.trackMeta.title}</p>
                  <p className="text-[11px] text-[#888] truncate">{campaignData.trackMeta.artist}</p>
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-[#B3B3B3]">
                <span>
                  {campaignData.playlistCount} Curators Pitching
                  <span className="block text-[10px] text-[#777]">${campaignData.playlistCostPerUnit.toFixed(2)} each</span>
                </span>
                <span className="font-semibold text-white font-mono">${totals.playlistTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-[#B3B3B3]">
                <span>
                  {campaignData.songSavesCount} Song Saves
                  <span className="block text-[10px] text-[#777]">$2.00 / save fixed</span>
                </span>
                <span className="font-semibold text-white font-mono">${totals.savesTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-[#B3B3B3]">
                <span>
                  {campaignData.profileFollowsCount} Profile Follows
                  <span className="block text-[10px] text-[#777]">$2.00 / follow fixed</span>
                </span>
                <span className="font-semibold text-white font-mono">${totals.followsTotal.toFixed(2)}</span>
              </div>

              {totals.discount > 0 && (
                <div className="flex justify-between items-center text-emerald-400 font-medium">
                  <span>Volume Tier Discount (10%)</span>
                  <span className="font-mono">-${totals.discount.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-[#262626] flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">Estimated Total</span>
                <span className="text-2xl font-black text-[#E50914] font-['Space_Grotesk']">
                  ${totals.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Quick Next / Pay trigger from sidebar */}
            {currentStep < 5 && (
              <div className="mt-5 pt-4 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setCurrentStep((currentStep + 1) as any)}
                  className="w-full bg-[#E50914] hover:bg-[#c20811] text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-[#E50914]/25 transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Continue to Step {currentStep + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Guarantees */}
            <div className="mt-5 pt-4 border-t border-[#262626] space-y-2 text-[11px] text-[#999]">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>100% Curator Review Guarantee</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Audience Reach: ~{estimatedReach.toLocaleString()} listeners</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Real-Time Placement Tracking</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>PayPal Buyer Protection</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
