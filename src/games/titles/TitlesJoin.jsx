/**
 * games/titles/TitlesJoin.jsx
 * ────────────────────────────
 * المتسابق يدخل رقم الغرفة واسمه وينضم
 */
import { useState } from "react";
import { ref, get, push, set } from "firebase/database";
import { buildPlayerData, isValidRoomCode } from "../../core/helpers";
import { FB_PATHS, LS_KEYS } from "../../core/constants";

export default function TitlesJoin({
  db, setRoomCode, setRole, setMyId, setMyNickLocal, goTo, notify,
}) {
  const [code,    setCode   ] = useState("");
  const [name,    setName   ] = useState("");
  const [loading, setLoading] = useState(false);
  const [step,    setStep   ] = useState(1); // 1=كود | 2=اسم

  /* ── التحقق من رقم الغرفة ── */
  const handleCheckRoom = async () => {
    if (!isValidRoomCode(code)) { notify("رقم الغرفة 6 أرقام", "error"); return; }
    setLoading(true);
    try {
      const snap = await get(ref(db, FB_PATHS.titlesGame(code)));
      if (!snap.exists())                        { notify("الغرفة غير موجودة", "error"); return; }
      if (snap.val().phase === "ended")           { notify("اللعبة انتهت", "error");    return; }
      setStep(2);
    } catch {
      notify("❌ خطأ في الاتصال", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── الانضمام الفعلي ── */
  const handleJoin = async () => {
    if (!name.trim()) { notify("أدخل اسمك", "error"); return; }
    setLoading(true);
    try {
      const pRef   = push(ref(db, FB_PATHS.titlesPlayers(code)));
      const player = buildPlayerData({ name, nick: "" });
      await set(pRef, { ...player, role: "player" });

      localStorage.setItem(LS_KEYS.session, JSON.stringify({
        roomCode: code, role: "player", myId: pRef.key, myNickLocal: "",
      }));

      setRoomCode(code);
      setRole("player");
      setMyId(pRef.key);
      setMyNickLocal("");
      goTo("lobby");
      notify("✅ انضممت للغرفة!", "success");
    } catch {
      notify("❌ خطأ في الانضمام", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scr">
      <div className="ptitle">🚪 الانضمام</div>
      <div className="psub">أدخل رقم الغرفة للانضمام</div>

      <div className="card">
        {step === 1 ? (
          <>
            <div className="ctitle">🔢 رقم الغرفة</div>
            <div className="ig">
              <input
                className="inp big"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
              />
            </div>
            <button className="btn bg" onClick={handleCheckRoom} disabled={loading || code.length < 6}>
              {loading ? "⏳ جاري التحقق..." : "✅ تحقق من الغرفة"}
            </button>
          </>
        ) : (
          <>
            <div className="ctitle">👤 اسمك في اللعبة</div>
            <div className="ann ag" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                غرفة: <strong style={{ color: "var(--gold)" }}>{code}</strong>
              </div>
            </div>
            <div className="ig">
              <label className="lbl">اسمك الحقيقي (يظهر للجميع):</label>
              <input
                className="inp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: محمد"
                maxLength={20}
                autoFocus
              />
            </div>
            <button className="btn bg" onClick={handleJoin} disabled={loading || !name.trim()}>
              {loading ? "⏳ جاري الانضمام..." : "🎮 انضم الآن"}
            </button>
            <button className="btn bgh" onClick={() => setStep(1)} style={{ marginTop: 8 }}>
              ← تغيير رقم الغرفة
            </button>
          </>
        )}
      </div>

      <button className="btn bgh" onClick={() => goTo("home")} style={{ marginTop: 4 }}>
        ← رجوع للرئيسية
      </button>
    </div>
  );
}
