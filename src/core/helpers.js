/**
 * core/helpers.js
 * ────────────────
 * دوال مساعدة عامة — لا تعتمد على React أو Firebase
 * استوردها من أي مكان تحتاجها
 */

import { AV_COLORS } from "./constants";

/* ══ توليد رمز الغرفة (6 أرقام) ══ */
export const genCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* ══ تنسيق الوقت من milliseconds ══ */
export const fmtMs = (ms) => {
  if (!ms || ms <= 0) return "00:00";
  const s   = Math.floor(ms / 1000);
  const d   = Math.floor(s / 86400);
  const h   = Math.floor((s % 86400) / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} يوم ${h}س ${m}د`;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

/* ══ خلط مصفوفة عشوائياً ══ */
export const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

/* ══ استخراج الحروف الأولى من الاسم ══ */
export const mkInitials = (name) =>
  name
    .trim()
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/* ══ بناء بيانات اللاعب من المدخلات ══ */
export const buildPlayerData = ({ name, nick, nick2 = "", colorIdx }) => ({
  name:     name.trim(),
  nick:     nick.trim(),
  nick2:    nick2.trim(),
  initials: mkInitials(name),
  colorIdx: colorIdx ?? Math.floor(Math.random() * AV_COLORS.length),
  status:   "active",
  joinedAt: Date.now(),
});

/* ══ التحقق من صحة رمز الغرفة ══ */
export const isValidRoomCode = (code) =>
  /^\d{6}$/.test(code?.toString().trim());

/* ══ تنسيق التاريخ ══ */
export const fmtDate = (ts) => {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("ar-SA", {
    year: "numeric", month: "short", day: "numeric",
  });
};

/* ══ تأخير (promise-based) ══ */
export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/* ══ توليد ID فريد ══ */
export const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
