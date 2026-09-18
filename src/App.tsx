import React, { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Music, 
  TrendingUp, 
  Users, 
  ChevronRight, 
  CheckCircle2, 
  BarChart3, 
  Star, 
  Zap, 
  LogIn, 
  LogOut, 
  LayoutDashboard, 
  Plus, 
  ShieldCheck, 
  Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { JamBoostLogo } from './components/JamBoostLogo';
import { AuthModal } from './components/AuthModal';
import { SubmissionWizard } from './components/SubmissionWizard';
import { UserDashboard } from './components/UserDashboard';
import { getCurrentUser, signOutUser, type AuthUser } from './lib/supabase';
import type { CampaignTier } from './types';

const TRACK_MOCKS = [
  { artist: "The Midnight", song: "Sunset", plays: "+1,204", time: "Just now" },
  { artist: "Kavinsky", song: "Nightcall", plays: "+532", time: "2 min ago" },
  { artist: "Gunship", song: "Tech Noir", plays: "+8,940", time: "5 min ago" },
  { artist: "Timecop1983", song: "On the Run", plays: "+312", time: "12 min ago" },
  { artist: "FM-84", song: "Running in the Night", plays: "+4,500", time: "18 min ago" },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeView, setActiveView] = useState<'home' | 'dashboard'>('home');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [initialUrl, setInitialUrl] = useState('');

  useEffect(() => {
    // Check for existing session
    getCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user);
      }
    });
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
    setActiveView('home');
  };

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setActiveView('dashboard');
  };

  const handleOpenWizardWithUrl = (url?: string) => {
    if (url) setInitialUrl(url);
    setIsWizardOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white selection:bg-[#82C321] selection:text-black">
      {/* Navigation Header */}
      <header className="fixed top-0 w-full z-40 bg-[#121212]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveView('home')}
              className="flex items-center gap-3 transition-opacity hover:opacity-90 cursor-pointer text-left"
              aria-label="JamBoost Home"
            >
              <JamBoostLogo size="sm" className="h-6 sm:h-7" />
            </button>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-400">
              <button
                onClick={() => setActiveView('home')}
                className={`transition-colors cursor-pointer ${
                  activeView === 'home' ? 'text-white' : 'hover:text-white'
                }`}
              >
                Home
              </button>
              {activeView === 'home' && (
                <>
                  <a href="#features" className="hover:text-white transition-colors">
                    Features
                  </a>
                  <a href="#analytics" className="hover:text-white transition-colors">
                    Live Feed
                  </a>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </>
              )}
              {currentUser && (
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeView === 'dashboard'
                      ? 'text-[#82C321] font-bold'
                      : 'hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
              )}
            </nav>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <button
                  onClick={() => setActiveView(activeView === 'dashboard' ? 'home' : 'dashboard')}
                  className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#82C321]" />
                  <span>{activeView === 'dashboard' ? 'View Website' : 'My Dashboard'}</span>
                </button>

                <button
                  onClick={() => handleOpenWizardWithUrl()}
                  className="h-10 px-4 rounded-xl bg-[#82C321] hover:bg-[#8fd524] text-black text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-[1.02] cursor-pointer shadow-lg shadow-[#82C321]/20"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span className="hidden sm:inline">Submit Track</span>
                </button>

                <button
                  onClick={handleSignOut}
                  title="Log out"
                  className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => openAuth('login')}
                  className="h-10 px-4 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleOpenWizardWithUrl()}
                  className="h-10 px-5 rounded-xl bg-[#82C321] hover:bg-[#8fd524] text-black text-xs font-bold transition-transform hover:scale-105 cursor-pointer shadow-lg shadow-[#82C321]/20"
                >
                  Submit Spotify Link
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="pt-20">
        {activeView === 'dashboard' && currentUser ? (
          <UserDashboard
            user={currentUser}
            onOpenWizard={() => handleOpenWizardWithUrl()}
            onSignOut={handleSignOut}
          />
        ) : (
          <>
            <Hero onOpenWizard={handleOpenWizardWithUrl} onOpenAuth={() => openAuth('signup')} />
            <Stats />
            <LiveAnalytics />
            <Features />
            <Pricing onSelectTier={() => handleOpenWizardWithUrl()} />
          </>
        )}
      </main>

      {/* Footer */}
      <Footer onOpenAuth={() => openAuth('login')} />

      {/* Auth Modal (Supabase Auth) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        onSuccess={handleAuthSuccess}
      />

      {/* Spotify Submission Wizard */}
      <SubmissionWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        currentUser={currentUser}
        onRequestAuth={() => {
          setIsWizardOpen(false);
          openAuth('login');
        }}
        onSubmissionComplete={() => {
          setActiveView('dashboard');
        }}
      />
    </div>
  );
}

