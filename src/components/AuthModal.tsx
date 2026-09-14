import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User, Music, Disc, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const { login, register, loginAsDemo } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name, artistName);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginAsDemo();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        id="auth-modal-card"
        className="w-full max-w-md bg-[#181818] border border-[#2b2b2b] rounded-2xl p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E50914] via-[#FF3333] to-[#FF6666]" />

        {/* Close Button */}
        <button
          id="close-auth-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#B3B3B3] hover:text-white p-1 rounded-lg hover:bg-[#222] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mt-2 mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#E50914] to-[#FF3333] mb-3 shadow-lg shadow-red-950/40">
            <Disc className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">
            {mode === 'login' ? 'Welcome to TrackBoost' : 'Create Artist Account'}
          </h2>
          <p className="text-sm text-[#B3B3B3] mt-1">
            {mode === 'login'
              ? 'Access your Spotify campaign dashboard & real-time analytics'
              : 'Join top independent artists pitching directly to playlist curators'}
          </p>
        </div>

        {/* Fast Demo Login Banner */}
        <div className="mb-5 p-3 rounded-xl bg-gradient-to-r from-red-950/40 to-neutral-900 border border-red-800/40 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-[#FF3333] shrink-0" />
            <div className="text-left">
              <p className="text-xs font-semibold text-white">Instant Demo Access</p>
              <p className="text-[11px] text-[#B3B3B3]">Sanelow Records (Verified Label)</p>
            </div>
          </div>
          <button
            id="instant-demo-auth-btn"
            type="button"
            onClick={handleDemoSignIn}
            disabled={loading}
            className="text-xs font-bold text-white bg-[#FF3333] hover:bg-[#e62e2e] px-3 py-1.5 rounded-lg transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-md shadow-[#FF3333]/20"
          >
            1-Click Sign In
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-[#121212] rounded-xl mb-5 border border-[#252525]">
          <button
            type="button"
            id="auth-mode-login-tab"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-[#242424] text-white shadow-sm'
                : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            id="auth-mode-register-tab"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-[#242424] text-white shadow-sm'
                : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-700/50 rounded-xl flex items-center space-x-2 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#FF3333]" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1">
                  Full Name / Label Representative
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-[#777]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Marcus Reid"
                    className="w-full bg-[#121212] border border-[#2e2e2e] focus:border-[#FF3333] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-[#555] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B3B3B3] mb-1">
                  Spotify Artist Name (Optional)
                </label>
                <div className="relative">
                  <Music className="absolute left-3.5 top-3 w-4 h-4 text-[#777]" />
                  <input
                    type="text"
                    value={artistName}
                    onChange={e => setArtistName(e.target.value)}
                    placeholder="e.g. Neon Horizon"
                    className="w-full bg-[#121212] border border-[#2e2e2e] focus:border-[#FF3333] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-[#555] outline-none transition"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#B3B3B3] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#777]" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="artist@example.com"
                className="w-full bg-[#121212] border border-[#2e2e2e] focus:border-[#FF3333] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-[#555] outline-none transition"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-[#B3B3B3]">Password</label>
              {mode === 'login' && (
                <span className="text-[11px] text-[#777] hover:text-[#B3B3B3] cursor-pointer">
                  Forgot password?
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#777]" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#121212] border border-[#2e2e2e] focus:border-[#FF3333] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-[#555] outline-none transition"
              />
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#FF3333] hover:bg-[#e62e2e] active:scale-[0.99] text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-[#FF3333]/25 transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <span>Sign In to Dashboard</span>
            ) : (
              <span>Create Free Account</span>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[#252525] text-center">
          <p className="text-xs text-[#888]">
            By continuing, you agree to our{' '}
            <span className="text-[#B3B3B3] hover:underline cursor-pointer">Terms of Promotion</span> and{' '}
            <span className="text-[#B3B3B3] hover:underline cursor-pointer">Curator Integrity Guidelines</span>.
          </p>
        </div>
      </div>
    </div>
  );
};
