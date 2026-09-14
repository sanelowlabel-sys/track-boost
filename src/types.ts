export interface User {
  id: string;
  email: string;
  name: string;
  artistName?: string;
  avatarUrl?: string;
  createdAt: string;
  role: 'artist' | 'label' | 'admin';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface SpotifyTrackMeta {
  title: string;
  artist: string;
  artwork: string;
  url: string;
  spotifyUri?: string;
  album?: string;
  releaseYear?: string;
  previewUrl?: string;
  type: 'track' | 'artist' | 'album' | 'playlist';
  embedHtml?: string;
}

export type CuratorReviewStatus = 'Pending' | 'In Review' | 'Placed' | 'Declined';

export interface CuratorPitch {
  id: string;
  curatorName: string;
  playlistName: string;
  playlistFollowers: number;
  genre: string;
  status: CuratorReviewStatus;
  feedback?: string;
  placedDate?: string;
  playlistUrl?: string;
  position?: number;
  streamImpactEstimate?: number;
}

export interface CampaignAddons {
  saves: number;
  follows: number;
  savesCost: number;
  followsCost: number;
}

export type CampaignStatus = 'draft' | 'pending_payment' | 'active' | 'in_review' | 'completed';

export interface CampaignTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: 'order' | 'pitch' | 'review' | 'placement' | 'delivery' | 'milestone';
}

export interface Campaign {
  id: string;
  userId: string;
  trackTitle: string;
  artistName: string;
  spotifyUrl: string;
  artworkUrl: string;
  previewUrl?: string;
  genres: string[];
  targetMood: string;
  playlistCount: number;
  costPerPlaylist: number;
  playlistsCost: number;
  addons: CampaignAddons;
  subtotal: number;
  discount: number;
  totalCost: number;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  estimatedReach: number;
  reachDelivered: number;
  savesDelivered: number;
  followsDelivered: number;
  placementsCount: number;
  curatorPitches: CuratorPitch[];
  timeline: CampaignTimelineEvent[];
  notes?: string;
  paypalOrderId?: string;
}

export interface CreateCampaignInput {
  spotifyUrl: string;
  trackTitle: string;
  artistName: string;
  artworkUrl: string;
  previewUrl?: string;
  genres: string[];
  targetMood: string;
  playlistCount: number;
  addons: {
    saves: number;
    follows: number;
  };
  notes?: string;
}

export interface Transaction {
  id: string;
  campaignId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: 'paypal' | 'paypal_sandbox' | 'card';
  paypalOrderId: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  createdAt: string;
  customerEmail: string;
}

export interface PlatformAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalPlaylistsPitched: number;
  totalPlacements: number;
  placementRatePercent: number;
  totalAudienceReach: number;
  totalSavesDelivered: number;
  totalFollowersGained: number;
  averageResponseHours: number;
  genreBreakdown: { genre: string; count: number; percentage: number }[];
  dailyGrowth: { date: string; streams: number; saves: number; follows: number }[];
}
