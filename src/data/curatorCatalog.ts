export interface CuratorItem {
  name: string;
  playlist: string;
  followers: number;
  genres: string[];
  avatar: string;
}

export const CURATOR_CATALOG: CuratorItem[] = [
  { name: 'Marcus Vance', playlist: 'Late Night Chill & Lo-Fi Beats', followers: 184500, genres: ['Lo-Fi', 'R&B', 'Chillhop'], avatar: 'MV' },
  { name: 'Elena Rostova', playlist: 'Global Club Anthems & EDM Heat', followers: 420000, genres: ['EDM', 'House', 'Techno', 'Dance'], avatar: 'ER' },
  { name: 'Darnell King', playlist: 'Fresh Hip Hop & Melodic Flow', followers: 310500, genres: ['Hip Hop', 'Trap', 'Rap'], avatar: 'DK' },
  { name: 'Chloe Dubois', playlist: 'Indie Wave & Alternative Radar', followers: 145000, genres: ['Indie Rock', 'Alternative', 'Indie Pop'], avatar: 'CD' },
  { name: 'Stefan Lindqvist', playlist: 'Mainstage Pop Daily', followers: 580000, genres: ['Pop', 'Dance Pop', 'Synthpop'], avatar: 'SL' },
  { name: 'Zara Thorne', playlist: 'Midnight R&B Vibrations', followers: 235000, genres: ['R&B', 'Soul', 'Neo-Soul'], avatar: 'ZT' },
  { name: 'Lucas Silva', playlist: 'Latin Trap & Urbano Caliente', followers: 390000, genres: ['Latin', 'Reggaeton', 'Urbano'], avatar: 'LS' },
  { name: 'Kaiya Sato', playlist: 'Deep Techno & Progressive Sessions', followers: 195000, genres: ['Techno', 'Melodic Techno'], avatar: 'KS' },
  { name: 'Aiden Brooks', playlist: 'Acoustic Coffeehouse & Folk', followers: 165000, genres: ['Acoustic', 'Folk', 'Singer-Songwriter'], avatar: 'AB' },
  { name: 'Kofi Mensah', playlist: 'Afrobeats Worldwide Pulse', followers: 275000, genres: ['Afrobeat', 'Amapiano', 'Dancehall'], avatar: 'KM' },
];
