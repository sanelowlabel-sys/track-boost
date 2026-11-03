import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { JamBoostLogo } from './JamBoostLogo';
import { PageSeo } from './PageSeo';
import { updateUserPassword, resetPasswordForEmail } from '../lib/supabase';
import { useToast } from './Toast';

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError('Password must be at least 10 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await updateUserPassword(password);
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        setSuccess('Password updated successfully! You can now access your account.');
        toast.success('Your password has been securely updated.');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.');
      toast.error('Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRecoveryLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordForEmail(email.trim());
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        setSuccess('Password recovery link has been sent to your email.');
        toast.success('Password recovery link sent.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send recovery email.');
      toast.error('Failed to send recovery link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col justify-center items-center p-4 sm:p-6">
      <PageSeo
        title="Reset Password – JamBoost"
        description="Reset your JamBoost account password securely."
        path="/reset-password"
      />

      <div className="w-full max-w-md bg-[#181818] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        <div className="flex justify-center mb-6">
          <Link to="/" aria-label="Return to JamBoost Homepage">
            <JamBoostLogo size="md" />
          </Link>
        </div>

        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#82C321]/15 border border-[#82C321]/30 flex items-center justify-center text-[#82C321]">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isForgotMode ? 'Request Password Reset' : 'Set New Password'}
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            {isForgotMode
              ? 'Enter your account email to receive a secure recovery link.'
              : 'Choose a strong password with at least 10 characters.'}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 bg-[#82C321]/15 border border-[#82C321]/30 rounded-xl flex items-start gap-3 text-[#82C321] text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {isForgotMode ? (
          <form onSubmit={handleSendRecoveryLink} className="space-y-4">
            <div>
              <label htmlFor="recovery-email" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Account Email Address
              </label>
              <input
                id="recovery-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="artist@example.com"
                required
                className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#82C321] focus-visible:ring-2 focus-visible:ring-[#82C321] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl text-sm transition-transform hover:scale-[1.01] cursor-pointer shadow-lg shadow-[#82C321]/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Sending Recovery Link...</span>
              ) : (
                <>
                  <span>Send Recovery Email</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(false);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Already have a reset link? Enter new password</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                New Password (Minimum 10 Characters)
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                minLength={10}
                required
                className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#82C321] focus-visible:ring-2 focus-visible:ring-[#82C321] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="confirm-new-password" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                minLength={10}
                required
                className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#82C321] focus-visible:ring-2 focus-visible:ring-[#82C321] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || password.length < 10}
              className="w-full h-12 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl text-sm transition-transform hover:scale-[1.01] cursor-pointer shadow-lg shadow-[#82C321]/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Updating Password...</span>
              ) : (
                <>
                  <span>Save New Password</span>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(true);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Need a new reset link? Click here
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-4 border-t border-white/5 text-center">
          <Link
            to="/"
            className="text-xs text-gray-400 hover:text-[#82C321] inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
