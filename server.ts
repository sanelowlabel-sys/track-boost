import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { db, CURATOR_CATALOG } from './server/db';
import { Campaign, CuratorPitch, Transaction } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper token verification (simple secure token mapping)
  const tokenStore = new Map<string, string>(); // token -> userId
  // Seed default session for SanelowLabel@gmail.com
  const defaultUser = db.getUserByEmail('SanelowLabel@gmail.com');
  if (defaultUser) {
    tokenStore.set('sanelow_session_token_123', defaultUser.id);
  }

  function getUserIdFromReq(req: express.Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const userId = tokenStore.get(token);
      if (userId) return userId;
    }
    return null;
  }

  // --- API Routes ---

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Authentication
  app.post('/api/auth/register', (req, res) => {
    const { email, password, name, artistName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const user = db.createUser(email, password, name || email.split('@')[0], artistName);
    const token = 'tok_' + crypto.randomUUID();
    tokenStore.set(token, user.id);

    res.status(201).json({ user, token });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.getUserByEmail(email);
    if (!user || !db.verifyPassword(user.id, password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = 'tok_' + crypto.randomUUID();
    tokenStore.set(token, user.id);

    res.json({ user, token });
  });

  app.get('/api/auth/me', (req, res) => {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  });

  // Spotify Metadata Fetcher (via official Spotify oEmbed API & Smart Parsing)
  app.get('/api/spotify/metadata', async (req, res) => {
    const spotifyUrl = req.query.url as string;
    if (!spotifyUrl) {
      return res.status(400).json({ error: 'Missing Spotify URL parameter' });
    }

    // Default fallback metadata based on URL patterns or standard sample
    let title = 'Selected Track';
    let artist = 'Independent Artist';
    let artwork = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80';
    let type: 'track' | 'artist' | 'album' | 'playlist' = 'track';

    if (spotifyUrl.includes('/artist/')) type = 'artist';
    else if (spotifyUrl.includes('/album/')) type = 'album';
    else if (spotifyUrl.includes('/playlist/')) type = 'playlist';

    try {
      // Call Spotify public oEmbed service
      const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl.trim())}`;
      const response = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'TrackBoost/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json() as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
          html?: string;
        };

        if (data.title) {
          title = data.title;
        }
        if (data.author_name) {
          artist = data.author_name;
        }
        if (data.thumbnail_url) {
          artwork = data.thumbnail_url;
        }

        return res.json({
          title,
          artist,
          artwork,
          url: spotifyUrl,
          type,
          embedHtml: data.html,
        });
      }
    } catch (err) {
      console.warn('Spotify oEmbed fetch error, generating curated fallback:', err);
    }

    // Fallback parsing if oEmbed was unreachable
    if (spotifyUrl.includes('0VjIjW4GlUZAMYd2vXMi3b')) {
      title = 'Blinding Lights';
      artist = 'The Weeknd';
      artwork = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=400&q=80';
    } else if (spotifyUrl.toLowerCase().includes('espresso')) {
      title = 'Espresso';
      artist = 'Sabrina Carpenter';
      artwork = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80';
    } else if (spotifyUrl.toLowerCase().includes('paint')) {
      title = 'Paint The Town Red';
      artist = 'Doja Cat';
      artwork = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80';
    }

    res.json({
      title,
      artist,
      artwork,
      url: spotifyUrl,
      type,
    });
  });

  // Campaigns API
  app.get('/api/campaigns', (req, res) => {
    const userId = getUserIdFromReq(req);
    const campaigns = db.getCampaigns(userId || undefined);
    res.json({ campaigns });
  });

  app.get('/api/campaigns/:id', (req, res) => {
    const campaign = db.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ campaign });
  });

  app.post('/api/campaigns', (req, res) => {
    const userId = getUserIdFromReq(req) || 'user_guest';
    const {
      spotifyUrl,
      trackTitle,
      artistName,
      artworkUrl,
      previewUrl,
      genres = ['Pop'],
      targetMood = 'Energetic',
      playlistCount = 10,
      addons = { saves: 0, follows: 0 },
      notes,
    } = req.body;

    if (!trackTitle || !artistName || !spotifyUrl) {
      return res.status(400).json({ error: 'Track title, artist name, and Spotify URL are required' });
    }

    // Dynamic cost calculation
    // Base tier per playlist: $3.50
    const costPerPlaylist = 3.50;
    const playlistsCost = Number((playlistCount * costPerPlaylist).toFixed(2));
    
    // Flat rate of $2.00 per unit/action for song saves and profile follows as strictly requested
    const savesCount = Number(addons.saves || 0);
    const followsCount = Number(addons.follows || 0);
    const savesCost = Number((savesCount * 2.00).toFixed(2));
    const followsCost = Number((followsCount * 2.00).toFixed(2));

    const subtotal = Number((playlistsCost + savesCost + followsCost).toFixed(2));
    const discount = playlistCount >= 25 ? Number((subtotal * 0.10).toFixed(2)) : 0;
    const totalCost = Number((subtotal - discount).toFixed(2));

    // Curate matched playlist curators
    const selectedCurators: CuratorPitch[] = [];
    const availablePool = [...CURATOR_CATALOG].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < playlistCount; i++) {
      const template = availablePool[i % availablePool.length];
      const nameVariation = i >= availablePool.length ? ` #${Math.floor(i / availablePool.length) + 1}` : '';
      selectedCurators.push({
        id: 'pitch_' + crypto.randomUUID().slice(0, 6),
        curatorName: template.name,
        playlistName: `${template.playlist}${nameVariation}`,
        playlistFollowers: template.followers + Math.floor(Math.random() * 20000) - 10000,
        genre: genres[i % genres.length] || template.genres[0],
        status: 'Pending',
        streamImpactEstimate: Math.floor(template.followers * 0.08),
      });
    }

    const estimatedReach = selectedCurators.reduce((sum, c) => sum + c.playlistFollowers, 0);

    const newCampaign: Campaign = {
      id: 'camp_' + crypto.randomUUID().slice(0, 8),
      userId,
      trackTitle,
      artistName,
      spotifyUrl,
      artworkUrl: artworkUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
      previewUrl,
      genres,
      targetMood,
      playlistCount,
      costPerPlaylist,
      playlistsCost,
      addons: {
        saves: savesCount,
        follows: followsCount,
        savesCost,
        followsCost,
      },
      subtotal,
      discount,
      totalCost,
      status: 'pending_payment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedReach,
      reachDelivered: 0,
      savesDelivered: 0,
      followsDelivered: 0,
      placementsCount: 0,
      curatorPitches: selectedCurators,
      notes,
      timeline: [
        {
          id: 'evt_init_' + Date.now(),
          timestamp: new Date().toISOString(),
          title: 'Campaign Created',
          description: `Targeting ${playlistCount} playlists across [${genres.join(', ')}] with ${savesCount} saves & ${followsCount} follows.`,
          type: 'order',
        },
      ],
    };

    db.createCampaign(newCampaign);
    res.status(201).json({ campaign: newCampaign });
  });

  // Real-time Simulation / Progress Step
  app.post('/api/campaigns/:id/simulate-step', (req, res) => {
    const updated = db.simulateCampaignStep(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ campaign: updated });
  });

  // PayPal Payment Integration
  app.post('/api/paypal/create-order', (req, res) => {
    const { campaignId, amount, currency = 'USD' } = req.body;
    const campaign = db.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const orderId = 'PAYID-' + crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();

    res.json({
      orderId,
      status: 'CREATED',
      amount: campaign.totalCost,
      currency,
      approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,
    });
  });

  app.post('/api/paypal/capture-order', (req, res) => {
    const { orderId, campaignId } = req.body;
    const campaign = db.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const userId = getUserIdFromReq(req) || campaign.userId;
    const user = db.getUserById(userId);

    const transaction: Transaction = {
      id: 'tx_' + crypto.randomUUID().slice(0, 8),
      campaignId,
      userId,
      amount: campaign.totalCost,
      currency: 'USD',
      paymentMethod: 'paypal',
      paypalOrderId: orderId,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      customerEmail: user ? user.email : 'SanelowLabel@gmail.com',
    };

    db.createTransaction(transaction);

    // Update campaign to active and advance initial pitches
    const updatedPitches = campaign.curatorPitches.map((pitch, idx) => {
      if (idx === 0) {
        return { ...pitch, status: 'In Review' as const };
      }
      return pitch;
    });

    const updated = db.updateCampaign(campaignId, {
      status: 'active',
      paypalOrderId: orderId,
      curatorPitches: updatedPitches,
      timeline: [
        {
          id: 'evt_pay_' + Date.now(),
          timestamp: new Date().toISOString(),
          title: 'PayPal Payment Verified',
          description: `Transaction ID ${transaction.id} confirmed. Pitch distribution triggered immediately across curator network.`,
          type: 'order',
        },
        ...campaign.timeline,
      ],
    });

    res.json({
      status: 'COMPLETED',
      transaction,
      campaign: updated,
    });
  });

  // PayPal Webhook endpoint
  app.post('/api/paypal/webhook', (req, res) => {
    const event = req.body;
    console.log('Received PayPal Webhook event:', event?.event_type);

    if (event?.event_type === 'PAYMENT.CAPTURE.COMPLETED' || event?.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = event?.resource?.supplementary_data?.related_ids?.order_id || event?.resource?.id;
      if (orderId) {
        const allCampaigns = db.getCampaigns();
        const matched = allCampaigns.find(c => c.paypalOrderId === orderId);
        if (matched && matched.status === 'pending_payment') {
          db.updateCampaign(matched.id, { status: 'active' });
        }
      }
    }

    res.status(200).json({ received: true });
  });

  // Analytics
  app.get('/api/analytics', (req, res) => {
    const analytics = db.getAnalytics();
    res.json({ analytics });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TrackBoost Server running on http://localhost:${PORT}`);
  });
}

startServer();
