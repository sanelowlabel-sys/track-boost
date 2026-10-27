import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Music, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  Loader2,
  Star, 
  Zap, 
  TrendingUp, 
  CreditCard,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase, createSubmission, type AuthUser } from '../lib/supabase';
import { 
  PLANS, 
  DISPLAY_PLANS,
  type CampaignTier, 
  type SpotifyLookupResult, 
  type SubmissionFormData, 
  type Submission 
} from '../types';

interface SubmissionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  initialUrl?: string;
  initialPlan?: CampaignTier;
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
  initialUrl = '',
  initialPlan = 'Pro',
  onRequestAuth,
  onSubmissionComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [url, setUrl] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [spotifyItem, setSpotifyItem] = useState<SpotifyLookupResult | null>(null);

  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const [genre, setGenre] = useState('Synthwave / Retro');
  const [territory, setTerritory] = useState('Global Worldwide');
  const [plan, setPlan] = useState<CampaignTier>(initialPlan);

  // Mandatory checkboxes
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdSubmission, setCreatedSubmission] = useState<Submission | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Check duplicate submission for current user with same spotify_id not Completed or Rejected
  const checkDuplicate = async (spotifyId: string): Promise<boolean> => {
    if (!supabase || !currentUser?.id) return false;
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('id, status, title')
        .eq('spotify_id', spotifyId)
        .not('status', 'in', '("Completed","Rejected")');

      if (error) {
        console.warn('Error checking duplicate campaign:', error);
        return false;
      }

      if (data && data.length > 0) {
        const existing = data[0];
        setDuplicateError(
          `You already have an active campaign for this release ("${existing.title}") in status "${existing.status}". Duplicate submissions are not allowed until the current campaign is Completed or Rejected.`
        );
        return true;
      } else {
        setDuplicateError(null);
        return false;
      }
    } catch {
      return false;
    }
  };

  // Perform Spotify Web API lookup via server route /api/spotify/lookup
  const performLookup = async (spotifyUrl: string) => {
    const cleaned = spotifyUrl.trim();
    if (!cleaned) {
      setSpotifyItem(null);
      setLookupError(null);
      setDuplicateError(null);
      return;
    }

    const isPotentialSpotifyLink =
      cleaned.includes('spotify.com/track/') ||
      cleaned.includes('spotify.com/album/') ||
      cleaned.includes('spotify.com/playlist/') ||
      cleaned.startsWith('spotify:');

    if (!isPotentialSpotifyLink) {
      setSpotifyItem(null);
      setLookupError('Please enter a valid Spotify Track, Album, or Playlist URL.');
      return;
    }

    setLookingUp(true);
    setLookupError(null);
    setDuplicateError(null);

    try {
      const session = (await supabase?.auth.getSession())?.data.session;
      if (!session?.access_token) {
        setLookingUp(false);
        setLookupError('Please sign in to verify your Spotify release and launch campaigns.');
        return;
      }

      const response = await fetch(`/api/spotify/lookup?url=${encodeURIComponent(cleaned)}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setSpotifyItem(null);
        setLookupError(data.error || 'Failed to lookup Spotify release.');
        return;
      }

      const item = data as SpotifyLookupResult;
      setSpotifyItem(item);
      setLookupError(null);

      // Check if user already has an active campaign for this Spotify ID
      await checkDuplicate(item.id);
    } catch (err: any) {
      setSpotifyItem(null);
      setLookupError(err?.message || 'Network error looking up Spotify release.');
    } finally {
      setLookingUp(false);
    }
  };

  // Reset all wizard state each time it opens & initialize with passed URL/plan
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setLookingUp(false);
      setLookupError(null);
      setSpotifyItem(null);
      setDuplicateError(null);
      setGenre('Synthwave / Retro');
      setTerritory('Global Worldwide');
      setPlan(initialPlan || 'Pro');
      setIsAuthorized(false);
      setAgreedToTerms(false);
      setSubmitting(false);
      setErrorMsg(null);
      setCreatedSubmission(null);
      setCheckoutLoading(false);
      setCheckoutUrl(null);
      setCheckoutError(null);

      const trimmedUrl = (initialUrl || '').trim();
      setUrl(trimmedUrl);

      // If URL typed in hero form is present, skip straight to validation
      if (trimmedUrl) {
        performLookup(trimmedUrl);
      }
    }
  }, [isOpen, initialUrl, initialPlan]);

  if (!isOpen) return null;

  const handleStep1Next = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequestAuth();
      return;
    }
    if (lookingUp) return;
    if (!spotifyItem) {
      setLookupError('Please enter a valid Spotify URL to lookup the release details.');
      return;
    }
    if (duplicateError) {
      return;
    }
    if (!isAuthorized || !agreedToTerms) {
      setErrorMsg('You must agree to all authorizations and terms to continue.');
      return;
    }

    setErrorMsg(null);
    setStep(2);
  };

  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  // Initiate PayPal Checkout for the created submission
  const initiateCheckout = async (submissionId: string) => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const session = (await supabase?.auth.getSession())?.data.session;
      if (!session?.access_token) {
        throw new Error('User session expired. Please sign in again.');
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ submission_id: submissionId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize PayPal checkout.');
      }

      if (data.checkout_url) {
        setCheckoutUrl(data.checkout_url);
        // Redirect to PayPal hosted checkout URL
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL returned from server.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setCheckoutError(err?.message || 'Error connecting to PayPal checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!currentUser) {
      onRequestAuth();
      return;
    }
    if (!spotifyItem) return;

    setSubmitting(true);
    setErrorMsg(null);

    const selectedPlan = PLANS[plan];
    const formData: SubmissionFormData = {
      spotify_url: spotifyItem.spotify_url,
      item_type: spotifyItem.type,
      title: spotifyItem.title,
      artist: spotifyItem.artists.join(', '),
      genre,
      territory,
      plan,
      target_streams: 0,
    };

    try {
      const created = await createSubmission(formData);
      setCreatedSubmission(created);
      confetti({
        particleCount: 110,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#82C321', '#1DB954', '#ffffff'],
      });
      // Move to checkout transition step
      setStep(4);
      // Immediately initiate checkout redirect
      initiateCheckout(created.id);
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
          className="relative w-full max-w-2xl bg-[#181818] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-white max-h-[92vh] flex flex-col"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
            <div>
              <span className="text-xs font-bold text-[#82C321] tracking-wider uppercase">
                Spotify Promotion Wizard
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {step === 1 && 'Step 1: Validate Spotify Release'}
                {step === 2 && 'Step 2: Choose Growth Plan & Genre'}
                {step === 3 && 'Step 3: Review Campaign Details'}
                {step === 4 && 'Step 4: Campaign Created'}
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

          {/* Stepper indicators (hidden on step 4) */}
          {step <= 3 && (
            <div className="flex items-center justify-between mb-8 px-2 sm:px-6">
              {[
                { num: 1, label: 'Spotify Link' },
                { num: 2, label: 'Target Strategy' },
                { num: 3, label: 'Review & Confirm' },
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
          )}

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-400 text-sm shrink-0">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto pr-1">
            {/* STEP 1: LINK VALIDATION & READ-ONLY METADATA */}
            {step === 1 && (
              <form onSubmit={handleStep1Next} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                    Spotify Track, Album, or Playlist URL / URI
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-500">
                        <Music className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://open.spotify.com/track/..."
                        required
                        className="w-full h-14 pl-12 pr-12 bg-[#121212] border border-white/10 rounded-2xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#82C321] transition-colors"
                      />
                      {lookingUp && (
                        <div className="absolute inset-y-0 right-4 flex items-center text-[#82C321]">
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      )}
                      {!lookingUp && spotifyItem && (
                        <div className="absolute inset-y-0 right-4 flex items-center text-[#82C321]">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => performLookup(url)}
                      disabled={lookingUp || !url.trim()}
                      className="h-14 px-5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-2xl transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {lookingUp ? 'Checking...' : 'Lookup'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Supports public Track, Album, or Playlist links from Spotify.
                  </p>
                </div>

                {/* Lookup error message */}
                {lookupError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p>{lookupError}</p>
                      {!currentUser && (
                        <button
                          type="button"
                          onClick={onRequestAuth}
                          className="mt-2 text-[#82C321] underline font-bold cursor-pointer"
                        >
                          Sign in to JamBoost to continue
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Duplicate Campaign Warning */}
                {duplicateError && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-300 text-xs">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <p className="font-bold text-amber-200 mb-1">Duplicate Campaign Blocked</p>
                      <p>{duplicateError}</p>
                    </div>
                  </div>
                )}

                {/* Loading state indicator */}
                {lookingUp && (
                  <div className="p-8 bg-[#121212] rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-[#82C321] animate-spin" />
                    <p className="text-sm font-semibold text-white">Validating release with Spotify Web API...</p>
                    <p className="text-xs text-gray-500">Retrieving official artwork, title, and artist credits</p>
                  </div>
                )}

                {/* Read-Only Verified Spotify Card */}
                {!lookingUp && spotifyItem && (
                  <div className="p-4 sm:p-5 bg-[#121212] rounded-2xl border border-[#82C321]/30 space-y-4">
                    <div className="flex items-center gap-4">
                      {spotifyItem.image_url ? (
                        <img
                          src={spotifyItem.image_url}
                          alt={spotifyItem.title}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0 border border-white/10 shadow-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <Music className="w-8 h-8 text-gray-500" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#82C321]/20 text-[#82C321] text-[10px] font-bold uppercase tracking-wider">
                            Verified Spotify {spotifyItem.type}
                          </span>
                          <span className="text-[11px] text-gray-500 font-mono">
                            ID: {spotifyItem.id}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white truncate">{spotifyItem.title}</h3>
                        <p className="text-sm text-gray-400 truncate">
                          {spotifyItem.artists.join(', ') || 'Unknown Artist'}
                        </p>
                      </div>
                    </div>

                    {/* Required Legal and Authorization Checkboxes */}
                    <div className="pt-3 border-t border-white/5 space-y-2.5 text-xs">
                      <label className="flex items-start gap-2.5 cursor-pointer text-gray-300 hover:text-white">
                        <input
                          type="checkbox"
                          checked={isAuthorized}
                          onChange={(e) => setIsAuthorized(e.target.checked)}
                          className="mt-0.5 rounded border-white/20 bg-[#181818] text-[#82C321] focus:ring-[#82C321] cursor-pointer"
                        />
                        <span>
                          I am the artist, or I am authorised to promote this release on the artist's behalf.
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer text-gray-300 hover:text-white">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-0.5 rounded border-white/20 bg-[#181818] text-[#82C321] focus:ring-[#82C321] cursor-pointer"
                        />
                        <span>
                          I agree to the{' '}
                          <a
                            href="/terms"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#82C321] underline hover:text-[#8fd524]"
                          >
                            Terms of Service
                          </a>{' '}
                          and{' '}
                          <a
                            href="/privacy"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#82C321] underline hover:text-[#8fd524]"
                          >
                            Privacy Policy
                          </a>
                          .
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {!currentUser && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4">
                    <div className="text-xs text-amber-200">
                      <p className="font-semibold">Sign In Required</p>
                      <p className="text-amber-300/80">Please sign in to verify release metadata and continue.</p>
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

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={!spotifyItem || lookingUp || Boolean(duplicateError) || !isAuthorized || !agreedToTerms}
                    className="h-12 px-6 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl flex items-center gap-2 transition-transform hover:scale-[1.02] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Continue to Target Strategy</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: STRATEGY & CAMPAIGN PLAN (USING SHARED PLANS CONSTANT) */}
            {step === 2 && (
              <form onSubmit={handleStep2Next} className="space-y-6">
                {/* Growth Tier Plan */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
                    Choose Promotion Growth Package
                  </label>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {DISPLAY_PLANS.map((p) => {
                      const IconComponent = p.tier === 'Starter' ? Star : p.tier === 'Pro' ? Zap : TrendingUp;
                      return (
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
                          <IconComponent className={`w-5 h-5 mb-2 ${plan === p.tier ? 'text-[#82C321]' : 'text-gray-400'}`} />
                          <div className="font-bold text-base text-white">{p.name}</div>
                          <div className="text-xl font-bold text-[#82C321] mt-0.5">{p.priceDisplay}</div>
                          <div className="text-xs font-semibold text-gray-300 mt-1">{p.curatorsPitched} Curators Pitched</div>
                          <div className="text-[11px] text-gray-400 mt-1 line-clamp-2">{p.description}</div>
                        </button>
                      );
                    })}
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
                    <span>Review Campaign</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: REVIEW CAMPAIGN (NO INSTANT QUEUEING/REALTIME DISPATCH) */}
            {step === 3 && spotifyItem && (
              <div className="space-y-6">
                <div className="p-5 bg-[#121212] rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-start gap-4">
                    {spotifyItem.image_url ? (
                      <img
                        src={spotifyItem.image_url}
                        alt={spotifyItem.title}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/10"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <Music className="w-6 h-6 text-gray-500" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <span className="inline-block px-2 py-0.5 rounded bg-[#82C321]/20 text-[#82C321] text-[10px] font-bold uppercase tracking-wider mb-1">
                        Spotify {spotifyItem.type}
                      </span>
                      <h3 className="text-xl font-bold text-white truncate">{spotifyItem.title}</h3>
                      <p className="text-sm text-gray-400 font-medium truncate">{spotifyItem.artists.join(', ')}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-2xl font-bold text-[#82C321]">
                        {PLANS[plan].priceDisplay}
                      </span>
                      <span className="block text-xs text-gray-400">{PLANS[plan].name} Plan</span>
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
                      <span className="text-gray-500">Curator Outreach:</span>
                      <p className="font-semibold text-white mt-0.5">
                        {PLANS[plan].curatorsPitched} Curators Pitched
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Payment Status:</span>
                      <p className="font-semibold text-amber-400 mt-0.5">Awaiting payment</p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#181818] rounded-xl text-xs text-gray-400 break-all">
                    <span className="text-gray-500 block mb-0.5">Spotify URL:</span>
                    <a
                      href={spotifyItem.spotify_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-300 hover:text-[#82C321] underline"
                    >
                      {spotifyItem.spotify_url}
                    </a>
                  </div>
                </div>

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
                        <span>Proceed to Payment</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: SECURE PAYPAL CHECKOUT REDIRECT SCREEN */}
            {step === 4 && spotifyItem && (
              <div className="py-6 px-4 text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-[#82C321]/15 border border-[#82C321]/30 flex items-center justify-center text-[#82C321]">
                  {checkoutLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <CreditCard className="w-8 h-8" />
                  )}
                </div>

                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Status: Awaiting payment
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-3 mb-2">
                    {checkoutLoading ? 'Redirecting to PayPal Checkout...' : 'Proceed to Secure Checkout'}
                  </h3>
                  <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                    Your campaign for <span className="text-white font-semibold">{spotifyItem.title}</span> is registered. Complete payment via PayPal to initiate curator review.
                  </p>
                </div>

                {/* Price and Currency clearly displayed */}
                <div className="bg-[#121212] p-5 rounded-2xl border border-white/5 max-w-md mx-auto text-left text-xs space-y-3">
                  <div className="flex justify-between text-gray-400">
                    <span>Release:</span>
                    <span className="text-white font-medium truncate max-w-[220px]">{spotifyItem.title}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Campaign Package:</span>
                    <span className="text-white font-medium">
                      {PLANS[plan].name} ({PLANS[plan].curatorsPitched} Curators Pitched)
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Currency:</span>
                    <span className="text-white font-medium">USD (United States Dollars)</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-400 pt-3 border-t border-white/5">
                    <span className="font-bold text-white text-sm">Total Due:</span>
                    <span className="font-extrabold text-[#82C321] text-lg">
                      {PLANS[plan].priceDisplay} USD
                    </span>
                  </div>
                </div>

                {/* Clear Refund Policy Link */}
                <div className="text-xs text-gray-400 max-w-md mx-auto">
                  Backed by our 100% Curator Acceptance Guarantee. Review our{' '}
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

                {checkoutError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-left max-w-md mx-auto flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">Checkout Error</p>
                      <p>{checkoutError}</p>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {createdSubmission && (
                    <button
                      type="button"
                      onClick={() => initiateCheckout(createdSubmission.id)}
                      disabled={checkoutLoading}
                      className="w-full sm:w-auto h-12 px-8 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl text-sm transition-transform hover:scale-[1.02] cursor-pointer shadow-lg shadow-[#82C321]/20 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {checkoutLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Connecting PayPal...</span>
                        </>
                      ) : (
                        <>
                          <span>Pay {PLANS[plan].priceDisplay} USD via PayPal</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onSubmissionComplete();
                      onClose();
                    }}
                    className="w-full sm:w-auto h-12 px-6 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    View in Dashboard
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
