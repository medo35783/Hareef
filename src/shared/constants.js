/* ══════════════════════════════════════════════════
   CONSTANTS & CONFIGURATION
   - Colors, sounds, game data
   - Don't modify during runtime
══════════════════════════════════════════════════ */

// ── COLORS ──
export const COLORS = {
  gold: '#f0c040',
  red: '#e63950',
  green: '#2ecc71',
  blue: '#4fa3e0',
  purple: '#9b59b6',
  card: '#0f0f22',
  card2: '#151530',
  border: 'rgba(240,192,64,.18)',
  text: '#e8e0ff',
  muted: '#7a74a0',
  dim: '#2a2850'
};

// ── AVATAR COLORS ──
export const AV_COLORS = [
  'linear-gradient(135deg,#e63950,#a0102a)',
  'linear-gradient(135deg,#4fa3e0,#1e6fb0)',
  'linear-gradient(135deg,#2ecc71,#1a8a50)',
  'linear-gradient(135deg,#f0c040,#d4920a)',
  'linear-gradient(135deg,#9b59b6,#6c3480)',
  'linear-gradient(135deg,#ff6b6b,#c92a2a)',
];

// ── QUMAIRI GAME CONSTANTS ──
export const Q_TREES = ['نخيل', 'سدر', 'غاف'];
export const Q_WEAPONS = [
  { id: 'omsagma', name: 'أم سقما', power: 1 },
  { id: 'nabeeta', name: 'نبيتة', power: 2 },
  { id: 'showzel', name: 'شوزل', power: 3 },
];

// ── PACKAGES ──
export const PACKAGES = [
  { duration: 1, price: 15, label: 'يوم واحد', hours: 24, discount: 0 },
  { duration: 3, price: 35, label: '3 أيام', hours: 72, discount: 22 },
  { duration: 7, price: 50, label: 'أسبوع', hours: 168, discount: 52 }
];

// ── NOTIFICATION TYPES ──
export const NOTIFICATION_TYPES = {
  success: { class: 'ns', icon: '✅' },
  error: { class: 'ne', icon: '❌' },
  info: { class: 'ni', icon: 'ℹ️' },
  gold: { class: 'ng', icon: '⭐' }
};

// ── GAME PHASES ──
export const GAME_PHASES = {
  LOBBY: 'lobby',
  WAITING: 'waiting',
  ACTIVE: 'active',
  REVEALING: 'revealing',
  ENDED: 'ended'
};

// ── PLAYER STATUS ──
export const PLAYER_STATUS = {
  ACTIVE: 'active',
  REVEALED: 'revealed',
  HUNTED: 'hunted',
  CHEATER: 'cheater'
};

// ── NEWS ──
export const NEWS = [
  {
    id: 1,
    date: '2025-05-07',
    title: '🎉 إطلاق النسخة الجديدة',
    body: 'نسخة محسّنة مع أداء أفضل وميزات جديدة',
    isNew: true
  },
  {
    id: 2,
    date: '2025-05-05',
    title: '🐛 إصلاح الأخطاء',
    body: 'تم إصلاح بعض الأخطاء البسيطة',
    isNew: false
  }
];
