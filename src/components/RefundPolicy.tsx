import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle, Mail, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JamBoostLogo } from './JamBoostLogo';
import { PageSeo } from './PageSeo';

interface RefundPolicyProps {
  onBack?: () => void;
}

export const RefundPolicy: React.FC<RefundPolicyProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white selection:bg-[#82C321] selection:text-black py-12 px-4 sm:px-6">
      <PageSeo
        title="Refund Policy – JamBoost"
        description="Learn about our 100% Curator Rejection Guarantee and transparent refund policy."
        path="/refunds"
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
              <ShieldCheck className="w-4 h-4" />
              <span>Artist Fairness Policy</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Refund Policy
            </h1>
            <p className="text-sm text-gray-400 mt-2">
              Last updated: October 26, 2026 • All campaign fees billed in USD ($)
            </p>
          </div>

          {/* Key Guarantee Cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#121212] border border-white/5 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#82C321]/15 text-[#82C321] flex items-center justify-center mb-1">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">100% Pre-Pitch Rejection Refund</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                If our editorial team determines your song is ineligible, out of genre scope, or rejects the submission before curator pitching begins, a full 100% refund in USD is issued back to your PayPal payment method.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#121212] border border-white/5 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-1">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Active Campaigns Non-Refundable</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Once a campaign is approved and pitching to independent playlist curators has commenced, the pitching service labor has been fully performed and the campaign fee is non-refundable.
              </p>
            </div>
          </div>

          {/* Policy Sections */}
          <div className="space-y-6 text-sm text-gray-300 leading-relaxed border-t border-white/5 pt-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">1. One-Time Payment Structure</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                All JamBoost promotional campaigns are charged as a single, one-time fee in United States Dollars ($29 USD for Starter, $89 USD for Pro, $249 USD for Premium). There are no recurring monthly billing cycles, automatic renewals, or cancellation fees.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">2. Unpaid Submissions ('Awaiting payment')</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                Submissions listed in <span className="text-amber-400 font-semibold">'Awaiting payment'</span> have incurred no charges. If you change your mind prior to completing PayPal checkout, no payment has taken place and no refund request is necessary.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">3. Initial Editorial Review Stage ('Pending')</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                Once payment is confirmed, your campaign enters the <span className="text-amber-400 font-semibold">'Pending'</span> status for our team to review sound quality, metadata, and playlist suitability.
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-xs sm:text-sm text-gray-400">
                <li><strong className="text-white">Editorial Rejection:</strong> If our team rejects your submission during this initial review, a 100% full refund is issued automatically within 48 business hours.</li>
                <li><strong className="text-white">Artist Cancellation:</strong> If you request cancellation in writing before our team approves the campaign and begins pitching, you are entitled to a full 100% refund.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">4. Active Pitching & Completed Campaigns ('Approved', 'Live', 'Completed')</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                Once your campaign status moves to <span className="text-[#82C321] font-semibold">'Approved'</span> or <span className="text-[#82C321] font-semibold">'Live'</span>, our outreach specialists have delivered the pitching material to independent playlist curators. Because our service constitutes editorial labor and curator outreach, campaign fees become strictly non-refundable once pitching has begun.
              </p>
              <p className="text-xs sm:text-sm text-gray-400 mt-2">
                We do not sell streams or guarantee specific placement counts. Curator decisions to include or exclude a track are completely independent. A lack of curator placement does not entitle the artist to a refund.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">5. How to Request a Refund</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                To request a refund for a pre-pitch submission or report an issue, please send an email to our support team with the following details:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-xs sm:text-sm text-gray-400">
                <li>Your registered JamBoost account email</li>
                <li>Submission ID (visible in your Artist Dashboard)</li>
                <li>PayPal Transaction ID or Order Number</li>
                <li>Reason for your refund request</li>
              </ul>

              <div className="mt-4 p-4 bg-[#121212] rounded-2xl border border-white/5 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#82C321]" />
                  <div>
                    <div className="text-xs font-bold text-white">JamBoost Support Desk</div>
                    <div className="text-xs text-gray-400">support@jamboost.com</div>
                    <div className="text-[11px] text-gray-500">Typical response time: 24–48 business hours</div>
                  </div>
                </div>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
