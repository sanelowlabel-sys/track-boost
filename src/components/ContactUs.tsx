import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Clock, MapPin, Send, CheckCircle2, ArrowLeft, MessageSquare, Headphones } from 'lucide-react';
import { JamBoostLogo } from './JamBoostLogo';

interface ContactUsProps {
  onBack: () => void;
}

export const ContactUs: React.FC<ContactUsProps> = ({ onBack }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Campaign Question');
  const [spotifyLink, setSpotifyLink] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate submission delivery
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white selection:bg-[#82C321] selection:text-black py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to JamBoost</span>
          </button>
          <JamBoostLogo size="sm" className="h-6" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#181818] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8"
        >
          {/* Header Title */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#82C321]/10 border border-[#82C321]/30 text-[#82C321] text-xs font-bold uppercase tracking-wider mb-3">
              <Headphones className="w-4 h-4" />
              <span>Artist Support</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Contact JamBoost
            </h1>
            <p className="text-sm text-gray-400 mt-2">
              Have questions regarding your campaign pitching, payment, or curator status? Our team is here to assist.
            </p>
          </div>

          {/* Contact Details Cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#121212] border border-white/5 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#82C321]/15 text-[#82C321] flex items-center justify-center mb-1">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">Direct Email</h3>
              <p className="text-xs text-gray-400">
                <a href="mailto:support@jamboost.com" className="text-white hover:text-[#82C321] transition-colors underline">
                  support@jamboost.com
                </a>
              </p>
              <p className="text-[11px] text-gray-500">Inquiries answered in 24–48 hours</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#121212] border border-white/5 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-1">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">Operating Hours</h3>
              <p className="text-xs text-white">Monday – Friday</p>
              <p className="text-[11px] text-gray-400">09:00 – 17:00 SAST (UTC+2)</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#121212] border border-white/5 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-1">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">Location</h3>
              <p className="text-xs text-white">Cape Town / Johannesburg</p>
              <p className="text-[11px] text-gray-400">Republic of South Africa</p>
            </div>
          </div>

          {/* Interactive Form */}
          <div className="border-t border-white/5 pt-8">
            <h2 className="text-xl font-bold text-white mb-2">Send Us an Inquiry</h2>
            <p className="text-xs sm:text-sm text-gray-400 mb-6">
              Fill out the form below and an artist support representative will review your message.
            </p>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 rounded-2xl bg-[#121212] border border-[#82C321]/30 text-center space-y-3"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-[#82C321]/20 text-[#82C321] flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Thank You for Reaching Out!</h3>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  Your message has been received. Our support team typically replies within 24 to 48 business hours to <strong className="text-white">{email}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                    setSpotifyLink('');
                  }}
                  className="mt-4 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Send Another Inquiry
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#82C321] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      Your Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="artist@domain.com"
                      className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#82C321] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      Inquiry Category
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#82C321] transition-colors"
                    >
                      <option value="Campaign Question">Campaign & Pitching Question</option>
                      <option value="Billing & Refund">Billing & Refund Inquiry</option>
                      <option value="Curator Network">Curator Network Application</option>
                      <option value="POPIA Privacy Request">POPIA Data / Privacy Request</option>
                      <option value="General Inquiry">General Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      Spotify Release Link <span className="text-gray-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="url"
                      value={spotifyLink}
                      onChange={(e) => setSpotifyLink(e.target.value)}
                      placeholder="https://open.spotify.com/track/..."
                      className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#82C321] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Your Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide relevant submission IDs, questions, or details regarding your inquiry..."
                    className="w-full p-4 bg-[#121212] border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#82C321] transition-colors resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-gray-500">
                    We respect your privacy under South Africa's POPIA act.
                  </span>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-11 px-6 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Sending...' : 'Send Inquiry'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
