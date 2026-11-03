export type SpotifyItemType = 'track' | 'album' | 'playlist';

export type SubmissionStatus = 'Awaiting payment' | 'Pending' | 'Approved' | 'Live' | 'Completed' | 'Rejected';

export type CampaignTier = 'Starter' | 'Pro' | 'Premium' | 'Viral';

export interface PlanConfig {
  tier: CampaignTier;
  name: string;
  price: number;
  priceDisplay: string;
  currency: string;
  description: string;
  curatorsPitched: number;
  features: string[];
  deliverables: string[];
  popular?: boolean;
}

export const PLANS: Record<CampaignTier, PlanConfig> = {
  Starter: {
    tier: 'Starter',
    name: 'Starter',
    price: 29,
    priceDisplay: '$29',
    currency: 'USD',
    description: 'Direct pitch campaign for new or emerging single releases.',
    curatorsPitched: 20,
    features: [
      'Pitching to 20 independent playlist curators',
      'Initial track quality & genre fit review',
      'Curator placement updates in dashboard',
      'One-time fee • No recurring subscription',
    ],
    deliverables: [
      'Pitched to 20 independent playlist curators',
      'Track quality & genre fit review',
      'Placements & status tracked in dashboard',
      '100% pre-pitch rejection refund policy',
    ],
  },
  Pro: {
    tier: 'Pro',
    name: 'Pro',
    price: 89,
    priceDisplay: '$89',
    currency: 'USD',
    description: 'Expanded pitching campaign across genre-specific playlist networks.',
    curatorsPitched: 60,
    features: [
      'Pitching to 60 independent playlist curators',
      'Priority editorial review within 48 hours',
      'Genre and territory targeting options',
      'Curator placements and notes in dashboard',
      'One-time fee • No recurring subscription',
    ],
    deliverables: [
      'Pitched to 60 independent playlist curators',
      'Priority review within 48 hours',
      'Genre & territory targeting',
      'Curator feedback & dashboard reporting',
    ],
    popular: true,
  },
  Premium: {
    tier: 'Premium',
    name: 'Premium',
    price: 249,
    priceDisplay: '$249',
    currency: 'USD',
    description: 'Comprehensive outreach campaign across targeted playlist networks.',
    curatorsPitched: 150,
    features: [
      'Pitching to 150 independent playlist curators',
      'Fast-track review within 24 hours',
      'Targeted genre, territory & network pitching',
      'Full campaign progress and feedback report',
      'One-time fee • No recurring subscription',
    ],
    deliverables: [
      'Pitched to 150 independent playlist curators',
      'Fast-track review within 24 hours',
      'Comprehensive network outreach',
      'Full placement and curator feedback report',
    ],
  },
  // Maintained for backward compatibility with database rows
  Viral: {
    tier: 'Viral',
    name: 'Premium',
    price: 249,
    priceDisplay: '$249',
    currency: 'USD',
    description: 'Comprehensive outreach campaign across targeted playlist networks.',
    curatorsPitched: 150,
    features: [
      'Pitching to 150 independent playlist curators',
      'Fast-track review within 24 hours',
      'Targeted genre, territory & network pitching',
      'Full campaign progress and feedback report',
      'One-time fee • No recurring subscription',
    ],
    deliverables: [
      'Pitched to 150 independent playlist curators',
      'Fast-track review within 24 hours',
      'Comprehensive network outreach',
      'Full placement and curator feedback report',
    ],
  },
};

export const DISPLAY_PLANS: PlanConfig[] = [
  PLANS.Starter,
  PLANS.Pro,
  PLANS.Premium,
];

export interface SpotifyLookupResult {
  type: SpotifyItemType;
  id: string;
  title: string;
  artists: string[];
  image_url: string;
  spotify_url: string;
}

export interface Submission {
  id: string;
  user_id: string;
  user_email?: string;
  spotify_url: string;
  spotify_id: string;
  item_type: SpotifyItemType;
  title: string;
  artist: string;
  genre: string;
  territory: string;
  plan: CampaignTier;
  status: SubmissionStatus;
  delivered_streams: number;
  target_streams: number;
  saves_count: number;
  playlists_added: number;
  created_at: string;
  updated_at: string;
  notes?: string;
  profiles?: {
    display_name?: string;
    email?: string;
  } | null;
  display_name?: string;
  image_url?: string;
  cover_image_url?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  display_name?: string;
  role?: string;
  created_at?: string;
}

export interface SubmissionFormData {
  spotify_url: string;
  item_type: SpotifyItemType;
  title: string;
  artist: string;
  genre: string;
  territory: string;
  plan: CampaignTier;
  target_streams: number;
  image_url?: string | null;
}
