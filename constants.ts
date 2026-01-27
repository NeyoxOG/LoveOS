import { User, AppItem, Reward, ThemeDef, DailyOffer } from './types';

export const USERS: User[] = [
  { 
    id: "fia", 
    name: "Fia", 
    role: "user", 
    password: "FiaundCollin*", 
    avatar: null 
  },
  { 
    id: "collin", 
    name: "Collin", 
    role: "admin", 
    password: "AmbradisPW826*", 
    avatar: null 
  },
  { 
    id: "guest", 
    name: "Gast", 
    role: "guest", 
    password: null, 
    avatar: null 
  }
];

export const APPS: AppItem[] = [
  { id:"love", name:"Love", icon:"💞", status:"available" },
  { id:"daily", name:"Daily", icon:"✨", status:"available" },
  { id:"valentine", name:"Valentinstag", icon:"💘", status:"lockedHint" },
  { id:"luna", name:"Luna", icon:"🐑", status:"lockedHint" },
  { id:"vault", name:"Message Vault", icon:"💌", status:"available" },
  { id:"diary", name:"Tagebuch", icon:"📔", status:"available" },
  { id:"games", name:"Arcade", icon:"🕹️", status:"available" },
  { id:"achievements", name:"Erfolge", icon:"🏆", status:"available" },
  { id:"messages", name:"Nachrichten", icon:"💬", status:"comingSoon" },
  { id:"settings", name:"Einstellungen", icon:"⚙️", status:"available" },
  { id:"admin", name:"Admin Center", icon:"🛠️", status:"available" }
];