/* =========================================================================
   SUB-SECTIONS
   ========================================================================= */

function Hero({ 
  onOpenWizard, 
  onOpenAuth 
}: { 
  onOpenWizard: (url?: string) => void;
  onOpenAuth: () => void;
}) {
  const [trackUrl, setTrackUrl] = useState('');

  const handleBoost = (e: FormEvent) => {
    e.preventDefault();
    onOpenWizard(trackUrl.trim());
  };

  return (
    <section className="pt-24 pb-20 px-6 relative overflow-hidden text-center">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#82C321]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Status Chip */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-[#82C321] font-semibold mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#82C321] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#82C321]"></span>
            </span>
            JamBoost • Real-Time Spotify Campaign Engine
          </div>

          {/* Clean Solid Typography (NO TEXT GRADIENTS) */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 tracking-tight leading-tight text-white">
            Explode Your <span className="text-[#82C321]">Spotify</span> Streams
          </h1>

          <p className="text-base sm:text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Submit your Spotify Track, Album, or Playlist URL. Connect directly to verified curator networks, trigger Spotify algorithms, and track placement growth live.
          </p>

          {/* Spotify Link Submission Bar */}
          <form onSubmit={handleBoost} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Music className="w-5 h-5 text-gray-500" />
              </div>
              <input
                type="text"
                value={trackUrl}
                onChange={(e) => setTrackUrl(e.target.value)}
                placeholder="Paste your Spotify Track, Album, or Playlist URL..."
                className="w-full h-14 pl-12 pr-4 bg-[#161616] border border-white/10 rounded-2xl focus:outline-none focus:border-[#82C321] transition-colors text-white placeholder:text-gray-500 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              className="h-14 px-8 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] cursor-pointer whitespace-nowrap shadow-lg shadow-[#82C321]/20 text-sm"
            >
              <span>Boost Stream Now</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5 text-gray-400">
              <CheckCircle2 className="w-4 h-4 text-[#82C321]" />
              No bot streams — 100% organic playlist additions
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <ShieldCheck className="w-4 h-4 text-[#82C321]" />
              Spotify Terms & Conditions compliant
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="py-12 border-y border-white/5 bg-[#121212]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5">
          {[
            { label: "Active Curators", value: "2,500+" },
            { label: "Streams Delivered", value: "1.2M+" },
            { label: "Placement Success", value: "99.8%" },
            { label: "Avg. Turnaround", value: "< 2 hrs" }
          ].map((stat, i) => (
            <div key={i} className="text-center px-4">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1.5">{stat.value}</div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveAnalytics() {
  const [activeItem, setActiveItem] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveItem((prev) => (prev + 1) % TRACK_MOCKS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="analytics" className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            Live Placement Stream Feed
          </h2>
          <p className="text-sm text-gray-400 max-w-lg mx-auto">
            Tracks promoted across JamBoost networks broadcast live placement and stream updates directly to our dashboards.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Live stream ticker */}
          <div className="bg-[#161616] border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#82C321] animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Real-Time Verified Placements
                </span>
              </div>
              <span className="text-xs text-gray-500">Auto-updating</span>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {TRACK_MOCKS.map((mock, idx) => (
                  <motion.div
                    key={mock.song}
                    layout
                    initial={{ opacity: 0, x: -15, scale: 0.98 }}
                    animate={{ 
                      opacity: idx === activeItem ? 1 : 0.45,
                      x: 0,
                      scale: idx === activeItem ? 1 : 0.98,
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-colors ${
                      idx === activeItem 
                        ? 'bg-[#1e1e1e] border-[#82C321]/30 shadow-md' 
                        : 'bg-transparent border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{mock.song}</div>
                        <div className="text-xs text-gray-400">{mock.artist}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#82C321] text-sm">{mock.plays}</div>
                      <div className="text-[11px] text-gray-500">{mock.time}</div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Feature explanations */}
          <div className="space-y-6">
            <div className="flex gap-4 p-5 rounded-2xl bg-[#141414] border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-[#82C321]/10 flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6 text-[#82C321]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Transparent Realtime Tracking</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Every curator placement, playlist add, and listener trigger is tracked in real-time. Review your campaigns with complete confidence.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-5 rounded-2xl bg-[#141414] border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Spotify Algorithm Triggers</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Engineered to trigger Release Radar and Discover Weekly by maintaining organic save-to-stream ratios above 12%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: Music,
      title: "Direct Spotify Link Wizard",
      desc: "Instant URL validation for Tracks, Albums, and Playlists with automatic media detection and ID parsing.",
    },
    {
      icon: Radio,
      title: "Supabase Realtime Sync",
      desc: "Live database subscriptions keep your campaign statuses, stream counts, and notifications synchronized in real-time.",
    },
    {
      icon: TrendingUp,
      title: "Multi-Tier Growth Engine",
      desc: "Select Starter, Pro, or Viral packages tailored to release velocity, playlist volume, and algorithmic boosts.",
    },
  ];

  return (
    <section id="features" className="py-20 px-6 bg-[#121212] border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            Designed for Modern Musicians & Labels
          </h2>
          <p className="text-sm text-gray-400 max-w-lg mx-auto">
            Everything you need to launch, scale, and monitor your music promotion with 100% transparency.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-[#181818] border border-white/10 hover:border-[#82C321]/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#82C321]/10 flex items-center justify-center mb-5">
                <it.icon className="w-6 h-6 text-[#82C321]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{it.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ onSelectTier }: { onSelectTier: (tier: CampaignTier) => void }) {
  const plans = [
    {
      tier: "Starter" as CampaignTier,
      price: "$29",
      streams: "1,000 - 3,000",
      description: "Perfect for testing the waters and getting initial traction on fresh releases.",
      features: ["Up to 3,000 Streams", "100+ Saves", "5 Playlist Placements", "Realtime Status"],
      icon: Star
    },
    {
      tier: "Pro" as CampaignTier,
      price: "$89",
      streams: "5,000 - 15,000",
      description: "Our most popular tier. Engineered to trigger Spotify's Discover Weekly algorithm.",
      features: ["Up to 15,000 Streams", "500+ Saves", "15 Playlist Placements", "Algorithmic Boost", "Curator Review Priority"],
      icon: Zap,
      popular: true
    },
    {
      tier: "Viral" as CampaignTier,
      price: "$249",
      streams: "20,000 - 50,000",
      description: "Massive exposure across top-tier curated networks and high-save playlists.",
      features: ["Up to 50,000 Streams", "2,000+ Saves", "50 Playlist Placements", "Live Dashboard Access", "Dedicated Campaign Manager"],
      icon: TrendingUp
    }
  ];

  return (
    <section id="pricing" className="py-24 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Transparent Campaign Pricing
          </h2>
          <p className="text-sm text-gray-400">One-time payment per campaign. No recurring subscriptions.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.tier}
              className={`rounded-3xl p-8 relative flex flex-col justify-between ${
                plan.popular 
                  ? 'bg-[#181818] border-2 border-[#82C321] shadow-xl shadow-[#82C321]/10' 
                  : 'bg-[#141414] border border-white/10'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#82C321] text-black px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                  <plan.icon className={`w-6 h-6 ${plan.popular ? 'text-[#82C321]' : 'text-gray-400'}`} />
                </div>

                <h3 className="text-2xl font-bold text-white mb-1">{plan.tier}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm"> / track</span>
                </div>
                <p className="text-gray-400 text-xs mb-6 pb-6 border-b border-white/5">{plan.description}</p>

                <ul className="space-y-3.5 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-[#82C321] shrink-0 mt-0.5" />
                      <span className="text-xs font-medium text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => onSelectTier(plan.tier)}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
                  plan.popular 
                    ? 'bg-[#82C321] hover:bg-[#8fd524] text-black' 
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                }`}
              >
                Launch {plan.tier} Campaign
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ onOpenAuth }: { onOpenAuth: () => void }) {
  return (
    <footer className="border-t border-white/5 py-12 px-6 bg-[#101010]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <JamBoostLogo size="sm" className="h-6" />
        </div>
        <p className="text-gray-500 text-xs text-center md:text-left max-w-md">
          © {new Date().getFullYear()} JamBoost. All rights reserved. Disclaimer: JamBoost is an independent music marketing tool and is not affiliated with, endorsed, or sponsored by Spotify AB.
        </p>
        <div className="flex items-center gap-5 text-xs text-gray-400">
          <button onClick={onOpenAuth} className="hover:text-white transition-colors cursor-pointer">
            Artist Portal
          </button>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}
