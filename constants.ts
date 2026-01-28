
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
  { id:"story", name: "Story of Love", icon: "🎞️", status: "available" },
  { id:"daily", name:"Daily", icon:"✨", status:"available" },
  { id:"rewards_app", name:"Belohnungen", icon:"🎁", status:"available" },
  { id:"messages", name:"Nachrichten", icon:"💬", status:"available" },
  { id:"valentine", name:"Valentinstag", icon:"💘", status:"lockedHint" },
  { id:"luna", name:"Luna", icon:"🐑", status:"lockedHint" },
  { id:"vault", name:"Message Vault", icon:"💌", status:"available" },
  { id:"diary", name:"Tagebuch", icon:"📔", status:"available" },
  { id:"games", name:"Arcade", icon:"🕹️", status:"available" },
  { id:"achievements", name:"Erfolge", icon:"🏆", status:"available" },
  { id:"settings", name:"Einstellungen", icon:"⚙️", status:"available" },
  { id:"admin", name:"Admin Center", icon:"🛠️", status:"available" }
];

export const NOISE_BG = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E`;

export const REWARD_CATALOG: Reward[] = [
  // Basics
  { id: 'reward.welcome', title: 'Willkommen in FiaOS', description: 'Der Anfang einer Reise ✨', icon: '✨', category: 'general' },
  { id: 'reward.firstLogin', title: 'Erster Login', description: 'Du bist erfolgreich eingeloggt 🔐', icon: '🔐', category: 'general' },
  { id: 'reward.firstAppOpen', title: 'Erste App geöffnet', description: 'Ein kleiner Schritt für dich... 📱', icon: '📱', category: 'general' },
  { id: 'reward.firstReward', title: 'Erster Erfolg', description: 'Aller Anfang ist leicht 🧩', icon: '🧩', category: 'general' },
  { id: 'reward.streak3', title: '3 Tage da', description: 'Du brennst für uns! 🔥', icon: '🔥', category: 'general' },
  { id: 'reward.secretLove', title: 'Secret Love', description: 'Du hast das Geheimnis gefunden 💗', icon: '💗', category: 'general' },
  
  // Special Welcome Gift
  { 
    id: 'reward.welcomeTheme', 
    title: 'Willkommens-Geschenk', 
    description: 'Theme: Aurora freischalten 🌌', 
    icon: '🎁', 
    type: 'theme_unlock', 
    category: 'general',
    payload: { themeId: 'aurora' }
  },

  // Games
  { id: 'games.stack.10', title: 'Stapler: Anfänger', description: '10 Herzen gestapelt 🧱', icon: '🧱', category: 'games' },
  { id: 'games.stack.50', title: 'Stapler: Profi', description: '50 Herzen gestapelt 🏗️', icon: '🏗️', category: 'games' },
  { id: 'games.stack.100', title: 'Stapler: Meister', description: '100 Herzen! Der Turm wackelt nicht. 👑', icon: '👑', category: 'games' },
  { id: 'games.react.first', title: 'Reflex: Erster Treffer', description: 'Ein perfekter Schlag ⚡', icon: '⚡', category: 'games' },
  { id: 'games.react.combo10', title: 'Reflex: Combo King', description: '10x Perfekt in Folge 🔥', icon: '🔥', category: 'games' },
  { id: 'games.react.200', title: 'Reflex: Speedster', description: 'Über 200 Punkte erreicht 🚀', icon: '🚀', category: 'games' },
  
  // BlockBlast
  { id: 'games.block.starter', title: 'Block: Starter', description: '500 Punkte erreicht 🟦', icon: '🟦', category: 'games' },
  { id: 'games.block.master', title: 'Block: Master', description: '1500 Punkte. Das Grid gehört dir! 🧠', icon: '🧠', category: 'games' },
  { id: 'games.block.combo', title: 'Block: Combo Love', description: '3 Reihen auf einmal zerstört! 💥', icon: '💥', category: 'games' },

  { id: 'games.puzzle.solve', title: 'Puzzle: Gelöst', description: 'Bild zusammengesetzt 🧩', icon: '🧩', category: 'games' },
  { id: 'games.puzzle.sub60', title: 'Puzzle: Schnell', description: 'Unter 60 Sekunden ⏱️', icon: '⏱️', category: 'games' },
  { id: 'games.puzzle.sub40', title: 'Puzzle: Blitz', description: 'Unter 40 Sekunden ⚡', icon: '⚡', category: 'games' },
  { id: 'snake_score_10', title: 'Snake: Anfänger', description: '10 Punkte erreicht 🐍', icon: '🐍', category: 'games' },
  { id: 'snake_score_25', title: 'Snake: Jäger', description: '25 Punkte. Schlange wächst! 🍎', icon: '🍎', category: 'games' },
  { id: 'snake_score_50', title: 'Snake: Legende', description: '50 Punkte. Das Display wird eng. 🏆', icon: '🏆', category: 'games' },
  { id: 'snake.survival', title: 'Snake: No Fear', description: '30s mit Gegner überlebt 👿', icon: '👿', category: 'games' },
  
  // Flappy Love
  { id: 'flappy_score_5', title: 'Flappy: Start', description: 'Die ersten 5 Hindernisse 🐦', icon: '🐦', category: 'games' },
  { id: 'flappy_score_15', title: 'Flappy: Profi', description: '15 Hindernisse überwunden 🌬️', icon: '🌬️', category: 'games' },
  { id: 'flappy_score_30', title: 'Flappy: Meister', description: '30 Punkte! Du kannst fliegen. 💗', icon: '💗', category: 'games' },

  // Diary
  { id: 'diary.first', title: 'Tagebuch: Erster Eintrag', description: 'Liebes Tagebuch... 📔', icon: '📔', category: 'diary' },
  { id: 'diary.shared', title: 'Tagebuch: Wir', description: 'Ein gemeinsamer Moment 👫', icon: '👫', category: 'diary' },
  { id: 'diary.streak3', title: 'Tagebuch: 3 Tage', description: 'Bleib dran! 🔥', icon: '🔥', category: 'diary' },
  { id: 'diary.10', title: 'Tagebuch: Sammler', description: '10 Einträge verfasst ✍️', icon: '✍️', category: 'diary' },
  { id: 'diary.30', title: 'Tagebuch: Autor', description: '30 Einträge! Ein echtes Buch. 📖', icon: '📖', category: 'diary' },

  // Daily
  { id: 'daily.first', title: 'Daily: Der Anfang', description: 'Erstes Daily abgeholt ☀️', icon: '☀️', category: 'general' },
  { id: 'daily.streak3', title: 'Daily: 3 Tage', description: 'Die Sonne geht auf 🔥', icon: '🔥', category: 'general' },
  { id: 'daily.streak7', title: 'Daily: Eine Woche', description: 'Treue Seele 🗓️', icon: '🗓️', category: 'general' },
  { id: 'daily.total10', title: 'Daily: Sammler', description: '10 Belohnungen gesammelt 🎁', icon: '🎁', category: 'general' },
  { id: 'daily.points100', title: 'Daily: 100 Punkte', description: 'Royal Theme freigeschaltet 👑', icon: '👑', category: 'general', type: 'theme_unlock', payload: { themeId: 'royal' } },

  // Love & Themes
  { 
    id: 'love_1_month', 
    title: '1 Monat Wir', 
    description: 'Theme: Soft Rose freigeschaltet 🌹', 
    icon: '🌹', 
    type: 'theme_unlock', 
    category: 'love',
    payload: { themeId: 'softRose' } 
  },
  { 
    id: 'love_3_month', 
    title: '3 Monate Wir', 
    description: 'Theme: Midnight Love freigeschaltet 🌙', 
    icon: '🌙', 
    type: 'theme_unlock', 
    category: 'love',
    payload: { themeId: 'midnightLove' } 
  },
  { 
    id: 'love_6_month', 
    title: '6 Monate Wir', 
    description: 'Theme: Pastel Sky freigeschaltet ☁️', 
    icon: '☁️', 
    type: 'theme_unlock', 
    category: 'love',
    payload: { themeId: 'pastelSky' } 
  },
  { 
    id: 'love_1_year', 
    title: '1 Jahr Unendlichkeit', 
    description: 'Theme: Eternal freigeschaltet 💍', 
    icon: '💍', 
    type: 'theme_unlock', 
    category: 'love',
    payload: { themeId: 'eternal' } 
  },
];

export const VALENTINE_REWARDS: Reward[] = [
  { id: 'valentine.reward.pizza', title: 'Pizza Date', description: 'Mit dir schmeckt alles besser. 🍕', icon: '🍕', category: 'valentine' },
  { id: 'valentine.reward.photo', title: 'Foto-Date', description: 'Eine Erinnerung für immer. 📸', icon: '📸', category: 'valentine' },
  { id: 'valentine.reward.letter', title: 'Brief: Wir in 5 Jahren', description: 'Ein Blick nach vorn. ✉️', icon: '✉️', category: 'valentine' },
  { id: 'valentine.reward.care', title: 'Care Day', description: 'Heute geht’s nur um uns. 🫶', icon: '🫶', category: 'valentine' },
  { id: 'valentine.reward.art', title: 'Gemeinsam malen', description: 'Unser Chaos, unser Kunstwerk. 🎨', icon: '🎨', category: 'valentine' },
  { id: 'valentine.reward.secret', title: 'Geheime Nachricht', description: 'Nur für dich. 💌', icon: '💌', category: 'valentine' },
];

export const THEMES: Record<string, ThemeDef> = {
  roseGlass: {
    id: 'roseGlass',
    name: 'Default',
    colors: {
      bgGradient: 'linear-gradient(to bottom right, #2e1065, #000)',
      cardBg: 'rgba(255, 255, 255, 0.08)',
      text: '#fff',
      textDim: 'rgba(255, 255, 255, 0.5)'
    }
  },
  softRose: {
    id: 'softRose',
    name: 'Soft Rose',
    unlockRewardId: 'love_1_month',
    colors: {
      bgGradient: 'linear-gradient(to bottom right, #be185d, #4c0519)',
      cardBg: 'rgba(255, 200, 210, 0.1)',
      text: '#fff0f5',
      textDim: 'rgba(255, 240, 245, 0.6)'
    }
  },
  midnightLove: {
    id: 'midnightLove',
    name: 'Midnight Love',
    unlockRewardId: 'love_3_month',
    colors: {
      bgGradient: 'linear-gradient(to bottom, #1e1b4b, #312e81)',
      cardBg: 'rgba(129, 140, 248, 0.1)',
      text: '#e0e7ff',
      textDim: '#a5b4fc'
    }
  },
  pastelSky: {
    id: 'pastelSky',
    name: 'Pastel Sky',
    unlockRewardId: 'love_6_month',
    colors: {
      bgGradient: 'linear-gradient(to top, #7dd3fc 0%, #e0f2fe 100%)',
      cardBg: 'rgba(255, 255, 255, 0.4)',
      text: '#0c4a6e',
      textDim: '#0369a1'
    }
  },
  eternal: {
    id: 'eternal',
    name: 'Eternal Gold',
    unlockRewardId: 'love_1_year',
    colors: {
      bgGradient: 'linear-gradient(to bottom right, #713f12, #451a03)',
      cardBg: 'rgba(253, 224, 71, 0.1)',
      text: '#fefce8',
      textDim: '#fef08a'
    }
  },
  royal: {
    id: 'royal',
    name: 'Royal Gold (Unlock)',
    unlockRewardId: 'daily.points100',
    colors: {
      bgGradient: 'linear-gradient(135deg, #422006, #78350f)',
      cardBg: 'rgba(251, 191, 36, 0.15)',
      text: '#fffbeb',
      textDim: '#fde68a'
    }
  },
  custom: {
    id: 'custom',
    name: 'Eigene Bilder',
    unlockRewardId: 'custom_theme_unlock',
    colors: {
      bgGradient: '#000', 
      cardBg: 'rgba(255, 255, 255, 0.1)',
      text: '#fff',
      textDim: 'rgba(255, 255, 255, 0.6)'
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
