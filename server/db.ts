import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, Campaign, Transaction, CuratorPitch, CampaignTimelineEvent } from '../src/types';
import { CURATOR_CATALOG } from '../src/data/curatorCatalog';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  users: User[];
  passwords: Record<string, string>; // userId -> hash
  campaigns: Campaign[];
  transactions: Transaction[];
}

export { CURATOR_CATALOG };

function getInitialData(): DatabaseSchema {
  const defaultUserId = 'user_sanelow_01';
  const defaultUser: User = {
    id: defaultUserId,
    email: 'SanelowLabel@gmail.com',
    name: 'Sanelow Records',
    artistName: 'Sanelow Collective',
    role: 'label',
    avatarUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=160&q=80',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const seedCampaign1: Campaign = {
    id: 'camp_9821_blinding',
    userId: defaultUserId,
    trackTitle: 'Midnight Drive (Remix)',
    artistName: 'Sanelow & K-Vibe',
    spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    artworkUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=400&q=80',
    genres: ['EDM', 'Pop', 'Dance'],
    targetMood: 'Energetic & Uplifting',
    playlistCount: 15,
    costPerPlaylist: 3.50,
    playlistsCost: 52.50,
    addons: {
      saves: 50,
      follows: 30,
      savesCost: 100.00,
      followsCost: 60.00,
    },
    subtotal: 212.50,
    discount: 0,
    totalCost: 212.50,
    status: 'active',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedReach: 680000,
    reachDelivered: 495000,
    savesDelivered: 42,
    followsDelivered: 26,
    placementsCount: 8,
    paypalOrderId: 'PAYID-MNA7612984120',
    timeline: [
      {
        id: 't_1',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        title: 'Campaign Order Processed',
        description: 'PayPal payment of $212.50 verified. Pitched to 15 verified Spotify curators.',
        type: 'order',
      },
      {
        id: 't_2',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        title: 'Curator Reviews Began',
        description: 'Stefan Lindqvist and Elena Rostova commenced active audio screening.',
        type: 'review',
      },
      {
        id: 't_3',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        title: 'First Major Playlist Placement',
        description: 'Added to "Global Club Anthems & EDM Heat" at position #4 (420,000 followers).',
        type: 'placement',
      },
      {
        id: 't_4',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        title: 'Add-On Delivery: 42 Saves & 26 Follows',
        description: 'High listener save rate recorded on Spotify algorithm radar.',
        type: 'delivery',
      },
    ],
    curatorPitches: [
      {
        id: 'pitch_1',
        curatorName: 'Elena Rostova',
        playlistName: 'Global Club Anthems & EDM Heat',
        playlistFollowers: 420000,
        genre: 'EDM',
        status: 'Placed',
        feedback: 'Incredible drop production and crisp mixdown. Added to top 5 rotation!',
        placedDate: '2 days ago',
        playlistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX4dyzvuaRJ0n',
        position: 4,
        streamImpactEstimate: 14200,
      },
      {
        id: 'pitch_2',
        curatorName: 'Stefan Lindqvist',
        playlistName: 'Mainstage Pop Daily',
        playlistFollowers: 580000,
        genre: 'Pop',
        status: 'Placed',
        feedback: 'Catchy synth lead that fits right into our afternoon drive mix.',
        placedDate: 'Yesterday',
        playlistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
        position: 9,
        streamImpactEstimate: 21500,
      },
      {
        id: 'pitch_3',
        curatorName: 'Kaiya Sato',
        playlistName: 'Deep Techno & Progressive Sessions',
        playlistFollowers: 195000,
        genre: 'Techno',
        status: 'In Review',
        streamImpactEstimate: 4500,
      },
      {
        id: 'pitch_4',
        curatorName: 'Marcus Vance',
        playlistName: 'Late Night Chill & Lo-Fi Beats',
        playlistFollowers: 184500,
        genre: 'Chillhop',
        status: 'Declined',
        feedback: 'Great track overall, but tempo is slightly too high for our relaxed coffee vibe.',
      },
      {
        id: 'pitch_5',
        curatorName: 'Darnell King',
        playlistName: 'Fresh Hip Hop & Melodic Flow',
        playlistFollowers: 310500,
        genre: 'Hip Hop',
        status: 'Pending',
      },
    ],
  };

  return {
    users: [defaultUser],
    passwords: {
      [defaultUserId]: 'password123',
    },
    campaigns: [seedCampaign1],
    transactions: [
      {
        id: 'tx_9821_paypal',
        campaignId: seedCampaign1.id,
        userId: defaultUserId,
        amount: 212.50,
        currency: 'USD',
        paymentMethod: 'paypal',
        paypalOrderId: 'PAYID-MNA7612984120',
        status: 'COMPLETED',
        createdAt: seedCampaign1.createdAt,
        customerEmail: defaultUser.email,
      },
    ],
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = getInitialData();
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error loading db.json, fallback to in-memory defaults:', err);
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db.json:', err);
    }
  }

  // Users
  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  verifyPassword(userId: string, pass: string): boolean {
    return this.data.passwords[userId] === pass;
  }

  createUser(email: string, pass: string, name: string, artistName?: string): User {
    const id = 'user_' + crypto.randomUUID().slice(0, 8);
    const newUser: User = {
      id,
      email,
      name,
      artistName: artistName || name,
      role: 'artist',
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.data.passwords[id] = pass;
    this.save();
    return newUser;
  }

  // Campaigns
  getCampaigns(userId?: string): Campaign[] {
    if (userId) {
      return this.data.campaigns.filter(c => c.userId === userId);
    }
    return this.data.campaigns;
  }

  getCampaignById(id: string): Campaign | undefined {
    return this.data.campaigns.find(c => c.id === id);
  }

  createCampaign(campaign: Campaign): Campaign {
    this.data.campaigns.unshift(campaign);
    this.save();
    return campaign;
  }

  updateCampaign(id: string, updates: Partial<Campaign>): Campaign | undefined {
    const idx = this.data.campaigns.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    this.data.campaigns[idx] = {
      ...this.data.campaigns[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.campaigns[idx];
  }

  // Transactions
  createTransaction(tx: Transaction): Transaction {
    this.data.transactions.unshift(tx);
    this.save();
    return tx;
  }

  getTransactions(userId?: string): Transaction[] {
    if (userId) {
      return this.data.transactions.filter(t => t.userId === userId);
    }
    return this.data.transactions;
  }

  // Real-time Campaign Simulation Step
  simulateCampaignStep(campaignId: string): Campaign | undefined {
    const campaign = this.getCampaignById(campaignId);
    if (!campaign) return undefined;

    // Advance pitches
    let updatedPitches = [...campaign.curatorPitches];
    let newTimelineEvents: CampaignTimelineEvent[] = [...campaign.timeline];
    let addedPlacement = false;

    // Find first pending or in-review pitch to advance
    const pendingIdx = updatedPitches.findIndex(p => p.status === 'Pending');
    if (pendingIdx !== -1) {
      updatedPitches[pendingIdx] = {
        ...updatedPitches[pendingIdx],
        status: 'In Review',
      };
      newTimelineEvents.unshift({
        id: 'evt_' + Date.now(),
        timestamp: new Date().toISOString(),
        title: `Curator Review Started`,
        description: `${updatedPitches[pendingIdx].curatorName} began evaluating "${campaign.trackTitle}".`,
        type: 'review',
      });
    } else {
      const reviewIdx = updatedPitches.findIndex(p => p.status === 'In Review');
      if (reviewIdx !== -1) {
        // 75% chance placed, 25% declined with constructive feedback
        const isApproved = Math.random() < 0.75;
        if (isApproved) {
          const placementPosition = Math.floor(Math.random() * 12) + 1;
          const estStreams = Math.floor(Math.random() * 15000) + 5000;
          updatedPitches[reviewIdx] = {
            ...updatedPitches[reviewIdx],
            status: 'Placed',
            placedDate: 'Just now',
            position: placementPosition,
            streamImpactEstimate: estStreams,
            feedback: 'Exceptional production quality and listener retention hooks. Added to priority tracklist!',
            playlistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX4dyzvuaRJ0n',
          };
          addedPlacement = true;
          newTimelineEvents.unshift({
            id: 'evt_' + Date.now(),
            timestamp: new Date().toISOString(),
            title: `Playlist Placement Confirmed!`,
            description: `Placed on "${updatedPitches[reviewIdx].playlistName}" (#${placementPosition}) with ${updatedPitches[reviewIdx].playlistFollowers.toLocaleString()} followers.`,
            type: 'placement',
          });
        } else {
          updatedPitches[reviewIdx] = {
            ...updatedPitches[reviewIdx],
            status: 'Declined',
            feedback: 'Solid mixing, but does not fit the curatorial direction of this week’s playlist lineup.',
          };
        }
      }
    }

    // Deliver incremental saves and follows if targeted
    const maxSaves = campaign.addons.saves;
    const maxFollows = campaign.addons.follows;
    let newSaves = campaign.savesDelivered;
    let newFollows = campaign.followsDelivered;

    if (newSaves < maxSaves) {
      const inc = Math.min(maxSaves - newSaves, Math.floor(Math.random() * 8) + 2);
      newSaves += inc;
    }
    if (newFollows < maxFollows) {
      const inc = Math.min(maxFollows - newFollows, Math.floor(Math.random() * 5) + 1);
      newFollows += inc;
    }

    const totalPlacements = updatedPitches.filter(p => p.status === 'Placed').length;
    const placedReach = updatedPitches
      .filter(p => p.status === 'Placed')
      .reduce((sum, p) => sum + p.playlistFollowers, 0);

    const isAllDone = updatedPitches.every(p => p.status === 'Placed' || p.status === 'Declined') &&
      newSaves >= maxSaves && newFollows >= maxFollows;

    return this.updateCampaign(campaignId, {
      curatorPitches: updatedPitches,
      placementsCount: totalPlacements,
      reachDelivered: Math.max(campaign.reachDelivered, placedReach),
      savesDelivered: newSaves,
      followsDelivered: newFollows,
      status: isAllDone ? 'completed' : 'active',
      timeline: newTimelineEvents.slice(0, 15),
    });
  }

  // Aggregate Analytics
  getAnalytics(): any {
    const allCampaigns = this.data.campaigns;
    const totalCampaigns = allCampaigns.length;
    const activeCampaigns = allCampaigns.filter(c => c.status === 'active' || c.status === 'in_review').length;
    
    let totalPitches = 0;
    let totalPlacements = 0;
    let totalReach = 0;
    let totalSaves = 0;
    let totalFollows = 0;

    allCampaigns.forEach(c => {
      totalPitches += c.curatorPitches.length;
      totalPlacements += c.placementsCount || 0;
      totalReach += c.reachDelivered || 0;
      totalSaves += c.savesDelivered || 0;
      totalFollows += c.followsDelivered || 0;
    });

    const placementRate = totalPitches > 0 ? Math.round((totalPlacements / totalPitches) * 100) : 74;

    return {
      totalCampaigns,
      activeCampaigns,
      totalPlaylistsPitched: totalPitches || 48,
      totalPlacements: totalPlacements || 36,
      placementRatePercent: placementRate || 75,
      totalAudienceReach: totalReach || 1280000,
      totalSavesDelivered: totalSaves || 340,
      totalFollowersGained: totalFollows || 190,
      averageResponseHours: 18.4,
      genreBreakdown: [
        { genre: 'EDM & Dance', count: 42, percentage: 35 },
        { genre: 'Hip Hop & Rap', count: 35, percentage: 29 },
        { genre: 'Pop & Commercial', count: 24, percentage: 20 },
        { genre: 'Indie & Alt', count: 12, percentage: 10 },
        { genre: 'R&B / Soul', count: 8, percentage: 6 },
      ],
      dailyGrowth: [
        { date: 'Mon', streams: 12400, saves: 45, follows: 18 },
        { date: 'Tue', streams: 18200, saves: 68, follows: 27 },
        { date: 'Wed', streams: 24900, saves: 92, follows: 41 },
        { date: 'Thu', streams: 31500, saves: 110, follows: 52 },
        { date: 'Fri', streams: 42000, saves: 145, follows: 78 },
        { date: 'Sat', streams: 58400, saves: 180, follows: 95 },
        { date: 'Sun', streams: 64100, saves: 210, follows: 112 },
      ],
    };
  }
}

export const db = new Database();
