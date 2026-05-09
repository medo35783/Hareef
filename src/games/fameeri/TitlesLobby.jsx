/**
 * games/titles/TitlesLobby.jsx
 * ─────────────────────────────
 * غرفة الانتظار — يظهر للمشرف والمتسابقين
 * المتسابق يختار لقبه هنا
 * المشرف يرى الكل ويبدأ اللعبة
 */
import { useState } from "react";
import { ref, update, set } from "firebase/database";
import { FB_PATHS, LS_KEYS, AV_COLORS } from "../../core/constants";
import { shuffle } from "../../core/helpers";

/* ── قائمة ألقاب مقترحة ── */
const NICK_POOL = [
  "أبو لهب","الشبح","الثعلب","الصقر","النمر","الأسد","الذئب","الغزال",
  "السهم","البرق","الريح","الجبل","البحر","النجم","القمر","الشمس",
  "الوابل","الصخرة","العاصفة","الفارس","السيف","الدرع","الرمح","القوس",
];

export default function TitlesLobby({
  db, roomCode, role, myId, myNickLocal, setMyNickLocal,
  gameState, players, notify, goTo,
}) {
  const [selectedNick, setSelectedNick] = useState(myNickLocal || "");
  const [selectedNick2, setSelectedNick2] = useState("");
  const [saved, setSaved] = useState(!!myNickLocal);
  const [starting, setStarting] = useState(false);

  const nickMode    = gameState?.nickMode || 1;
  const usedNicks   = Object.values(players).map((p) => p.nick).filter(Boolean);
  const playerList  = Object.entries(players).filter(([, p]) => p.role !== "admin");
  const readyCount  = playerList.filter(([, p]) => p.nick).length;
  const totalCount  = playerList.length;

  /* ── حفظ اللقب ── */
  const handleSaveNick = async () => {
    if (!selectedNick.trim()) { notify("اختر لقباً", "error"); return; }
    if (usedNicks.includes(selectedNick) && selectedNick !== myNickLocal) {
      notify("هذا اللقب محجوز!", "error"); return;
    }
    try {
      await update(ref(db, `${FB_PATHS.titlesPlayers(roomCode)}/${myId}`), {
        nick:  selectedNick.trim(),
        nick2: nickMode >= 2 ? selectedNick2.trim() : "",
      });
      setMyNickLocal(selectedNick.trim());
      localStorage.setItem(LS_KEYS.session, JSON.stringify(
        JSON.parse(localStorage.getItem(LS_KEYS.session) || "{}")
        ? { ...JSON.parse(localStorage.getItem(LS_KEYS.session)), myNickLocal: selectedNick.trim() }
        : {}
      ));
      setSaved(true);
      notify("✅ تم حفظ لقبك!", "success");
    } catch {
      notify("❌ خطأ في الحفظ", "error");
    }
  };

  /* ── بدء اللعبة (المشرف) ── */
  const handleStart = async () => {
    if (totalCount < 2)   { notify("يلزم لاعبان على الأقل", "error"); return; }
    if (readyCount < totalCount) { notify("انتظر حتى يختار الكل ألقابهم", "error"); return; }
    setStarting(true);
    try {
      await update(ref(db, FB_PATHS.titlesGame(roomCode)), {
        phase:    "playing",
        roundNum: 1,
        deadline: Date.now() + (gameState.roundDuration || 3 * 60 * 1000),
      });
      goTo("playing");
    } catch {
      notify("❌ خطأ في بدء اللعبة", "error");
    } finally {
      setStarting(false);
    }
  };

  /* ── اقتراح لقب عشوائي ── */
  const suggestNick = () => {
    const available = NICK_POOL.filter((n) => !usedNicks.includes(n));
    if (available.length) setSelectedNick(shuffle(available)[0]);
  };

  return (
    <div className="scr">
      <div className="ptitle">🏟️ غرفة الانتظار</div>

      {/* رقم الغرفة */}
      <div className="room-code-big">{roomCode}</div>
      <div className="psub">شارك هذا الرقم مع المتسابقين</div>

      {/* عداد الجاهزين */}
      <div className="counter-bar">
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          {readyCount}/{totalCount} جاهز
        </span>
        <div className="counter-track" style={{ flex: 1 }}>
          <div
            className="counter-fill"
            style={{ width: totalCount ? `${(readyCount / totalCount) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* اختيار اللقب — للمتسابقين فقط */}
      {role === "player" && (
        <div className="card">
          <div className="ctitle">🎭 اختر لقبك السري</div>

          {!saved ? (
            <>
              <div className="ig">
                <label className="lbl">لقبك:</label>
                <input
                  className="inp"
                  value={selectedNick}
                  onChange={(e) => setSelectedNick(e.target.value)}
                  placeholder="اكتب لقباً..."
                  maxLength={15}
                />
              </div>

              {nickMode >= 2 && (
                <div className="ig">
                  <label className="lbl">لقبك الثاني:</label>
                  <input
                    className="inp"
                    value={selectedNick2}
                    onChange={(e) => setSelectedNick2(e.target.value)}
                    placeholder="لقب ثانٍ..."
                    maxLength={15}
                  />
                </div>
              )}

              {/* ألقاب مقترحة */}
              <div className="blbl">أو اختر من القائمة:</div>
              <div className="bgrid" style={{ marginBottom: 12 }}>
                {NICK_POOL.filter((n) => !usedNicks.includes(n)).slice(0, 6).map((n) => (
                  <div
                    key={n}
                    className={`nt ${selectedNick === n ? "nsel" : ""}`}
                    onClick={() => setSelectedNick(n)}
                  >
                    {n}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn bgh bsm" onClick={suggestNick}>🎲 عشوائي</button>
                <button className="btn bg" style={{ flex: 1 }} onClick={handleSaveNick} disabled={!selectedNick.trim()}>
                  ✅ حفظ اللقب
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>✅</div>
              <div style={{ fontFamily: "'Cairo',sans-serif", fontSize: 18, fontWeight: 900, color: "var(--gold)" }}>
                {myNickLocal}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>لقبك السري — احتفظ به!</div>
              <button className="btn bgh bsm" style={{ marginTop: 10 }} onClick={() => setSaved(false)}>
                ✏️ تعديل
              </button>
            </div>
          )}
        </div>
      )}

      {/* قائمة اللاعبين */}
      <div className="card">
        <div className="ctitle">👥 اللاعبون ({totalCount})</div>
        {Object.entries(players).map(([id, p]) => (
          <div key={id} className="pi">
            <div
              className="pi-av"
              style={{ background: AV_COLORS[p.colorIdx % AV_COLORS.length] }}
            >
              {p.initials}
            </div>
            <div className="pi-info">
              <div className="pi-name">{p.name}</div>
              <div className="pi-sub">{p.role === "admin" ? "👑 المشرف" : p.nick ? "✅ جاهز" : "⏳ يختار لقبه..."}</div>
            </div>
          </div>
        ))}
        {totalCount === 0 && (
          <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, padding: 12 }}>
            في انتظار المتسابقين...
          </div>
        )}
      </div>

      {/* زر البدء — للمشرف فقط */}
      {role === "admin" && (
        <button
          className="btn bg"
          onClick={handleStart}
          disabled={starting || totalCount < 2 || readyCount < totalCount}
        >
          {starting ? "⏳ جاري البدء..." : `🚀 بدء اللعبة (${readyCount}/${totalCount} جاهز)`}
        </button>
      )}

      {/* انتظار المشرف — للمتسابق */}
      {role === "player" && (
        <div className="waiting-box">
          <div className="waiting-icon">⏳</div>
          <div className="waiting-title">في انتظار المشرف</div>
          <div className="waiting-sub">سيبدأ المشرف اللعبة بعد أن يختار الكل ألقابهم</div>
        </div>
      )}
    </div>
  );
}
