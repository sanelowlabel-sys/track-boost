import React, { useState, useEffect, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { 
  Play, 
  Music, 
  ChevronRight, 
  CheckCircle2, 
  BarChart3, 
  Star, 
  Zap, 
  TrendingUp,
  LogIn, 
  LogOut, 
  LayoutDashboard, 
  Plus, 
  ShieldCheck, 
  Radio,
  AlertCircle,
  FileText,
  Lock,
  Headphones,
  Mail,
  Send,
  Layers
} from 'lucide-react';
import { JamBoostLogo } from './components/JamBoostLogo';
import { AuthModal } from './components/AuthModal';
import { SubmissionWizard } from './components/SubmissionWizard';
import { UserDashboard } from './components/UserDashboard';
import { RefundPolicy } from './components/RefundPolicy';
import { TermsOfService } from './components/TermsOfService';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { ContactUs } from './components/ContactUs';
import { AdminDashboard } from './components/AdminDashboard';
import { NotFound } from './components/NotFound';
import { isSupabaseConfigured, supabase, signOutUser, type AuthUser } from './lib/supabase';
import { PLANS, DISPLAY_PLANS, type CampaignTier } from './types';

export type AppView = 'home' | 'dashboard' | 'refunds' | 'terms' | 'privacy' | 'contact' | 'admin';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [activeView, setActiveView] = useState<AppView>('home');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'resetPassword'>('login');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [initialUrl, setInitialUrl] = useState('');
  const [initialPlan, setInitialPlan] = useState<CampaignTier>('Pro');

  const fetchProfileRole = async (userId: string) => {
    setRoleLoading(true);
    if (!supabase) {
      setRoleLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data?.role) {
        setUserRole(data.role);
      } else {
        setUserRole('artist');
      }
    } catch {
      setUserRole('artist');
    } finally {
      setRoleLoading(false);
    }
  };

  const resolvePathToView = (pathname: string): AppView => {
    if (pathname === '/admin') return 'admin';
    if (pathname === '/refunds') return 'refunds';
    if (pathname === '/terms') return 'terms';
    if (pathname === '/privacy') return 'privacy';
    if (pathname === '/contact') return 'contact';
    if (pathname.startsWith('/dashboard')) return 'dashboard';
    return 'home';
  };

  useEffect(() => {
    // Check initial path on load
    if (typeof window !== 'undefined') {
      setActiveView(resolvePathToView(window.location.pathname));
    }

    const handlePopState = () => {
      setActiveView(resolvePathToView(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);

    if (!supabase) return () => window.removeEventListener('popstate', handlePopState);

    // Detect password recovery in URL hash on mount
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setAuthMode('resetPassword');
      setIsAuthOpen(true);
    }

    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        });
        fetchProfileRole(session.user.id);
      } else {
        setRoleLoading(false);
      }
    });

    // Single source of truth for auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        });
        fetchProfileRole(session.user.id);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setRoleLoading(false);
      }

      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('resetPassword');
        setIsAuthOpen(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const navigateTo = (view: AppView) => {
    setActiveView(view);
    if (typeof window !== 'undefined') {
      const path = view === 'home' ? '/' : `/${view}`;
      window.history.pushState({}, '', path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
    setUserRole(null);
    navigateTo('home');
  };

  const openAuth = (mode: 'login' | 'signup' | 'forgot' | 'resetPassword') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    navigateTo('dashboard');
  };

  const handleOpenWizardWithUrl = (url?: string, tier?: CampaignTier) => {
    setInitialUrl(url || '');
    if (tier) setInitialPlan(tier);
    else setInitialPlan('Pro');
    setIsWizardOpen(true);
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[#0E0E0E] text-white flex flex-col items-center justify-center p-6 text-center selection:bg-[#82C321] selection:text-black">
        <div className="w-full max-w-md bg-[#181818] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <JamBoostLogo size="sm" className="h-7" />
          </div>
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
            Service Not Configured
          </h1>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            JamBoost requires live Supabase database and authentication services to operate in production mode.
          </p>
          <div className="p-4 bg-[#121212] border border-white/5 rounded-2xl text-left text-xs text-gray-400 space-y-2.5">
            <div className="font-semibold text-gray-300">Required Environment Variables:</div>
            <div className="font-mono text-[11px] text-gray-300 break-all bg-black/40 p-2.5 rounded-lg border border-white/5">
              <span className="text-[#82C321]">VITE_SUPABASE_URL</span>=https://your-project.supabase.co
            </div>
            <div className="font-mono text-[11px] text-gray-300 break-all bg-black/40 p-2.5 rounded-lg border border-white/5">
              <span className="text-[#82C321]">VITE_SUPABASE_ANON_KEY</span>=your-anon-key
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white selection:bg-[#82C321] selection:text-black">
      {/* Navigation Header */}
      <header className="fixed top-0 w-full z-40 bg-[#121212]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigateTo('home')}
              className="flex items-center gap-3 transition-opacity hover:opacity-90 cursor-pointer text-left"
              aria-label="JamBoost Home"
            >
              <JamBoostLogo size="sm" className="h-6 sm:h-7" />
            </button>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-400">
              <button
                onClick={() => navigateTo('home')}
                className={`transition-colors cursor-pointer ${
                  activeView === 'home' ? 'text-white' : 'hover:text-white'
                }`}
              >
                Home
              </button>
              {activeView === 'home' && (
                <>
                  <a href="#how-it-works" className="hover:text-white transition-colors">
                    How It Works
                  </a>
                  <a href="#features" className="hover:text-white transition-colors">
                    Features
                  </a>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </>
              )}
              {currentUser && (
                <button
                  onClick={() => navigateTo('dashboard')}
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
              {currentUser && userRole === 'admin' && (
                <button
                  onClick={() => navigateTo('admin')}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeView === 'admin'
                      ? 'text-[#82C321] font-bold'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              )}
              <button
                onClick={() => navigateTo('refunds')}
                className={`transition-colors cursor-pointer ${
                  activeView === 'refunds' ? 'text-white font-bold' : 'hover:text-white'
                }`}
              >
                Refunds
              </button>
              <button
                onClick={() => navigateTo('contact')}
                className={`transition-colors cursor-pointer ${
                  activeView === 'contact' ? 'text-white font-bold' : 'hover:text-white'
                }`}
              >
                Contact
              </button>
            </nav>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                {userRole === 'admin' && (
                  <button
                    onClick={() => navigateTo(activeView === 'admin' ? 'dashboard' : 'admin')}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 border border-amber-500/20 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{activeView === 'admin' ? 'Artist Dashboard' : 'Admin Area'}</span>
                  </button>
                )}

                <button
                  onClick={() => navigateTo(activeView === 'dashboard' ? 'home' : 'dashboard')}
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
        {activeView === 'admin' ? (
          roleLoading ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
              <div className="w-10 h-10 border-2 border-[#82C321] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-400">Verifying administrator access...</p>
            </div>
          ) : currentUser && userRole === 'admin' ? (
            <AdminDashboard currentUser={currentUser} />
          ) : (
            <NotFound onHome={() => navigateTo('home')} />
          )
        ) : activeView === 'refunds' ? (
          <RefundPolicy onBack={() => navigateTo(currentUser ? 'dashboard' : 'home')} />
        ) : activeView === 'terms' ? (
          <TermsOfService onBack={() => navigateTo(currentUser ? 'dashboard' : 'home')} />
        ) : activeView === 'privacy' ? (
          <PrivacyPolicy onBack={() => navigateTo(currentUser ? 'dashboard' : 'home')} />
        ) : activeView === 'contact' ? (
          <ContactUs onBack={() => navigateTo(currentUser ? 'dashboard' : 'home')} />
        ) : activeView === 'dashboard' && currentUser ? (
          <UserDashboard
            user={currentUser}
            onOpenWizard={() => handleOpenWizardWithUrl()}
            onSignOut={handleSignOut}
          />
        ) : (
          <>
            <Hero onOpenWizard={handleOpenWizardWithUrl} />
            <HowItWorks />
            <ExplanationCards />
            <Features />
            <Pricing onSelectTier={(tier) => handleOpenWizardWithUrl(undefined, tier)} />
          </>
        )}
      </main>

      {/* Footer */}
      <Footer
        onOpenAuth={() => openAuth('login')}
        onNavigate={navigateTo}
        isAdmin={userRole === 'admin'}
      />

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
        initialUrl={initialUrl}
        initialPlan={initialPlan}
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
  onOpenWizard 
}: { 
  onOpenWizard: (url?: string) => void;
}) {
  const [trackUrl, setTrackUrl] = useState('');

  const handleBoost = (e: FormEvent) => {
    e.preventDefault();
    onOpenWizard(trackUrl.trim());
  };

  return (
    <section className="pt-24 pb-16 px-6 relative overflow-hidden text-center">
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
            JamBoost • Independent Playlist Pitching
          </div>

          {/* Truthful Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 tracking-tight leading-tight text-white">
            Get your music in front of real playlist curators.
          </h1>

          {/* Honest Subheadline & Line */}
          <p className="text-base sm:text-lg text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            We pitch your release to playlists. We do not sell streams, and results depend on your music and the curators' decisions.
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
              <span>Submit Spotify Link</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          {/* Truthful badges */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#82C321]" />
              Direct pitching to independent curators
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-[#82C321]" />
              Transparent reporting in your dashboard
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#82C321]" />
              Full refund if rejected prior to pitch
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Submit your link",
      desc: "Paste your Spotify track, album, or playlist URL to automatically retrieve cover art and release details.",
    },
    {
      num: "02",
      title: "We review it",
      desc: "Our editorial team listens to your release to evaluate production quality, sound mixing, and genre alignment.",
    },
    {
      num: "03",
      title: "We pitch it to playlists",
      desc: "We pitch your release directly to independent playlist curators whose listening niches match your genre.",
    },
    {
      num: "04",
      title: "Track your results in your dashboard",
      desc: "Monitor curator feedback, campaign progress, and playlist additions live in your artist dashboard.",
    },
  ];

  return (
    <section id="how-it-works" className="py-16 border-y border-white/5 bg-[#121212]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#82C321]/10 text-[#82C321] text-xs font-bold uppercase tracking-wider mb-2">
            Step-by-Step Process
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            How It Works
          </h2>
          <p className="text-sm text-gray-400 mt-2 max-w-lg mx-auto">
            A clear, straightforward pitching process with no hidden algorithms or false promises.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-[#161616] border border-white/5 hover:border-white/10 transition-colors relative flex flex-col justify-between"
            >
              <div>
                <div className="text-2xl font-black text-[#82C321] font-mono mb-4">
                  {st.num}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{st.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{st.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExplanationCards() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
        <div className="flex gap-4 p-6 rounded-2xl bg-[#161616] border border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-[#82C321]/10 flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6 text-[#82C321]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1.5">Transparent Campaign Tracking</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Curator additions, playlist placements, and notes are tracked directly in your artist dashboard. Review your pitching progress with complete clarity.
            </p>
          </div>
        </div>

        <div className="flex gap-4 p-6 rounded-2xl bg-[#161616] border border-white/5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Radio className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1.5">Curator-Focused Outreach</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              We pitch your tracks to real, independent curators who manage active playlists in your genre. Placements are never automated and depend entirely on curator choices.
            </p>
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
      desc: "Fast URL lookup for Tracks, Albums, and Playlists with automatic media verification and artwork lookup via the Spotify Web API.",
    },
    {
      icon: Radio,
      title: "Real-Time Dashboard Sync",
      desc: "Instant database subscriptions keep your campaign review stages, curator notes, and placement updates synchronized in real time.",
    },
    {
      icon: TrendingUp,
      title: "Targeted Curation Packages",
      desc: "Choose Starter, Pro, or Premium pitching tiers designed for your release goals and target territories.",
    },
  ];

  return (
    <section id="features" className="py-20 px-6 bg-[#121212] border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            Built for Independent Artists & Labels
          </h2>
          <p className="text-sm text-gray-400 max-w-lg mx-auto">
            Everything you need to pitch and monitor your music promotion with complete transparency.
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
  return (
    <section id="pricing" className="py-24 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Transparent Pitching Packages
          </h2>
          <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
            One-time fee per campaign in USD. No recurring subscriptions, no bot streams, and no stream guarantees. What you see is exactly what we deliver.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {DISPLAY_PLANS.map((plan) => {
            const IconComponent = plan.tier === 'Starter' ? Star : plan.tier === 'Pro' ? Zap : TrendingUp;
            return (
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
                    <IconComponent className={`w-6 h-6 ${plan.popular ? 'text-[#82C321]' : 'text-gray-400'}`} />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-1">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-white">{plan.priceDisplay}</span>
                    <span className="text-gray-500 text-xs font-medium"> one-time fee</span>
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
                  Choose {plan.name} Campaign
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Footer({ 
  onOpenAuth, 
  onNavigate,
  isAdmin
}: { 
  onOpenAuth: () => void; 
  onNavigate: (view: AppView) => void;
  isAdmin?: boolean;
}) {
  return (
    <footer className="border-t border-white/5 py-12 px-6 bg-[#101010]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <JamBoostLogo size="sm" className="h-6" />
        </div>
        <p className="text-gray-500 text-xs text-center md:text-left max-w-md leading-relaxed">
          © {new Date().getFullYear()} JamBoost. All rights reserved. JamBoost is an independent music promotion service and is not affiliated with, endorsed by, or sponsored by Spotify AB. Spotify is a registered trademark of Spotify AB.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-gray-400">
          <button onClick={onOpenAuth} className="hover:text-white transition-colors cursor-pointer">
            Artist Portal
          </button>
          {isAdmin && (
            <button
              onClick={() => onNavigate('admin')}
              className="text-amber-400 hover:text-amber-300 font-semibold transition-colors cursor-pointer"
            >
              Admin Area
            </button>
          )}
          <button onClick={() => onNavigate('refunds')} className="hover:text-white transition-colors cursor-pointer">
            Refund Policy
          </button>
          <button onClick={() => onNavigate('terms')} className="hover:text-white transition-colors cursor-pointer">
            Terms of Service
          </button>
          <button onClick={() => onNavigate('privacy')} className="hover:text-white transition-colors cursor-pointer">
            Privacy Policy
          </button>
          <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors cursor-pointer">
            Contact Us
          </button>
        </div>
      </div>
    </footer>
  );
}
