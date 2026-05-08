/**
 * App.jsx — الموجّه الرئيسي فقط
 * ─────────────────────────────
 * مسؤوليته الوحيدة: يعرف أين يوجّه المستخدم
 * لا منطق لعبة هنا — لا Firebase listeners هنا — لا state معقد هنا
 *
 * قاعدة ذهبية:
 *  - لعبة الألقاب  → إخفاء هوية + تخمين زملاء   → TitlesGame
 *  - لعبة القميري  → Dashboard مشرف + تنافس جماعي → FameeriGame
 */

import { useState, useEffect } from "react";
import { db }        from "./core/firebase";
import { CSS }       from "./styles/globalStyles";

// ── Shared ──
import Stars         from "./shared/Stars";
import Notif         from "./shared/Notif";
import Navigation    from "./shared/Navigation";
import Header        from "./shared/Header";
import CodeActivation from "./shared/CodeActivation";
import { getActiveCode, isCodeValid } from "./shared/SubscriptionTimer";

// ── Pages ──
import Home          from "./pages/Home";
import News          from "./pages/News";
import Packages      from "./pages/Packages";
import Suggestions   from "./pages/Suggestions";

// ── Games ──
import TitlesGame    from "./games/titles/TitlesGame";
import FameeriGame   from "./games/fameeri/FameeriGame";

// ── Supervisor ──
import CodesPanel    from "./supervisor/CodesPanel";

/* ══════════════════════════════════════════════
   INJECT GLOBAL STYLES
══════════════════════════════════════════════ */
const styleEl = document.createElement("style");
styleEl.textContent = CSS;
document.head.appendChild(styleEl);

/* ══════════════════════════════════════════════
   APP
══════════════════════════════════════════════ */
export default function App() {

  // ── التنقل الرئيسي ──
  const [tab, setTab]               = useState("game");       // game | news | plans | suggest | admin
  const [selectedGame, setSelectedGame] = useState(null);     // null | 'titles' | 'fameeri'

  // ── الجلسة ──
  const [isDomainAdmin, setIsDomainAdmin] = useState(false);  // pfcc_is_admin
  const [activeCode, setActiveCode]       = useState(null);   // كود الاشتراك الصالح
  const [showCodeActivation, setShowCodeActivation] = useState(false);

  // ── الإشعارات ──
  const [notif, setNotif] = useState(null);
  const notify = (text, type = "info") => {
    setNotif({ text, type, id: Date.now() });
    setTimeout(() => setNotif(null), 3000);
  };

  // ── Splash ──
  const [loading, setLoading] = useState(true);

  /* ══ INIT ══ */
  useEffect(() => {
    // هل Domain Admin؟
    const isAdmin = localStorage.getItem("pfcc_is_admin") === "true";
    setIsDomainAdmin(isAdmin);

    // Splash screen
    setTimeout(() => setLoading(false), 1200);

    // التحقق من الكود إذا لم يكن Admin
    if (!isAdmin) {
      checkActiveCode();
    }
  }, []);

  const checkActiveCode = async () => {
    try {
      const code = await getActiveCode(db);
      if (code && isCodeValid(code)) {
        setActiveCode(code);
      } else {
        setActiveCode(null);
        // لا تُظهر شاشة التفعيل مباشرة — فقط عند محاولة إنشاء غرفة
      }
    } catch (e) {
      setActiveCode(null);
    }
  };

  /* ══ HANDLERS ══ */
  const handleSelectGame = (game) => {
    setSelectedGame(game);
    setTab("game");
  };

  const handleExitGame = () => {
    setSelectedGame(null);
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab !== "game") setSelectedGame(null);
  };

  /* ══ LOADING SPLASH ══ */
  if (loading) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "#07071a",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
        fontFamily: "'Cairo', sans-serif"
      }}>
        <div style={{ fontSize: 64 }}>🎮</div>
        <div style={{
          fontSize: 26, fontWeight: 900,
          background: "linear-gradient(135deg,#f0c040,#ff8c00)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
        }}>
          PFCC Playground
        </div>
        <div style={{ color: "#7a74a0", fontSize: 13 }}>ساحة الألعاب</div>
      </div>
    );
  }

  /* ══ RENDER ══ */
  return (
    <div className="app">
      <Stars />
      <Notif msg={notif} />

      {/* ── كود التفعيل (يظهر فوق كل شيء) ── */}
      {showCodeActivation && !isDomainAdmin && (
        <CodeActivation
          db={db}
          onSuccess={(code) => {
            setActiveCode(code);
            setShowCodeActivation(false);
            notify("✅ تم تفعيل الكود بنجاح!", "success");
          }}
          onClose={() => setShowCodeActivation(false)}
        />
      )}

      {/* ── الهيدر (لا يظهر داخل الألعاب) ── */}
      {!selectedGame && (
        <Header
          isDomainAdmin={isDomainAdmin}
          activeCode={activeCode}
        />
      )}

      {/* ══ المحتوى الرئيسي ══ */}
      <main className="main">

        {/* ── لعبة الألقاب ── */}
        {selectedGame === "titles" && (
          <TitlesGame
            db={db}
            isDomainAdmin={isDomainAdmin}
            activeCode={activeCode}
            onNeedCode={() => setShowCodeActivation(true)}
            onExit={handleExitGame}
            notify={notify}
          />
        )}

        {/* ── لعبة القميري ── */}
        {selectedGame === "fameeri" && (
          <FameeriGame
            db={db}
            isDomainAdmin={isDomainAdmin}
            activeCode={activeCode}
            onNeedCode={() => setShowCodeActivation(true)}
            onExit={handleExitGame}
            notify={notify}
          />
        )}

        {/* ── الصفحات (بدون لعبة مختارة) ── */}
        {!selectedGame && (
          <>
            {tab === "game"    && <Home    onSelectGame={handleSelectGame} isDomainAdmin={isDomainAdmin} />}
            {tab === "news"    && <News    />}
            {tab === "plans"   && <Packages onNeedCode={() => setShowCodeActivation(true)} />}
            {tab === "suggest" && <Suggestions notify={notify} />}
            {tab === "admin"   && isDomainAdmin && <CodesPanel db={db} notify={notify} />}
          </>
        )}

      </main>

      {/* ── شريط التنقل السفلي ── */}
      <Navigation
        tab={tab}
        onTabChange={handleTabChange}
        isDomainAdmin={isDomainAdmin}
        hasNews={true}
        isInGame={!!selectedGame}
        onExitGame={handleExitGame}
      />

    </div>
  );
}
