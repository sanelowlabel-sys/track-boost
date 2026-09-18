export type SpotifyItemType = 'track' | 'album' | 'playlist';

export type SubmissionStatus = 'Pending' | 'Approved' | 'Live' | 'Completed' | 'Rejected';

export type CampaignTier = 'Starter' | 'Pro' | 'Viral';

export interface Submission {
  id: string;
  user_id: string;
  user_email: string;
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
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  created_at: string;
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
}
