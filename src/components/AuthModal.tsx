import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Mail, User, AlertCircle, CheckCircle2, Database, ArrowRight } from 'lucide-react';
import { JamBoostLogo } from './JamBoostLogo';
import { signInWithEmail, signUpWithEmail, isSupabaseConfigured, type AuthUser } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState(localStorage.getItem('jamboost_supabase_url') || '');
  const [configKey, setConfigKey] = useState(localStorage.getItem('jamboost_supabase_key') || '');
  const [configSaved, setConfigSaved] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await signInWithEmail(email, password);
        if (result.error) {
          setError(result.error);
        } else if (result.user) {
          onSuccess(result.user);
          onClose();
        }
      } else {
        const result = await signUpWithEmail(email, password, name);
        if (result.error) {
          setError(result.error);
        } else if (result.user) {
          onSuccess(result.user);
          onClose();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setError(null);
    setLoading(true);
    const demoEmail = 'aikenmusique@gmail.com';
    const demoPass = 'jamboost2026';
    setEmail(demoEmail);
    setPassword(demoPass);
    const result = await signInWithEmail(demoEmail, demoPass);
    if (result.user) {
      onSuccess(result.user);
      onClose();
    } else if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  const saveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('jamboost_supabase_url', configUrl.trim());
    localStorage.setItem('jamboost_supabase_key', configKey.trim());
    setConfigSaved(true);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-[#181818] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <JamBoostLogo size="sm" className="h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {mode === 'login'
                ? 'Sign in to access your Spotify promotion dashboard'
                : 'Join JamBoost to launch and track your Spotify campaigns'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-[#121212] p-1 rounded-xl mb-6 border border-white/5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-black shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-black shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Artist or Label Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aiken Musique"
                    required={mode === 'signup'}
                    className="w-full h-12 pl-10 pr-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#82C321] transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aikenmusique@gmail.com"
                  required
                  className="w-full h-12 pl-10 pr-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#82C321] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                  className="w-full h-12 pl-10 pr-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#82C321] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In' : 'Create Free Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="mt-5 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#82C321]" />
              <span>Quick Demo Sign In (aikenmusique@gmail.com)</span>
            </button>
          </div>

          {/* Supabase backend status & settings toggle */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="text-xs text-gray-500 hover:text-gray-400 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>
                Supabase Auth Status: {isSupabaseConfigured ? 'Connected (Live)' : 'Active (Local & Realtime)'}
              </span>
            </button>
          </div>

          {showConfig && (
            <form onSubmit={saveSupabaseConfig} className="mt-4 p-4 bg-[#121212] rounded-2xl border border-white/5 space-y-3 text-left">
              <div className="text-xs font-semibold text-gray-300">Configure Custom Supabase Credentials</div>
              <div>
                <label className="text-[11px] text-gray-400">Project URL</label>
                <input
                  type="url"
                  value={configUrl}
                  onChange={(e) => setConfigUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full h-8 px-2.5 text-xs bg-[#181818] border border-white/10 rounded text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400">Anon Public Key</label>
                <input
                  type="text"
                  value={configKey}
                  onChange={(e) => setConfigKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  className="w-full h-8 px-2.5 text-xs bg-[#181818] border border-white/10 rounded text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-white text-black text-xs font-semibold rounded hover:bg-gray-200 transition-colors"
              >
                {configSaved ? 'Saved! Reloading...' : 'Save & Connect Supabase'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
