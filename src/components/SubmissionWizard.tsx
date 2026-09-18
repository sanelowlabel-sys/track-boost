import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Music, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  Globe, 
  Radio, 
  Zap, 
  Star, 
  TrendingUp, 
  Disc, 
  ListMusic, 
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { extractSpotifyId, detectSpotifyType, createSubmission, type AuthUser } from '../lib/supabase';
import type { CampaignTier, SpotifyItemType, SubmissionFormData } from '../types';

interface SubmissionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onRequestAuth: () => void;
  onSubmissionComplete: () => void;
}

const GENRE_OPTIONS = [
  'Synthwave / Retro',
  'Electronic / EDM',
  'Hip-Hop / Rap',
  'Pop / Commercial',
  'Indie Rock / Alt',
  'Lo-Fi / Chill Beats',
  'R&B / Soul',
  'House / Tech House',
  'Acoustic / Folk',
  'Latin / Reggaeton',
];

const TERRITORY_OPTIONS = [
  'Global Worldwide',
  'United States & Canada',
  'United Kingdom & Europe',
  'Latin America',
  'Asia-Pacific',
];

export const SubmissionWizard: React.FC<SubmissionWizardProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRequestAuth,
  onSubmissionComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [url, setUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [itemType, setItemType] = useState<SpotifyItemType>('track');
  const [spotifyId, setSpotifyId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('Synthwave / Retro');
  const [territory, setTerritory] = useState('Global Worldwide');
  const [plan, setPlan] = useState<CampaignTier>('Pro');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Validate Spotify link live as user types or pastes
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      setIsValidUrl(false);
      setSpotifyId(null);
      return;
    }

    const id = extractSpotifyId(trimmed);
    const detected = detectSpotifyType(trimmed);

    if (id && detected) {
      setIsValidUrl(true);
      setSpotifyId(id);
      setItemType(detected);
      setErrorMsg(null);

      // Auto-populate placeholder title/artist if empty
      if (!title) {
        if (detected === 'track') setTitle('Midnight Echoes');
        else if (detected === 'album') setTitle('Nocturnal Horizon LP');
        else setTitle('Late Night Synth Playlist');
      }
      if (!artist && currentUser?.name) {
        setArtist(currentUser.name);
      } else if (!artist) {
        setArtist('Featured Artist');
      }
    } else {
      setIsValidUrl(false);
      setSpotifyId(null);
      if (trimmed.length > 15) {
        setErrorMsg('Please provide a valid Spotify Track, Album, or Playlist link (e.g. https://open.spotify.com/track/...)');
      }
    }
  }, [url, currentUser]);

  if (!isOpen) return null;

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUrl) {
      setErrorMsg('Please enter a valid Spotify link before proceeding.');
      return;
    }
    if (!title.trim() || !artist.trim()) {
      setErrorMsg('Please specify the title and artist.');
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    if (!currentUser) {
      onRequestAuth();
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const targetStreamsMap: Record<CampaignTier, number> = {
      Starter: 3000,
      Pro: 15000,
      Viral: 50000,
    };

    const formData: SubmissionFormData = {
      spotify_url: url.trim(),
      item_type: itemType,
      title: title.trim(),
      artist: artist.trim(),
      genre,
      territory,
      plan,
      target_streams: targetStreamsMap[plan],
    };

    try {
      await createSubmission(formData, currentUser);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#82C321', '#1DB954', '#ffffff'],
      });
      onSubmissionComplete();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit track. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-2xl bg-[#181818] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-white max-h-[90vh] flex flex-col"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
            <div>
              <span className="text-xs font-bold text-[#82C321] tracking-wider uppercase">
                Spotify Promotion Wizard
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {step === 1 && 'Step 1: Enter & Validate Spotify Link'}
                {step === 2 && 'Step 2: Choose Campaign & Target Genre'}
                {step === 3 && 'Step 3: Review & Realtime Launch'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper indicators */}
          <div className="flex items-center justify-between mb-8 px-2 sm:px-6">
            {[
              { num: 1, label: 'Spotify Link' },
              { num: 2, label: 'Target Strategy' },
              { num: 3, label: 'Review & Launch' },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    step === s.num
                      ? 'bg-[#82C321] text-black ring-4 ring-[#82C321]/20'
                      : step > s.num
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-gray-400'
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <span
                  className={`text-xs font-semibold hidden sm:inline ${
                    step >= s.num ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {s.label}
                </span>
                {idx < 2 && (
                  <div
                    className={`w-8 sm:w-16 h-0.5 mx-1 transition-colors ${
                      step > s.num ? 'bg-white' : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-400 text-sm shrink-0">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto pr-1">
            {/* STEP 1: LINK VALIDATION & METADATA */}
            {step === 1 && (
              <form onSubmit={handleStep1Next} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                    Spotify Track, Album, or Playlist URL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-500">
                      <Music className="w-5 h-5" />
                    </div>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"
                      required
                      className="w-full h-14 pl-12 pr-12 bg-[#121212] border border-white/10 rounded-2xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#82C321] transition-colors"
                    />
                    {isValidUrl && (
                      <div className="absolute inset-y-0 right-4 flex items-center text-[#82C321]">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>Supports open.spotify.com links or spotify:track URIs</span>
                    <button
                      type="button"
                      onClick={() => setUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')}
                      className="text-[#82C321] hover:underline cursor-pointer"
                    >
                      Paste Sample Track
                    </button>
                  </div>
                </div>

                {isValidUrl && (
                  <div className="p-4 bg-[#121212] rounded-2xl border border-[#82C321]/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-[#82C321]/20 text-[#82C321] text-xs font-bold uppercase tracking-wider">
                          Validated Spotify {itemType}
                        </span>
                        <span className="text-xs text-gray-400">ID: {spotifyId}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setItemType('track')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                            itemType === 'track' ? 'bg-[#82C321] text-black' : 'bg-white/5 text-gray-400'
                          }`}
                        >
                          Track
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemType('album')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                            itemType === 'album' ? 'bg-[#82C321] text-black' : 'bg-white/5 text-gray-400'
                          }`}
                        >
                          Album
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemType('playlist')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                            itemType === 'playlist' ? 'bg-[#82C321] text-black' : 'bg-white/5 text-gray-400'
                          }`}
                        >
                          Playlist
                        </button>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                          Release / Track Title
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Sunset in Malibu"
                          required
                          className="w-full h-11 px-3.5 bg-[#181818] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#82C321]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                          Artist / Creator Name
                        </label>
                        <input
                          type="text"
                          value={artist}
                          onChange={(e) => setArtist(e.target.value)}
                          placeholder="e.g. The Midnight"
                          required
                          className="w-full h-11 px-3.5 bg-[#181818] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#82C321]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={!isValidUrl}
                    className="h-12 px-6 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl flex items-center gap-2 transition-transform hover:scale-[1.02] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Continue to Target Strategy</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: STRATEGY & CAMPAIGN PLAN */}
            {step === 2 && (
              <form onSubmit={handleStep2Next} className="space-y-6">
                {/* Growth Tier Plan */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
                    Choose Promotion Growth Package
                  </label>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      {
                        tier: 'Starter' as CampaignTier,
                        price: '$29',
                        streams: '1K - 3K Streams',
                        desc: '5+ Curated Playlists',
                        icon: Star,
                      },
                      {
                        tier: 'Pro' as CampaignTier,
                        price: '$89',
                        streams: '5K - 15K Streams',
                        desc: '15+ Lists + Algorithmic Boost',
                        popular: true,
                        icon: Zap,
                      },
                      {
                        tier: 'Viral' as CampaignTier,
                        price: '$249',
                        streams: '20K - 50K Streams',
                        desc: '50+ Lists + Release Radar Push',
                        icon: TrendingUp,
                      },
                    ].map((p) => (
                      <button
                        key={p.tier}
                        type="button"
                        onClick={() => setPlan(p.tier)}
                        className={`p-4 rounded-2xl border text-left relative transition-all cursor-pointer ${
                          plan === p.tier
                            ? 'bg-[#121212] border-2 border-[#82C321] shadow-lg shadow-[#82C321]/10'
                            : 'bg-[#121212]/50 border-white/5 hover:border-white/20'
                        }`}
                      >
                        {p.popular && (
                          <div className="absolute -top-2.5 right-3 bg-[#82C321] text-black px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Popular
                          </div>
                        )}
                        <p.icon className={`w-5 h-5 mb-2 ${plan === p.tier ? 'text-[#82C321]' : 'text-gray-400'}`} />
                        <div className="font-bold text-base text-white">{p.tier}</div>
                        <div className="text-xl font-bold text-[#82C321] mt-0.5">{p.price}</div>
                        <div className="text-xs font-semibold text-gray-300 mt-1">{p.streams}</div>
                        <div className="text-[11px] text-gray-400 mt-1">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Genre Targets */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                    Primary Genre Target
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GENRE_OPTIONS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGenre(g)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          genre === g
                            ? 'bg-white text-black'
                            : 'bg-[#121212] border border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Territory */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                    Audience Territory Focus
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TERRITORY_OPTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTerritory(t)}
                        className={`p-3 rounded-xl border text-xs font-semibold text-center transition-colors cursor-pointer ${
                          territory === t
                            ? 'bg-[#82C321]/15 border-[#82C321] text-[#82C321]'
                            : 'bg-[#121212] border-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="h-12 px-5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="h-12 px-6 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl flex items-center gap-2 transition-transform hover:scale-[1.02] cursor-pointer"
                  >
                    <span>Review Order</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: REVIEW & REALTIME LAUNCH */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="p-5 bg-[#121212] rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded bg-[#82C321]/20 text-[#82C321] text-[11px] font-bold uppercase tracking-wider mb-1">
                        Spotify {itemType.toUpperCase()}
                      </span>
                      <h3 className="text-xl font-bold text-white">{title}</h3>
                      <p className="text-sm text-gray-400 font-medium">{artist}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-[#82C321]">
                        {plan === 'Viral' ? '$249' : plan === 'Pro' ? '$89' : '$29'}
                      </span>
                      <span className="block text-xs text-gray-400">{plan} Tier</span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-white/5 text-xs">
                    <div>
                      <span className="text-gray-500">Target Genre:</span>
                      <p className="font-semibold text-white mt-0.5">{genre}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Target Territory:</span>
                      <p className="font-semibold text-white mt-0.5">{territory}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Target Delivery:</span>
                      <p className="font-semibold text-white mt-0.5">
                        {plan === 'Viral' ? '20,000 - 50,000 Streams' : plan === 'Pro' ? '5,000 - 15,000 Streams' : '1,000 - 3,000 Streams'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Realtime Dispatch:</span>
                      <p className="font-semibold text-[#82C321] mt-0.5">Instant Queueing</p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#181818] rounded-xl text-xs text-gray-400 break-all">
                    <span className="text-gray-500 block mb-0.5">Spotify Link:</span>
                    <a href={url} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-[#82C321] underline">
                      {url}
                    </a>
                  </div>
                </div>

                {!currentUser && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4">
                    <div className="text-xs text-amber-200">
                      <p className="font-semibold">Authentication Required</p>
                      <p className="text-amber-300/80">Please sign in or register with Supabase Auth to connect this campaign to your dashboard.</p>
                    </div>
                    <button
                      type="button"
                      onClick={onRequestAuth}
                      className="px-4 py-2 bg-white text-black text-xs font-bold rounded-xl whitespace-nowrap hover:bg-gray-200 cursor-pointer"
                    >
                      Sign In Now
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="h-12 px-5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={submitting}
                    className="h-12 px-8 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl flex items-center gap-2 transition-transform hover:scale-[1.02] cursor-pointer shadow-lg shadow-[#82C321]/20 disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Launch Campaign Now</span>
                        <Zap className="w-4 h-4 fill-black" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