export const NOISE_BG = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E`;

export const REWARD_CATALOG: Reward[] = [
  // Basics
  { id: 'reward.welcome', title: 'Willkommen in FiaOS', description: 'Der Anfang einer Reise ✨', icon: '✨' },
  { id: 'reward.firstLogin', title: 'Erster Login', description: 'Du bist erfolgreich eingeloggt 🔐', icon: '🔐' },
  { id: 'reward.firstAppOpen', title: 'Erste App geöffnet', description: 'Ein kleiner Schritt für dich... 📱', icon: '📱' },
  { id: 'reward.firstReward', title: 'Erster Erfolg', description: 'Aller Anfang ist leicht 🧩', icon: '🧩' },
  { id: 'reward.streak3', title: '3 Tage da', description: 'Du brennst für uns! 🔥', icon: '🔥' },
  { id: 'reward.secretLove', title: 'Secret Love', description: 'Du hast das Geheimnis gefunden 💗', icon: '💗' },
  
  // Games
  { id: 'games.stack.10', title: 'Stapler: Anfänger', description: '10 Herzen gestapelt 🧱', icon: '🧱' },
  { id: 'games.stack.50', title: 'Stapler: Profi', description: '50 Herzen gestapelt 🏗️', icon: '🏗️' },
  { id: 'games.stack.100', title: 'Stapler: Meister', description: '100 Herzen! Der Turm wackelt nicht. 👑', icon: '👑' },
  { id: 'games.react.first', title: 'Reflex: Erster Treffer', description: 'Ein perfekter Schlag ⚡', icon: '⚡' },
  { id: 'games.react.combo10', title: 'Reflex: Combo King', description: '10x Perfekt in Folge 🔥', icon: '🔥' },
  { id: 'games.react.200', title: 'Reflex: Speedster', description: 'Über 200 Punkte erreicht 🚀', icon: '🚀' },
  { id: 'games.fill.first', title: 'Packer: Erste Box', description: 'Ordnung muss sein 📦', icon: '📦' },
  { id: 'games.fill.300', title: 'Packer: Tetris God', description: 'Über 300 Punkte 🧠', icon: '🧠' },
  { id: 'games.fill.perfect', title: 'Packer: Perfektion', description: 'Eine Runde ohne Fehler ✨', icon: '✨' },
  { id: 'games.puzzle.solve', title: 'Puzzle: Gelöst', description: 'Bild zusammengesetzt 🧩', icon: '🧩' },
  { id: 'games.puzzle.sub60', title: 'Puzzle: Schnell', description: 'Unter 60 Sekunden ⏱️', icon: '⏱️' },
  { id: 'games.puzzle.sub40', title: 'Puzzle: Blitz', description: 'Unter 40 Sekunden ⚡', icon: '⚡' },

  // Diary
  { id: 'diary.first', title: 'Tagebuch: Erster Eintrag', description: 'Liebes Tagebuch... 📔', icon: '📔' },
  { id: 'diary.shared', title: 'Tagebuch: Wir', description: 'Ein gemeinsamer Moment 👫', icon: '👫' },
  { id: 'diary.streak3', title: 'Tagebuch: 3 Tage', description: 'Bleib dran! 🔥', icon: '🔥' },
  { id: 'diary.10', title: 'Tagebuch: Sammler', description: '10 Einträge verfasst ✍️', icon: '✍️' },
  { id: 'diary.30', title: 'Tagebuch: Autor', description: '30 Einträge! Ein echtes Buch. 📖', icon: '📖' },

  // Daily
  { id: 'daily.first', title: 'Daily: Der Anfang', description: 'Erstes Daily abgeholt ☀️', icon: '☀️' },
  { id: 'daily.streak3', title: 'Daily: 3 Tage', description: 'Die Sonne geht auf 🔥', icon: '🔥' },
  { id: 'daily.streak7', title: 'Daily: Eine Woche', description: 'Treue Seele 🗓️', icon: '🗓️' },
  { id: 'daily.total10', title: 'Daily: Sammler', description: '10 Belohnungen gesammelt 🎁', icon: '🎁' },
];

export const VALENTINE_REWARDS: Reward[] = [
  { id: 'valentine.reward.pizza', title: 'Pizza Date', description: 'Mit dir schmeckt alles besser. 🍕', icon: '🍕' },
  { id: 'valentine.reward.photo', title: 'Foto-Date', description: 'Eine Erinnerung für immer. 📸', icon: '📸' },
  { id: 'valentine.reward.letter', title: 'Brief: Wir in 5 Jahren', description: 'Ein Blick nach vorn. ✉️', icon: '✉️' },
  { id: 'valentine.reward.care', title: 'Care Day', description: 'Heute geht’s nur um uns. 🫶', icon: '🫶' },
  { id: 'valentine.reward.art', title: 'Gemeinsam malen', description: 'Unser Chaos, unser Kunstwerk. 🎨', icon: '🎨' },
  { id: 'valentine.reward.secret', title: 'Geheime Nachricht', description: 'Nur für dich. 💌', icon: '💌' },
];

export const THEMES: Record<string, ThemeDef> = {
  roseGlass: {
    id: 'roseGlass',
    name: 'Rose Glass',
    colors: {
      bgGradient: 'linear-gradient(to bottom right, #2e1065, #000)',
      cardBg: 'rgba(255, 255, 255, 0.08)',
      text: '#fff',
      textDim: 'rgba(255, 255, 255, 0.5)'
    }
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      bgGradient: 'linear-gradient(to bottom, #000, #111)',
      cardBg: '#1c1c1e',
      text: '#e5e5e5',
      textDim: '#888'
    }
  },
  cloud: {
    id: 'cloud',
    name: 'Cloud',
    colors: {
      bgGradient: 'linear-gradient(to top, #accbee 0%, #e7f0fd 100%)',
      cardBg: 'rgba(255, 255, 255, 0.6)',
      text: '#1e293b',
      textDim: 'rgba(30, 41, 59, 0.5)'
    }
  },
  matcha: {
    id: 'matcha',
    name: 'Matcha',
    colors: {
      bgGradient: 'linear-gradient(to top, #d4fc79 0%, #96e6a1 100%)',
      cardBg: 'rgba(255, 255, 255, 0.6)',
      text: '#064e3b',
      textDim: 'rgba(6, 78, 59, 0.5)'
    }
  }
};

export const DAILY_OFFERS: DailyOffer[] = [
    { id: 't1', type: 'text', rarity: 'common', title: 'Erinnerung', subtitle: 'Nur für dich', icon: '💌', payload: 'Ich bin stolz auf dich. Jeden Tag.' },
    { id: 't2', type: 'text', rarity: 'common', title: 'Moment der Ruhe', subtitle: 'Atme durch', icon: '🌬️', payload: 'Nimm dir 10 Sekunden. Augen zu. Denk an uns.' },
    { id: 'q1', type: 'quest', rarity: 'common', title: 'Emoji Quest', subtitle: 'Mini-Aufgabe', icon: '😎', payload: 'Schick mir ein Emoji, das deinen aktuellen Mood beschreibt.' },
    { id: 'q2', type: 'quest', rarity: 'common', title: 'Herz-Suche', subtitle: 'Mini-Aufgabe', icon: '💗', payload: 'Finde etwas Herzförmiges und mach ein Foto.' },
    { id: 'r1', type: 'reward', rarity: 'rare', title: 'Bonus Punkte', subtitle: 'Belohnung', icon: '🏆', payload: { rewardId: 'reward.streak3' } },
    { id: 'e1', type: 'theme', rarity: 'epic', title: 'Theme: Soft Pink', subtitle: 'Design Unlock', icon: '🎨', payload: { themeId: 'roseGlass' } }
];