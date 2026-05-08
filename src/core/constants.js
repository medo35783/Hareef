/**
 * core/constants.js
 * ──────────────────
 * كل الثوابت في مكان واحد
 * لا تكرر هذه القيم في أي ملف آخر — استوردها من هنا
 */

/* ══ ألوان الـ Avatar ══ */
export const AV_COLORS = [
  "linear-gradient(135deg,#f0c040,#e69000)",
  "linear-gradient(135deg,#4fa3e0,#1a6db0)",
  "linear-gradient(135deg,#2ecc71,#1a8a45)",
  "linear-gradient(135deg,#9b59b6,#6c3480)",
  "linear-gradient(135deg,#e74c3c,#a82020)",
  "linear-gradient(135deg,#1abc9c,#0f7560)",
  "linear-gradient(135deg,#f39c12,#b5720c)",
  "linear-gradient(135deg,#e91e63,#a0105a)",
  "linear-gradient(135deg,#00bcd4,#007a8a)",
  "linear-gradient(135deg,#ff5722,#b22000)",
];

/* ══ ألعاب القميري ══ */
export const Q_TREES = [
  "العرعر", "سدرة", "برسوبس", "طلحة", "كينة",
  "أثلة", "سمر", "العوسج", "غضاة", "رمثة", "الغاف",
];

export const Q_WEAPONS = [
  { id: "showzel",  name: "شوزل",    icon: "🔫", qty: 3,  power: 30, diff: "صعب"    },
  { id: "omsagma",  name: "أم صتمة", icon: "🎯", qty: 5,  power: 20, diff: "متوسط"  },
  { id: "nabeeta",  name: "نبيطة",   icon: "🪃", qty: 10, power: 10, diff: "سهل"    },
];

export const Q_TOTAL_BIRDS = 100; // إجمالي الطيور في كل شجرة

/* ══ وضع الألقاب (nickMode) ══ */
export const NICK_MODES = {
  1: { label: "لقب واحد",        desc: "كل متسابق يختار لقباً واحداً"    },
  2: { label: "لقبان",           desc: "كل متسابق يختار لقبين"           },
  3: { label: "لقب + اسم مزيف", desc: "لقب + اسم مزيف لمزيد من التشويش" },
};

/* ══ localStorage Keys ══ */
export const LS_KEYS = {
  session:   "ng_session",       // جلسة لعبة الألقاب
  qumairi:   "ng_qumairi",       // جلسة لعبة القميري
  isAdmin:   "pfcc_is_admin",    // Domain Admin
  activeCode:"pfcc_active_code", // الكود المُفعّل
};

/* ══ Firebase Paths ══ */
export const FB_PATHS = {
  // الألقاب
  titlesRoom:   (code) => `rooms/${code}`,
  titlesGame:   (code) => `rooms/${code}/game`,
  titlesPlayers:(code) => `rooms/${code}/players`,
  titlesAttacks:(code) => `rooms/${code}/currentRound/attacks`,
  titlesRounds: (code) => `rooms/${code}/rounds`,

  // القميري
  fameeriRoom:   (code) => `qrooms/${code}`,
  fameeriGame:   (code) => `qrooms/${code}/game`,
  fameeriGroups: (code) => `qrooms/${code}/groups`,
  fameeriMembers:(code) => `qrooms/${code}/members`,
  fameeriAttacks:(code) => `qrooms/${code}/attacks`,

  // الأكواد
  codes:      () => `codes`,
  code:       (c)  => `codes/${c}`,
  codeStats:  (c)  => `codes/${c}/stats`,
};

/* ══ أنواع الأكواد ══ */
export const CODE_TYPES = {
  free_3h: { label: "مجاني 3 ساعات", hours: 3,    price: 0    },
  monthly: { label: "شهري",          hours: 720,  price: 29   },
  yearly:  { label: "سنوي",          hours: 8760, price: 199  },
};
