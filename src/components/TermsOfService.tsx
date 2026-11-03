import React from 'react';
import { motion } from 'motion/react';
import { FileText, ArrowLeft, Shield, AlertTriangle, Scale, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JamBoostLogo } from './JamBoostLogo';
import { PageSeo } from './PageSeo';

interface TermsOfServiceProps {
  onBack?: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white selection:bg-[#82C321] selection:text-black py-12 px-4 sm:px-6">
      <PageSeo
        title="Terms of Service – JamBoost"
        description="JamBoost terms of service: transparent curator pitch campaigns, artist authorization rules, and zero artificial streaming compliance."
        path="/terms"
      />
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <button
            onClick={handleBack}
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
              <FileText className="w-4 h-4" />
              <span>Legal Agreement</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Terms of Service
            </h1>
            <p className="text-sm text-gray-400 mt-2">
              Last updated: October 26, 2026 • Governing Law: Republic of South Africa
            </p>
          </div>

          {/* Core Plain-English Summary */}
          <div className="p-5 rounded-2xl bg-[#121212] border border-white/5 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[#82C321]">
              Essential Terms Summary
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#82C321] shrink-0 mt-0.5" />
                <span>
                  <strong>Pitching Service Only:</strong> JamBoost pitches your release to independent playlist curators. We do not sell streams, plays, saves, or algorithmic placements.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#82C321] shrink-0 mt-0.5" />
                <span>
                  <strong>One-Time Payments in USD:</strong> Every package is a single, one-time fee. No recurring monthly subscriptions or hidden charges.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#82C321] shrink-0 mt-0.5" />
                <span>
                  <strong>Zero Bot Tolerance:</strong> Submitting content for artificial stream manipulation or bot delivery is strictly prohibited and grounds for immediate termination.
                </span>
              </li>
            </ul>
          </div>

          {/* Full Policy Sections */}
          <div className="space-y-8 text-sm text-gray-300 leading-relaxed border-t border-white/5 pt-6">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">1.</span> Acceptance of Terms & Service Scope
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                These Terms of Service ("Terms") constitute a legally binding agreement between you ("Artist", "Client", or "User") and JamBoost ("we", "us", or "our"), an online music promotion and curator pitching service operating from South Africa. By accessing our website, creating an account, or submitting a campaign, you agree to be bound by these Terms and our Refund Policy and Privacy Policy.
              </p>
              <p className="text-xs sm:text-sm text-gray-400">
                JamBoost provides manual and programmatic editorial submission pitching of Spotify-hosted musical works to independent playlist curators. Our deliverables consist solely of professional editorial review, genre classification, and direct pitching outreach.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">2.</span> No Guarantee of Placements, Streams, or Algorithmic Results
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                We pitch your release to real, independent playlist curators. <strong className="text-white">We do not sell streams, followers, or saves.</strong> Placement on any playlist, listener engagement, and stream quantities depend entirely on the quality, genre fit, and artistic appeal of your music, as well as the independent editorial judgment of individual curators.
              </p>
              <p className="text-xs sm:text-sm text-gray-400">
                JamBoost makes no warranty, express or implied, regarding whether a curator will add your song, the duration of any placement, or any resulting streams. Any performance figures or metric counters displayed on our platform reflect status reports received from curation campaigns and are not verified by Spotify AB.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">3.</span> One-Time Fees & Currency
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                All campaign fees are billed as one-time, non-recurring transactions in United States Dollars (USD). You will never be enrolled in an auto-renewing subscription. Payment is processed securely through authorized payment operators (such as PayPal). If paying with non-USD currency, your card issuer or payment provider handles conversion at their prevailing rates.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">4.</span> Artist Warranties & Content Authorization
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                By submitting a Spotify URL to JamBoost, you warrant and represent that:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-400">
                <li>You are the sole author, copyright holder, or legally authorized representative (e.g. record label, manager) of the musical composition and master sound recording.</li>
                <li>Your submission does not infringe upon any third-party intellectual property rights, trademarks, or proprietary rights.</li>
                <li>Your music does not contain hate speech, defamatory content, or material violating applicable laws.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">5.</span> Strict Prohibition on Artificial Manipulation & Bots
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                JamBoost strictly prohibits any artificial streaming activity. You agree not to use JamBoost in conjunction with automated click farms, bot networks, headless browser scripts, or artificial stream generation services. Engaging in artificial streaming violates the terms of digital service providers and will result in immediate termination of your account, cancellation of active campaigns without refund, and potential reporting to rights holders.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">6.</span> Third-Party Disclaimer & Spotify Non-Affiliation
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                JamBoost is an independent platform and is <strong className="text-white">not affiliated with, associated with, authorized by, endorsed by, or in any way officially connected with Spotify AB, Spotify USA Inc., or any of their subsidiaries</strong>. The name "Spotify" as well as related names, marks, emblems, and images are registered trademarks of their respective owners. The word "Spotify" is used on this website strictly to identify the third-party streaming service where client music is hosted.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">7.</span> Limitation of Liability
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                To the maximum extent permitted by applicable law, JamBoost, its directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or streaming royalties, arising out of or related to your use of our pitching services. Our total liability for any claim shall not exceed the amount paid by you for the specific campaign giving rise to the claim.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">8.</span> Dispute Resolution & Governing Law
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                These Terms shall be governed by, construed, and enforced in accordance with the laws of the Republic of South Africa, without regard to its conflict of law principles. Any legal dispute, controversy, or claim arising out of or relating to these Terms shall be submitted to the exclusive jurisdiction of the competent courts of the Republic of South Africa.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">9.</span> Contact Information
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                If you have questions regarding these Terms of Service, please reach out to our legal and support team at:
              </p>
              <div className="p-4 bg-[#121212] rounded-2xl border border-white/5 text-xs text-gray-300">
                <p className="font-bold text-white">JamBoost Legal Team</p>
                <p className="text-gray-400">Email: legal@jamboost.com / support@jamboost.com</p>
                <p className="text-gray-400">Republic of South Africa</p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
