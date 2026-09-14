import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { Campaign, Transaction } from '../types';
import {
  X,
  ShieldCheck,
  Lock,
  CheckCircle2,
  ArrowRight,
  Disc,
  AlertCircle,
  CreditCard,
  Zap,
} from 'lucide-react';

interface PayPalModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  onPaymentSuccess: (campaign: Campaign, transaction: Transaction) => void;
}

export const PayPalModal: React.FC<PayPalModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onPaymentSuccess,
}) => {
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'review' | 'processing' | 'success'>('review');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState<Transaction | null>(null);

  if (!isOpen || !campaign) return null;

  const handleProcessPayPalPayment = async () => {
    setProcessing(true);
    setErrorMessage(null);
    setStep('processing');

    try {
      // 1. Create PayPal Order on backend
      const orderData = await api.createPayPalOrder(campaign.id, campaign.totalCost);

      // Brief simulated payment handshake for fluid real-time feel
      await new Promise(res => setTimeout(res, 1200));

      // 2. Capture PayPal Order on backend
      const captureResult = await api.capturePayPalOrder(orderData.orderId, campaign.id);

      setTransactionData(captureResult.transaction);
      setStep('success');

      // Trigger Confetti Celebration
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF3333', '#FFFFFF', '#0070BA', '#003087'],
        });
      } catch (e) {
        console.log('Confetti effect executed', e);
      }

      onPaymentSuccess(captureResult.campaign, captureResult.transaction);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing failed. Please try again.');
      setStep('review');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="paypal-checkout-modal"
        className="w-full max-w-lg bg-[#181818] border border-[#2b2b2b] rounded-2xl p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Header Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#003087] via-[#0070BA] to-[#009CDE]" />

        {/* Close button */}
        {step !== 'processing' && (
          <button
            id="close-paypal-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 text-[#B3B3B3] hover:text-white p-1 rounded-lg hover:bg-[#222] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {step === 'review' && (
          <div>
            {/* Header */}
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#003087] flex items-center justify-center shadow-md">
                <span className="text-white font-black text-lg italic">P</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  PayPal Express Checkout
                </h3>
                <p className="text-xs text-[#B3B3B3] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400 inline" /> 256-Bit Encrypted Payment Pipeline
                </p>
              </div>
            </div>

            {/* Selected Track Summary Card */}
            <div className="bg-[#121212] border border-[#262626] rounded-xl p-3.5 mb-5 flex items-center space-x-3">
              <img
                src={campaign.artworkUrl}
                alt={campaign.trackTitle}
                className="w-14 h-14 rounded-lg object-cover shadow border border-[#333]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="px-1.5 py-0.5 rounded bg-red-950/70 border border-red-800/40 text-[10px] font-bold text-[#FF3333]">
                    CAMPAIGN
                  </span>
                  <span className="text-xs text-[#B3B3B3] truncate">Target: {campaign.genres.join(', ')}</span>
                </div>
                <h4 className="text-sm font-bold text-white truncate mt-0.5">{campaign.trackTitle}</h4>
                <p className="text-xs text-[#B3B3B3] truncate">{campaign.artistName}</p>
              </div>
            </div>

            {/* Itemized Order Breakdown */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 mb-5 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-[#B3B3B3]">
                <span>
                  Spotify Playlist Pitching ({campaign.playlistCount} Curators @ ${campaign.costPerPlaylist.toFixed(2)})
                </span>
                <span className="font-semibold text-white">${campaign.playlistsCost.toFixed(2)}</span>
              </div>

              {campaign.addons.saves > 0 && (
                <div className="flex justify-between items-center text-[#B3B3B3]">
                  <span>Song Saves Add-on ({campaign.addons.saves} units @ $2.00)</span>
                  <span className="font-semibold text-white">${campaign.addons.savesCost.toFixed(2)}</span>
                </div>
              )}

              {campaign.addons.follows > 0 && (
                <div className="flex justify-between items-center text-[#B3B3B3]">
                  <span>Profile Follows Add-on ({campaign.addons.follows} units @ $2.00)</span>
                  <span className="font-semibold text-white">${campaign.addons.followsCost.toFixed(2)}</span>
                </div>
              )}

              {campaign.discount > 0 && (
                <div className="flex justify-between items-center text-emerald-400">
                  <span>Volume Tier Discount (10% Off)</span>
                  <span className="font-semibold">-${campaign.discount.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#2a2a2a] flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-bold text-white">Total Amount Due</span>
                  <p className="text-[11px] text-[#777]">Includes curator review guarantee & algorithm protection</p>
                </div>
                <span className="text-xl font-extrabold text-[#FF3333]">
                  ${campaign.totalCost.toFixed(2)} <span className="text-xs font-normal text-[#B3B3B3]">USD</span>
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-700/50 rounded-xl flex items-center space-x-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#FF3333]" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* PayPal Instant Checkout CTA Buttons */}
            <div className="space-y-2.5">
              <button
                id="paypal-instant-checkout-btn"
                type="button"
                onClick={handleProcessPayPalPayment}
                disabled={processing}
                className="w-full bg-[#FFC439] hover:bg-[#F4BB30] text-[#003087] font-black text-sm py-3.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99]"
              >
                <span className="italic font-extrabold text-base tracking-tight">PayPal</span>
                <span className="font-bold text-sm text-[#003087]">Pay with PayPal</span>
              </button>

              <button
                id="paypal-debit-credit-btn"
                type="button"
                onClick={handleProcessPayPalPayment}
                disabled={processing}
                className="w-full bg-[#2c2c2c] hover:bg-[#363636] text-white font-semibold text-sm py-3 px-4 rounded-xl border border-[#3e3e3e] transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-[#B3B3B3]" />
                <span>Debit or Credit Card (via PayPal)</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="mt-5 flex items-center justify-center space-x-6 text-[11px] text-[#888]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Buyer Protection
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Instant Curator Pitching
              </span>
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-blue-400" /> Official Webhook Sync
              </span>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-10 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#003087]/20 border-2 border-[#0070BA] border-t-transparent animate-spin flex items-center justify-center" />
            <div>
              <h3 className="text-lg font-bold text-white">Communicating with PayPal Gateway</h3>
              <p className="text-xs text-[#B3B3B3] mt-1 max-w-xs mx-auto">
                Securely capturing transaction order & dispatching tracks to verified playlist curators...
              </p>
            </div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#1e1e1e] border border-[#333] text-[11px] text-[#B3B3B3]">
              <span className="w-2 h-2 rounded-full bg-[#FF3333] animate-ping" />
              <span>Verifying authorization token</span>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50 uppercase">
                Payment Confirmed
              </span>
              <h3 className="text-xl font-bold text-white mt-2 font-['Space_Grotesk']">
                Campaign Launched Successfully!
              </h3>
              <p className="text-xs text-[#B3B3B3] mt-1 max-w-sm mx-auto">
                Your track has been queued into active review across {campaign.playlistCount} Spotify playlists.
                Track real-time decisions on your live dashboard.
              </p>
            </div>

            {transactionData && (
              <div className="bg-[#121212] border border-[#262626] rounded-xl p-3 text-xs text-left max-w-sm mx-auto space-y-1">
                <div className="flex justify-between text-[#B3B3B3]">
                  <span>Transaction Reference</span>
                  <span className="font-mono text-white font-semibold">{transactionData.id}</span>
                </div>
                <div className="flex justify-between text-[#B3B3B3]">
                  <span>PayPal Order ID</span>
                  <span className="font-mono text-white">{transactionData.paypalOrderId}</span>
                </div>
                <div className="flex justify-between text-[#B3B3B3]">
                  <span>Status</span>
                  <span className="text-emerald-400 font-bold">COMPLETED & VERIFIED</span>
                </div>
              </div>
            )}

            <button
              id="view-live-campaign-btn"
              type="button"
              onClick={onClose}
              className="w-full bg-[#FF3333] hover:bg-[#e62e2e] text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg shadow-[#FF3333]/25 transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Go to Campaign Tracker</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
