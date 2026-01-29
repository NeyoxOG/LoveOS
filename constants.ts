
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
      bgGradient: 'linear-gradient(135deg, #1f1147 0%, #090112 55%, #050007 100%)',
      cardBg: 'rgba(255, 255, 255, 0.09)',
      text: '#f8fafc',
      textDim: 'rgba(248, 250, 252, 0.55)'
    }
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    unlockRewardId: 'reward.welcomeTheme',
    colors: {
      bgGradient: 'radial-gradient(circle at top right, rgba(56, 189, 248, 0.35), transparent 55%), linear-gradient(135deg, #0f172a 0%, #1f2937 45%, #0b1020 100%)',
      cardBg: 'rgba(148, 163, 184, 0.12)',
      text: '#e2e8f0',
      textDim: 'rgba(226, 232, 240, 0.65)'
    }
  },
  softRose: {
    id: 'softRose',
    name: 'Soft Rose',
    unlockRewardId: 'love_1_month',
    colors: {
      bgGradient: 'linear-gradient(135deg, #fb7185 0%, #be123c 55%, #4c0519 100%)',
      cardBg: 'rgba(255, 228, 230, 0.16)',
      text: '#fff1f2',
      textDim: 'rgba(255, 228, 230, 0.7)'
    }
  },
  midnightLove: {
    id: 'midnightLove',
    name: 'Midnight Love',
    unlockRewardId: 'love_3_month',
    colors: {
      bgGradient: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%)',
      cardBg: 'rgba(129, 140, 248, 0.14)',
      text: '#eef2ff',
      textDim: 'rgba(199, 210, 254, 0.75)'
    }
  },
  pastelSky: {
    id: 'pastelSky',
    name: 'Pastel Sky',
    unlockRewardId: 'love_6_month',
    colors: {
      bgGradient: 'linear-gradient(160deg, #bae6fd 0%, #fef9c3 55%, #fbcfe8 100%)',
      cardBg: 'rgba(255, 255, 255, 0.45)',
      text: '#0f172a',
      textDim: 'rgba(30, 41, 59, 0.65)'
    }
  },
  eternal: {
    id: 'eternal',
    name: 'Eternal Gold',
    unlockRewardId: 'love_1_year',
    colors: {
      bgGradient: 'linear-gradient(135deg, #92400e 0%, #713f12 45%, #3f1a06 100%)',
      cardBg: 'rgba(253, 224, 71, 0.16)',
      text: '#fffbeb',
      textDim: 'rgba(254, 240, 138, 0.8)'
    }
  },
  royal: {
    id: 'royal',
    name: 'Royal Gold (Unlock)',
    unlockRewardId: 'daily.points100',
    colors: {
      bgGradient: 'linear-gradient(135deg, #3b0764 0%, #7c2d12 50%, #451a03 100%)',
      cardBg: 'rgba(251, 191, 36, 0.18)',
      text: '#fef3c7',
      textDim: 'rgba(253, 230, 138, 0.85)'
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
