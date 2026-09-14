import {
  User,
  Campaign,
  CreateCampaignInput,
  Transaction,
  PlatformAnalytics,
  SpotifyTrackMeta,
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('trackboost_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Auth
  async login(email: string, pass: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async register(
    email: string,
    pass: string,
    name: string,
    artistName?: string
  ): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, name, artistName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      throw new Error('Not authenticated');
    }
    return res.json();
  },

  // Spotify Metadata
  async fetchSpotifyMeta(spotifyUrl: string): Promise<SpotifyTrackMeta> {
    const res = await fetch(`${API_BASE}/spotify/metadata?url=${encodeURIComponent(spotifyUrl)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch Spotify metadata' }));
      throw new Error(err.error || 'Failed to fetch Spotify metadata');
    }
    return res.json();
  },

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    const res = await fetch(`${API_BASE}/campaigns`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      throw new Error('Failed to load campaigns');
    }
    const data = await res.json();
    return data.campaigns || [];
  },

  async getCampaignById(id: string): Promise<Campaign> {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      throw new Error('Campaign not found');
    }
    const data = await res.json();
    return data.campaign;
  },

  async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create campaign' }));
      throw new Error(err.error || 'Failed to create campaign');
    }
    const data = await res.json();
    return data.campaign;
  },

  async simulateCampaignStep(campaignId: string): Promise<Campaign> {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/simulate-step`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      throw new Error('Failed to simulate step');
    }
    const data = await res.json();
    return data.campaign;
  },

  // PayPal
  async createPayPalOrder(campaignId: string, amount: number): Promise<{ orderId: string; approvalUrl: string }> {
    const res = await fetch(`${API_BASE}/paypal/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ campaignId, amount }),
    });
    if (!res.ok) {
      throw new Error('Failed to create PayPal order');
    }
    return res.json();
  },

  async capturePayPalOrder(orderId: string, campaignId: string): Promise<{ transaction: Transaction; campaign: Campaign }> {
    const res = await fetch(`${API_BASE}/paypal/capture-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ orderId, campaignId }),
    });
    if (!res.ok) {
      throw new Error('Failed to capture PayPal payment');
    }
    return res.json();
  },

  // Analytics
  async getAnalytics(): Promise<PlatformAnalytics> {
    const res = await fetch(`${API_BASE}/analytics`);
    if (!res.ok) {
      throw new Error('Failed to fetch analytics');
    }
    const data = await res.json();
    return data.analytics;
  },
};
