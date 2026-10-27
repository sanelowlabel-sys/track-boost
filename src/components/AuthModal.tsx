import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Mail, User, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react';
import { JamBoostLogo } from './JamBoostLogo';
import { 
  signInWithEmail, 
  signUpWithEmail, 
  resetPasswordForEmail, 
  updateUserPassword, 
  type AuthUser 
} from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  initialMode?: 'login' | 'signup' | 'forgot' | 'resetPassword';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'resetPassword'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessNotice(null);
    setNeedsEmailConfirmation(false);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleModeChange = (newMode: 'login' | 'signup' | 'forgot' | 'resetPassword') => {
    setMode(newMode);
    setError(null);
    setSuccessNotice(null);
    setNeedsEmailConfirmation(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
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
      } else if (mode === 'signup') {
        if (password.length < 10) {
          setError('Password must be at least 10 characters long.');
          setLoading(false);
          return;
        }
        const result = await signUpWithEmail(email, password, name);
        if (result.error) {
          setError(result.error);
        } else if (result.needsEmailConfirmation) {
          setNeedsEmailConfirmation(true);
        } else if (result.user) {
          onSuccess(result.user);
          onClose();
        }
      } else if (mode === 'forgot') {
        const result = await resetPasswordForEmail(email.trim());
        if (result.error) {
          setError(result.error);
        } else {
          setSuccessNotice('Check your email for the password recovery link.');
        }
      } else if (mode === 'resetPassword') {
        if (password.length < 10) {
          setError('Password must be at least 10 characters long.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }

        const result = await updateUserPassword(password);
        if (result.error) {
          setError(result.error);
        } else {
          setSuccessNotice('Your password has been updated successfully! You can now sign in.');
          setTimeout(() => {
            handleModeChange('login');
          }, 1800);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
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
              {needsEmailConfirmation && 'Check Your Email'}
              {!needsEmailConfirmation && mode === 'login' && 'Welcome Back'}
              {!needsEmailConfirmation && mode === 'signup' && 'Create an Account'}
              {!needsEmailConfirmation && mode === 'forgot' && 'Reset Password'}
              {!needsEmailConfirmation && mode === 'resetPassword' && 'Set New Password'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {needsEmailConfirmation && 'Please confirm your email address to activate your account.'}
              {!needsEmailConfirmation && mode === 'login' && 'Sign in to access your Spotify promotion dashboard'}
              {!needsEmailConfirmation && mode === 'signup' && 'Join JamBoost to launch and track your Spotify campaigns'}
              {!needsEmailConfirmation && mode === 'forgot' && 'Enter your email address to receive a recovery link'}
              {!needsEmailConfirmation && mode === 'resetPassword' && 'Choose a strong new password for your account'}
            </p>
          </div>

          {/* Mode Switcher Tabs (Only for login and signup) */}
          {(mode === 'login' || mode === 'signup') && !needsEmailConfirmation && (
            <div className="flex bg-[#121212] p-1 rounded-xl mb-6 border border-white/5">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
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
                onClick={() => handleModeChange('signup')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="mb-5 p-3.5 bg-[#82C321]/10 border border-[#82C321]/30 rounded-xl flex items-start gap-3 text-[#82C321] text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Email Confirmation Screen after sign up */}
          {needsEmailConfirmation ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#82C321]/15 border border-[#82C321]/30 flex items-center justify-center text-[#82C321]">
                <Mail className="w-7 h-7" />
              </div>
              <div className="bg-[#121212] p-4 rounded-2xl border border-white/5 text-sm text-gray-300">
                <p className="font-semibold text-white mb-1">Check your email to confirm your account</p>
                <p className="text-xs text-gray-400">
                  We sent a confirmation link to <span className="text-[#82C321] font-semibold">{email}</span>. Click the link in your email, then return here to sign in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="w-full h-12 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Sign In</span>
              </button>
            </div>
          ) : (
            /* Auth Form */
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

              {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
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
                      placeholder="artist@example.com"
                      required
                      className="w-full h-12 pl-10 pr-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#82C321] transition-colors"
                    />
                  </div>
                </div>
              )}

              {(mode === 'login' || mode === 'signup') && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => handleModeChange('forgot')}
                        className="text-xs text-[#82C321] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Minimum 10 characters' : '••••••••'}
                      minLength={mode === 'signup' ? 10 : undefined}
                      required
                      className="w-full h-12 pl-10 pr-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#82C321] transition-colors"
                    />
                  </div>
                </div>
              )}

              {mode === 'resetPassword' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      New Password (min 10 characters)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-500">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 10 characters"
                        minLength={10}
                        required
                        className="w-full h-12 pl-10 pr-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#82C321] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={6}
                        required
                        className="w-full h-12 pl-10 pr-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#82C321] transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-2 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'login' && 'Sign In'}
                      {mode === 'signup' && 'Create Free Account'}
                      {mode === 'forgot' && 'Send Reset Link'}
                      {mode === 'resetPassword' && 'Update Password'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {mode === 'forgot' && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => handleModeChange('login')}
                    className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              )}
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
