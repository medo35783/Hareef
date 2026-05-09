/**
 * App.jsx — الموجّه الرئيسي فقط
 * مسؤوليته: يعرف أين يوجّه المستخدم
 */
import { useState, useEffect } from "react";
import { db }        from "./core/firebase";
import { CSS }       from "./styles/globalStyles";

// Shared
import Stars         from "./shared/Stars";
import Notif         from "./shared/Notif";
import Navigation    from "./shared/Navigation";
import Header        from "./shared/Header";
import CodeActivation from "./shared/CodeActivation";
import { getActiveCode, isCodeValid } from "./shared/SubscriptionTimer";

// Pages
import Home          from "./pages/Home";
import News          from "./pages/News";
import Packages      from "./pages/Packages";
import Suggestions   from "./pages/Suggestions";

// Games
import TitlesGame    from "./games/titles/TitlesGame";
import FameeriGame   from "./games/fameeri/FameeriGame";

// Supervisor
import CodesPanel    from "./supervisor/CodesPanel";

/* ── Inject CSS ── */
const styleEl = document.createElement("style");
styleEl.textContent = CSS;
document.head.appendChild(styleEl);

export default function App() {
  const [tab,          setTab         ] = useState("game");
  const [selectedGame, setSelectedGame] = useState(null);
  const [isDomainAdmin,setIsDomainAdmin] = useState(false);
  const [activeCode,   setActiveCode  ] = useState(null);
  const [showCodeActivation, setShowCodeActivation] = useState(false);
  const [notif,        setNotif       ] = useState(null);
  const [loading,      setLoading     ] = useState(true);

  const notify = (text, type = "info") => {
    setNotif({ text, type, id: Date.now() });
    setTimeout(() => setNotif(null), 3000);
  };

  useEffect(() => {
    const isAdmin = localStorage.getItem("pfcc_is_admin") === "true";
    setIsDomainAdmin(isAdmin);
    setTimeout(() => setLoading(false), 1200);
    if (!isAdmin) checkActiveCode();
  }, []);

  const checkActiveCode = async () => {
    try {
      const code = await getActiveCode(db);
      if (code && isCodeValid(code)) setActiveCode(code);
      else setActiveCode(null);
    } catch { setActiveCode(null); }
  };

  const handleSelectGame  = (game) => { setSelectedGame(game); setTab("game"); };
  const handleExitGame    = ()     => setSelectedGame(null);
  const handleTabChange   = (t)    => { setTab(t); if (t !== "game") setSelectedGame(null); };

  /* ── Splash ── */
  if (loading) return (
    <div style={{
      position: "fixed", inset: 0, background: "#07071a",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      fontFamily: "'Cairo', sans-serif",
    }}>
      <div style={{ fontSize: 64 }}>🎮</div>
      <div style={{
        fontSize: 26, fontWeight: 900,
        background: "linear-gradient(135deg,#f0c040,#ff8c00)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>PFCC Playground</div>
      <div style={{ color: "#7a74a0", fontSize: 13 }}>ساحة الألعاب</div>
    </div>
  );

  return (
    <div className="app">
      <Stars />
      <Notif msg={notif} />

      {showCodeActivation && !isDomainAdmin && (
        <CodeActivation
          db={db}
          onSuccess={(code) => {
            setActiveCode(code);
            setShowCodeActivation(false);
            notify("✅ تم تفعيل الكود!", "success");
          }}
          onClose={() => setShowCodeActivation(false)}
        />
      )}

      {!selectedGame && (
        <Header isDomainAdmin={isDomainAdmin} activeCode={activeCode} />
      )}

      <main className="main">
        {selectedGame === "titles" && (
          <TitlesGame
            db={db} isDomainAdmin={isDomainAdmin} activeCode={activeCode}
            onNeedCode={() => setShowCodeActivation(true)}
            onExit={handleExitGame} notify={notify}
          />
        )}

        {selectedGame === "fameeri" && (
          <FameeriGame
            db={db} isDomainAdmin={isDomainAdmin} activeCode={activeCode}
            onNeedCode={() => setShowCodeActivation(true)}
            onExit={handleExitGame} notify={notify}
          />
        )}

        {!selectedGame && (
          <>
            {tab === "game"    && <Home onSelectGame={handleSelectGame} isDomainAdmin={isDomainAdmin} />}
            {tab === "news"    && <News />}
            {tab === "plans"   && <Packages onNeedCode={() => setShowCodeActivation(true)} />}
            {tab === "suggest" && <Suggestions notify={notify} />}
            {tab === "admin"   && isDomainAdmin && <CodesPanel db={db} notify={notify} />}
          </>
        )}
      </main>

      <Navigation
        tab={tab} onTabChange={handleTabChange}
        isDomainAdmin={isDomainAdmin} hasNews={true}
        isInGame={!!selectedGame} onExitGame={handleExitGame}
      />
    </div>
  );
}
