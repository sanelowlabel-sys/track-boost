import React, { useState, useEffect, type FormEvent } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  Link,
} from 'react-router-dom';
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
  Layers,
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
import { ResetPasswordPage } from './components/ResetPassword';
import { NotFound } from './components/NotFound';
import { PageSeo } from './components/PageSeo';
import { Analytics } from './components/Analytics';
import { useToast } from './components/Toast';
import { isSupabaseConfigured, supabase, signOutUser, type AuthUser } from './lib/supabase';
import { PLANS, DISPLAY_PLANS, type CampaignTier } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'resetPassword'>('login');
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [initialUrl, setInitialUrl] = useState('');
  const [initialPlan, setInitialPlan] = useState<CampaignTier>('Pro');

  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

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

  useEffect(() => {
    if (!supabase) {
      setSessionLoading(false);
      setRoleLoading(false);
      return;
    }

    // Detect password recovery in URL hash on mount
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      navigate('/reset-password');
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
      setSessionLoading(false);
    });

    // Single source of truth for auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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
        navigate('/reset-password');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
    setUserRole(null);
    toast.info('Signed out of JamBoost');
    navigate('/');
  };

  const openAuth = (mode: 'login' | 'signup' | 'forgot' | 'resetPassword', returnPath?: string) => {
    setAuthMode(mode);
    if (returnPath) {
      setRedirectAfterAuth(returnPath);
    }
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    toast.success(`Welcome back, ${user.name || user.email}!`);
    const destination = redirectAfterAuth || '/dashboard';
    setRedirectAfterAuth(null);
    navigate(destination);
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

  const isHome = location.pathname === '/';
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white selection:bg-[#82C321] selection:text-black flex flex-col justify-between">
      <Analytics />

      {/* Navigation Header */}
      <header className="fixed top-0 w-full z-40 bg-[#121212]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-3 transition-opacity hover:opacity-90 cursor-pointer text-left"
              aria-label="JamBoost Home"
            >
              <JamBoostLogo size="sm" className="h-6 sm:h-7" />
            </Link>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-400">
              <Link
                to="/"
                className={`transition-colors cursor-pointer ${
                  isHome ? 'text-white' : 'hover:text-white'
                }`}
              >
                Home
              </Link>
              {isHome && (
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
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isDashboard ? 'text-white' : 'hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-[#82C321]" />
                  <span>Dashboard</span>
                </Link>
              )}
              {userRole === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <Link
                  to={isDashboard ? '/' : '/dashboard'}
                  className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-2 border border-white/10 transition-colors cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#82C321]" />
                  <span>{isDashboard ? 'View Website' : 'My Dashboard'}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleOpenWizardWithUrl()}
                  className="h-10 px-4 rounded-xl bg-[#82C321] hover:bg-[#8fd524] text-black text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-[1.02] cursor-pointer shadow-lg shadow-[#82C321]/20"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span className="hidden sm:inline">Submit Track</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Log out"
                  aria-label="Log out of JamBoost"
                  className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="h-10 px-4 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
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

      {/* Main View Area Routed via React Router */}
      <main className="pt-20 flex-1">
        <Routes>
          {/* Landing page */}
          <Route
            path="/"
            element={
              <>
                <PageSeo
                  title="JamBoost – Real Spotify Playlist Pitching for Independent Artists"
                  description="JamBoost pitches your music to independent playlist curators. Transparent campaign tracking, zero stream guarantees, and direct artist support."
                  path="/"
                />
                <Hero onOpenWizard={handleOpenWizardWithUrl} />
                <HowItWorks />
                <ExplanationCards />
                <Features />
                <Pricing onSelectTier={(tier) => handleOpenWizardWithUrl(undefined, tier)} />
              </>
            }
          />

          {/* Signed-in user dashboard */}
          <Route
            path="/dashboard"
            element={
              sessionLoading ? (
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
                  <div className="w-10 h-10 border-2 border-[#82C321] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-gray-400">Loading your artist dashboard...</p>
                </div>
              ) : currentUser ? (
                <>
                  <PageSeo
                    title="Artist Dashboard – JamBoost"
                    description="Track your active playlist pitches, curator placements, and delivered stream reports."
                    path="/dashboard"
                  />
                  <UserDashboard
                    user={currentUser}
                    onOpenWizard={() => handleOpenWizardWithUrl()}
                    onSignOut={handleSignOut}
                  />
                </>
              ) : (
                <RequireAuthPrompt onOpenLogin={() => openAuth('login', '/dashboard')} />
              )
            }
          />

          {/* Admin console */}
          <Route
            path="/admin"
            element={
              sessionLoading || roleLoading ? (
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
                  <div className="w-10 h-10 border-2 border-[#82C321] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-gray-400">Verifying administrator access...</p>
                </div>
              ) : currentUser && userRole === 'admin' ? (
                <AdminDashboard currentUser={currentUser} />
              ) : (
                <NotFound />
              )
            }
          />

          {/* Legal and information pages */}
          <Route path="/refunds" element={<RefundPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Friendly 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Footer */}
      <Footer
        onOpenAuth={() => openAuth('login')}
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
          openAuth('login', '/dashboard');
        }}
        onSubmissionComplete={() => {
          navigate('/dashboard');
        }}
      />
    </div>
  );
}

