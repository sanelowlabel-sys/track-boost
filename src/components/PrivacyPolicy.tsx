import React from 'react';
import { motion } from 'motion/react';
import { Lock, ArrowLeft, ShieldCheck, Database, UserCheck, Mail, AlertCircle } from 'lucide-react';
import { JamBoostLogo } from './JamBoostLogo';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
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
              <Lock className="w-4 h-4" />
              <span>POPIA Privacy Notice</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-sm text-gray-400 mt-2">
              Last updated: October 26, 2026 • Protection of Personal Information Act (POPIA) Compliant
            </p>
          </div>

          {/* POPIA Summary Banner */}
          <div className="p-5 rounded-2xl bg-[#121212] border border-white/5 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[#82C321]">
              Commitment to South African Privacy Standards
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              JamBoost respects your privacy and is committed to protecting your personal information in accordance with the Protection of Personal Information Act, 2013 (Act No. 4 of 2013) ("POPIA") of the Republic of South Africa. This Privacy Policy details how we collect, store, process, and protect your information.
            </p>
          </div>

          {/* Policy Sections */}
          <div className="space-y-8 text-sm text-gray-300 leading-relaxed border-t border-white/5 pt-6">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">1.</span> Personal Information We Collect
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                We collect only the personal information necessary to deliver our music promotion pitching services:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-gray-400">
                <li><strong className="text-white">Account Information:</strong> Your email address and artist or stage name provided during sign-up.</li>
                <li><strong className="text-white">Release Metadata:</strong> Public Spotify URLs, track/album titles, artist names, artwork URLs, and musical genres submitted for pitching.</li>
                <li><strong className="text-white">Transaction Identifiers:</strong> Payment reference numbers and order IDs issued by PayPal. <em className="text-gray-300">We do not store your credit card numbers, CVVs, or bank account details; all payment credentials are handled securely by our payment operator.</em></li>
                <li><strong className="text-white">Communication Records:</strong> Feedback messages or support tickets sent via email.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">2.</span> Purpose and Legal Basis of Processing
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                Under Section 11 of POPIA, we process personal information on the following lawful bases:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-400">
                <li>To perform our contractual obligations: pitching your releases to independent playlist curators and maintaining your real-time campaign dashboard.</li>
                <li>To communicate campaign progress, review statuses, and support inquiries.</li>
                <li>To comply with statutory financial, accounting, and anti-fraud reporting requirements.</li>
                <li>With your explicit consent for any optional marketing communications.</li>
              </ul>
              <p className="text-xs sm:text-sm font-semibold text-white mt-2">
                We never sell, rent, or trade your personal information to third parties.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">3.</span> Designated Operators (Data Processors)
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                In terms of Section 20 and 21 of POPIA, we engage reputable third-party service providers ("Operators") to process data on our behalf under strict confidentiality and security terms:
              </p>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-[#121212] rounded-xl border border-white/5 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#82C321]" />
                    <span>Supabase Inc.</span>
                  </div>
                  <p className="text-gray-400">
                    Provides our database hosting, authentication, and encrypted PostgreSQL infrastructure.
                  </p>
                </div>
                <div className="p-3.5 bg-[#121212] rounded-xl border border-white/5 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>PayPal Holdings, Inc.</span>
                  </div>
                  <p className="text-gray-400">
                    Processes all one-time checkout payments in USD, complying with PCI-DSS Tier 1 security.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">4.</span> Data Retention
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                We retain your account and campaign information for as long as your JamBoost account remains active or as required by South African law (such as the 5-year statutory retention period for financial transaction records under the Tax Administration Act). When personal information is no longer needed, it is deleted or de-identified.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">5.</span> Your Rights as a Data Subject
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                Under POPIA, you have the right to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-400">
                <li><strong className="text-white">Right of Access (Section 23):</strong> Request confirmation and copies of personal information held by JamBoost.</li>
                <li><strong className="text-white">Right to Correction or Deletion (Section 24):</strong> Request the correction, completion, or deletion of inaccurate, irrelevant, or unlawfully obtained personal information.</li>
                <li><strong className="text-white">Right to Object (Section 11(3)):</strong> Object on reasonable grounds to the processing of your personal information.</li>
                <li><strong className="text-white">Right to Withdraw Consent:</strong> Withdraw any previously given consent at any time.</li>
              </ul>
              <p className="text-xs sm:text-sm text-gray-400 mt-2">
                To exercise any of these rights, submit a written request to our Information Officer using the contact details below.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">6.</span> Contacting Our Information Officer
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                In compliance with Section 55 of POPIA, JamBoost has appointed an Information Officer responsible for ensuring privacy compliance and addressing data subject requests:
              </p>
              <div className="p-4 bg-[#121212] rounded-2xl border border-white/5 space-y-1 text-xs">
                <div className="font-bold text-white">JamBoost Information Officer</div>
                <div className="text-gray-400">Email: <span className="text-[#82C321] font-semibold">privacy@jamboost.com</span></div>
                <div className="text-gray-400">Physical Address: Cape Town, Western Cape, Republic of South Africa</div>
                <div className="text-gray-400">Operating Hours: Monday – Friday, 09:00 – 17:00 SAST</div>
              </div>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#82C321]">7.</span> Complaints to the Information Regulator
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                If you believe your personal information has been processed in breach of POPIA and we have not resolved your concern, you have the right to lodge a complaint with the South African Information Regulator:
              </p>
              <div className="p-4 bg-[#121212] rounded-2xl border border-white/5 space-y-1 text-xs text-gray-400">
                <p className="font-semibold text-white">The Information Regulator (South Africa)</p>
                <p>Website: <a href="https://inforegulator.org.za" target="_blank" rel="noreferrer" className="text-[#82C321] underline">inforegulator.org.za</a></p>
                <p>Complaints Email: <span className="text-gray-300">complaints.IR@justice.gov.za</span> / <span className="text-gray-300">POPIAComplaints@inforegulator.org.za</span></p>
                <p>General Inquiries: <span className="text-gray-300">enquiries@inforegulator.org.za</span></p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
