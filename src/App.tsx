import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { SubmissionWizard } from './components/SubmissionWizard';
import { CampaignDetails } from './components/CampaignDetails';
import { AnalyticsView } from './components/AnalyticsView';
import { CuratorNetworkView } from './components/CuratorNetworkView';
import { AuthModal } from './components/AuthModal';
import { PayPalModal } from './components/PayPalModal';
import { Campaign, Transaction } from './types';
import { api } from './services/api';
import { Disc3, ShieldCheck, Flame, Radio, Heart } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'wizard' | 'curators' | 'analytics'>('dashboard');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPayPalModalOpen, setIsPayPalModalOpen] = useState(false);
  const [payPalTargetCampaign, setPayPalTargetCampaign] = useState<Campaign | null>(null);

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
      if (selectedCampaign) {
        const fresh = data.find(c => c.id === selectedCampaign.id);
        if (fresh) setSelectedCampaign(fresh);
      }
    } catch (err) {
      console.warn('Failed to fetch campaigns:', err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [isAuthenticated]);

  // Periodic polling for real-time live simulation updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCampaigns();
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedCampaign?.id]);

  const handleCampaignCreated = (newCampaign: Campaign) => {
    setCampaigns(prev => [newCampaign, ...prev]);
    setSelectedCampaign(newCampaign);
    setActiveTab('dashboard');
  };

  const handleOpenPayPal = (campaign: Campaign) => {
    setPayPalTargetCampaign(campaign);
    setIsPayPalModalOpen(true);
  };

  const handlePaymentSuccess = (updatedCampaign: Campaign, tx: Transaction) => {
    setCampaigns(prev => prev.map(c => (c.id === updatedCampaign.id ? updatedCampaign : c)));
    setSelectedCampaign(updatedCampaign);
    setActiveTab('dashboard');
  };

  const handleSelectCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
  };

  const handleCampaignUpdated = (updated: Campaign) => {
    setSelectedCampaign(updated);
    setCampaigns(prev => prev.map(c => (c.id === updated.id ? updated : c)));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Disc3 className="w-10 h-10 text-[#FF3333] animate-spin mx-auto" />
          <p className="text-xs text-[#888] font-medium tracking-wide">Initializing TrackBoost Promotion Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col selection:bg-[#FF3333] selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={tab => {
          setActiveTab(tab);
          if (tab !== 'dashboard') {
            setSelectedCampaign(null);
          }
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1">
        {activeTab === 'dashboard' && (
          selectedCampaign ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <CampaignDetails
                campaign={selectedCampaign}
                onBack={() => setSelectedCampaign(null)}
                onCampaignUpdated={handleCampaignUpdated}
              />
            </div>
          ) : (
            <Dashboard
              campaigns={campaigns}
              onSelectCampaign={handleSelectCampaign}
              onNewCampaign={() => {
                setSelectedCampaign(null);
                setActiveTab('wizard');
              }}
              onPayCampaign={handleOpenPayPal}
            />
          )
        )}

        {activeTab === 'wizard' && (
          <SubmissionWizard
            onCampaignCreated={handleCampaignCreated}
            onOpenPayPal={handleOpenPayPal}
          />
        )}

        {activeTab === 'curators' && (
          <CuratorNetworkView
            onStartCampaign={() => {
              setSelectedCampaign(null);
              setActiveTab('wizard');
            }}
          />
        )}

        {activeTab === 'analytics' && <AnalyticsView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#222222] bg-[#101010] py-8 text-xs text-[#777]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white font-['Space_Grotesk']">
              Track<span className="text-[#FF3333]">Boost</span>
            </span>
            <span>•</span>
            <span>Independent Spotify Playlist Pitching & Algorithm Optimization Platform</span>
          </div>

          <div className="flex items-center space-x-6 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Organic Delivery
            </span>
            <span className="flex items-center gap-1 text-[#FF3333]">
              <Radio className="w-3.5 h-3.5" /> 48h Curator SLA
            </span>
            <span className="text-[#999]">
              Modeled after modern music promotion services
            </span>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* PayPal Express Modal */}
      <PayPalModal
        isOpen={isPayPalModalOpen}
        onClose={() => setIsPayPalModalOpen(false)}
        campaign={payPalTargetCampaign}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