function RequireAuthPrompt({ onOpenLogin }: { onOpenLogin: () => void }) {
  useEffect(() => {
    onOpenLogin();
  }, [onOpenLogin]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md w-full bg-[#181818] border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#82C321]/15 border border-[#82C321]/30 flex items-center justify-center text-[#82C321]">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-white">Sign In Required</h1>
        <p className="text-sm text-gray-400 leading-relaxed">
          The Artist Dashboard is available exclusively for signed-in artists. Please sign in or create an account to view your campaigns.
        </p>
        <button
          type="button"
          onClick={onOpenLogin}
          className="w-full h-12 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] cursor-pointer shadow-lg shadow-[#82C321]/20"
        >
          <LogIn className="w-4 h-4 stroke-[2.5]" />
          <span>Sign In to Dashboard</span>
        </button>
      </div>
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
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#82C321] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#82C321]" />
            </span>
            <span>Real Playlist Pitching • Verified Independent Curators</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Get your music in front of{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#82C321] to-emerald-400">
              real playlist curators.
            </span>
          </h1>

          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-4 leading-relaxed font-normal">
            Directly pitch your tracks to tastemakers who actually listen. Track curator reviews, playlist adds, and campaign progress with full transparency.
          </p>

          <p className="text-xs text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed italic">
            We pitch your release to playlists. We do not sell streams, and results depend on your music and the curators' decisions.
          </p>

          {/* Quick Submission Bar */}
          <form 
            onSubmit={handleBoost}
            className="max-w-2xl mx-auto bg-[#181818] p-2 sm:p-2.5 rounded-2xl border border-white/10 shadow-2xl flex flex-col sm:flex-row gap-2 relative z-20 mb-8"
          >
            <div className="relative flex-1 flex items-center">
              <div className="absolute left-4 text-gray-500">
                <Music className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={trackUrl}
                onChange={(e) => setTrackUrl(e.target.value)}
                placeholder="Paste Spotify Track, Album, or Playlist link..."
                className="w-full bg-transparent pl-12 pr-4 py-3 text-white placeholder:text-gray-500 text-sm focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="h-12 px-8 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-[#82C321]/20 whitespace-nowrap"
            >
              <span>Submit Track</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          {/* Key Value Props */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#82C321]" />
              <span>100% Curator Rejection Guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#82C321]" />
              <span>Realtime Status via Supabase</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#82C321]" />
              <span>Zero Artificial Streams</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Submit your link',
      desc: 'Paste any public Spotify track, album, or playlist link. We automatically retrieve your release metadata and artwork.',
    },
    {
      num: '02',
      title: 'We review it',
      desc: 'Our curation team reviews your submission for genre fit and audio quality within 24 hours. Full refund if rejected.',
    },
    {
      num: '03',
      title: 'We pitch it to playlists',
      desc: 'We present your music directly to independent playlist curators whose listening taste matches your release genre.',
    },
    {
      num: '04',
      title: 'Track results in dashboard',
      desc: 'Monitor curator feedback, active playlist placements, and delivered stream progress live inside your artist portal.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-6 border-y border-white/5 bg-[#121212]/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-[#82C321] uppercase tracking-wider">Simple & Transparent</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2 mb-3">
            How It Works
          </h2>
          <p className="text-sm text-gray-400 max-w-xl mx-auto">
            A straightforward, four-step pitching process designed for independent artists, producers, and record labels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="bg-[#181818] border border-white/5 rounded-3xl p-6 relative flex flex-col justify-between hover:border-white/10 transition-colors"
            >
              <div>
                <span className="text-2xl font-black text-[#82C321]/30 font-mono block mb-4">
                  {step.num}
                </span>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
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
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#181818] border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-[#82C321]/10 border border-[#82C321]/20 flex items-center justify-center text-[#82C321] mb-5">
            <Radio className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Direct Curator Pitching</h3>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            We pitch your music directly to independent playlist curators whose lists match your specific genre and target territory. Every curator listens to your track personally before deciding whether to place it.
          </p>
          <div className="flex items-center gap-2 text-xs text-[#82C321] font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Honest curator relationships • No pay-for-placement scams</span>
          </div>
        </div>

        <div className="bg-[#181818] border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Transparent Progress Tracking</h3>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            Follow your campaign status in real time through Supabase realtime subscriptions. Review the playlists where your track was placed, listener saves, and stream updates directly reported by our team.
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Clear status progression: Pending → Approved → Live → Completed</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: <Music className="w-5 h-5 text-[#82C321]" />,
      title: 'Targeted Curator Matching',
      desc: 'Pitched to curators categorized by subgenre—from Synthwave and Amapiano to Indie Rock and Commercial Pop.',
    },
    {
      icon: <Zap className="w-5 h-5 text-[#82C321]" />,
      title: 'Realtime Dashboard',
      desc: 'Instant campaign feedback. Watch status changes update instantly without needing to refresh your browser.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#82C321]" />,
      title: '100% Rejection Refund',
      desc: 'If our curation team determines your release is not a fit for playlist pitching, we refund your payment in full.',
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-[#82C321]" />,
      title: 'Curator Feedback',
      desc: 'Receive transparent notes from playlist tastemakers directly inside your personal campaign dashboard.',
    },
  ];

  return (
    <section id="features" className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-[#82C321] uppercase tracking-wider">Why Artists Choose Us</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2 mb-3">
            Built for Real Music Discovery
          </h2>
          <p className="text-sm text-gray-400 max-w-xl mx-auto">
            Tools, safeguards, and curator connections to help your music reach actual listeners.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, i) => (
            <div
              key={i}
              className="bg-[#181818] border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                {feat.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">{feat.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ onSelectTier }: { onSelectTier: (tier: CampaignTier) => void }) {
  return (
    <section id="pricing" className="py-20 px-6 bg-[#121212]/30 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-[#82C321] uppercase tracking-wider">Transparent Pricing</span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2 mb-3">
            One-Time Pitch Packages
          </h2>
          <p className="text-sm text-gray-400 max-w-xl mx-auto mb-2">
            One-time payment with zero recurring subscriptions. Backed by our 100% Curator Rejection Guarantee.
          </p>
          <p className="text-xs text-gray-500 italic max-w-lg mx-auto">
            All prices in USD. We pitch your release to playlist curators; results depend on curator decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {DISPLAY_PLANS.map((plan) => {
            const isFeatured = plan.name === 'Pro';
            return (
              <div
                key={plan.name}
                className={`bg-[#181818] border rounded-3xl p-7 sm:p-8 flex flex-col justify-between relative transition-all ${
                  isFeatured
                    ? 'border-[#82C321] shadow-2xl shadow-[#82C321]/10 md:-translate-y-2'
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#82C321] text-black text-[10px] uppercase tracking-widest font-extrabold px-3 py-1 rounded-full shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 text-gray-300">
                      One-time
                    </span>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-black text-white">{plan.priceDisplay}</span>
                    <span className="text-xs text-gray-400 ml-1.5 font-bold uppercase">{plan.currency}</span>
                  </div>

                  <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="space-y-3 pt-4 border-t border-white/5 mb-8">
                    {plan.deliverables.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-[#82C321] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTier(plan.name as CampaignTier)}
                  className={`w-full h-12 rounded-xl text-xs font-bold transition-transform hover:scale-[1.02] cursor-pointer shadow-md ${
                    isFeatured
                      ? 'bg-[#82C321] hover:bg-[#8fd524] text-black shadow-[#82C321]/20'
                      : 'bg-white/10 hover:bg-white/20 text-white'
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
  isAdmin
}: { 
  onOpenAuth: () => void; 
  isAdmin?: boolean;
}) {
  return (
    <footer className="border-t border-white/5 py-12 px-6 bg-[#101010]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <JamBoostLogo size="sm" className="h-6" />
        </div>
        <p className="text-gray-500 text-xs text-center md:text-left max-w-md leading-relaxed">
          © {new Date().getFullYear()} JamBoost by Sanelow Music Label. All rights reserved. JamBoost is an independent music promotion service and is not affiliated with, endorsed by, or sponsored by Spotify AB. Spotify is a registered trademark of Spotify AB.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-gray-400">
          <button type="button" onClick={onOpenAuth} className="hover:text-white transition-colors cursor-pointer">
            Artist Portal
          </button>
          {isAdmin && (
            <Link
              to="/admin"
              className="text-amber-400 hover:text-amber-300 font-semibold transition-colors cursor-pointer"
            >
              Admin Area
            </Link>
          )}
          <Link to="/refunds" className="hover:text-white transition-colors cursor-pointer">
            Refund Policy
          </Link>
          <Link to="/terms" className="hover:text-white transition-colors cursor-pointer">
            Terms of Service
          </Link>
          <Link to="/privacy" className="hover:text-white transition-colors cursor-pointer">
            Privacy Policy
          </Link>
          <Link to="/contact" className="hover:text-white transition-colors cursor-pointer">
            Contact Us
          </Link>
        </div>
      </div>
    </footer>
  );
}
