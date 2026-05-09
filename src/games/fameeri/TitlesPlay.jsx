/**
 * games/titles/TitlesPlay.jsx
 * ────────────────────────────
 * قلب اللعبة — التخمين والهجوم
 * المشرف: يدير الجولات، يرى النتائج، ينقل للتالية
 * المتسابق: يهاجم ألقاب الآخرين
 */
import { useState, useEffect } from "react";
import { ref, push, set, update, get } from "firebase/database";
import { FB_PATHS, AV_COLORS } from "../../core/constants";
import { fmtMs } from "../../core/helpers";

export default function TitlesPlay({
  db, roomCode, role, myId, myNickLocal,
  gameState, players, attacks, allRoundsData,
  notify, goTo,
}) {
  const [timeLeft,  setTimeLeft ] = useState(0);
  const [ending,    setEnding   ] = useState(false);

  const roundNum    = gameState?.roundNum || 1;
  const deadline    = gameState?.deadline || 0;
  const attacksPR   = gameState?.attacksPerRound || 2;
  const silentOn    = gameState?.silentActive;
  const poisonNick  = gameState?.poisonNick;

  const activePlayers = Object.entries(players).filter(([, p]) => p.status === "active" && p.role !== "admin");
  const myAttacks     = Object.values(attacks).filter((a) => a.attackerId === myId);
  const myAttackCount = myAttacks.length;
  const canAttack     = role === "player" && myAttackCount < attacksPR && !silentOn;

  /* ══ عداد الوقت ══ */
  useEffect(() => {
    if (!deadline) return;
    const iv = setInterval(() => {
      const left = deadline - Date.now();
      setTimeLeft(Math.max(0, left));
      if (left <= 0 && role === "admin") handleRoundEnd();
    }, 1000);
    return () => clearInterval(iv);
  }, [deadline]);

  /* ══ هجوم ══ */
  const handleAttack = async (targetId, targetNick) => {
    if (!canAttack) return;
    if (targetId === myId) { notify("لا تهاجم نفسك!", "error"); return; }

    // هل خمّن هذا اللقب مسبقاً؟
    const alreadyAttacked = myAttacks.some((a) => a.targetNick === targetNick);
    if (alreadyAttacked) { notify("هاجمت هذا اللقب من قبل", "error"); return; }

    // إيجاد اسم المهاجم
    const me = players[myId];
    if (!me?.nick) { notify("اختر لقبك أولاً", "error"); return; }

    // التحقق هل اللقب يعود لصاحبه (correct)
    const target = players[targetId];
    const correct = target && target.name !== undefined &&
      Object.entries(players).find(([id]) => id === targetId)?.[1]?.nick === targetNick;

    try {
      const attackRef = push(ref(db, FB_PATHS.titlesAttacks(roomCode)));
      await set(attackRef, {
        attackerId:   myId,
        attackerNick: me.nick,
        attackerName: me.name,
        targetId,
        targetNick,
        correct:      !!correct,
        ts:           Date.now(),
        round:        roundNum,
      });

      notify(correct ? "🎯 إصابة!" : "💨 خطأ", correct ? "success" : "error");

      // إذا أصاب — يمكن إقصاء اللاعب
      if (correct) {
        await update(ref(db, `${FB_PATHS.titlesPlayers(roomCode)}/${targetId}`), {
          status: "eliminated",
          eliminatedBy: me.name,
          eliminatedAt: Date.now(),
        });
      }
    } catch {
      notify("❌ خطأ في الهجوم", "error");
    }
  };

  /* ══ انتهاء الجولة / نقل لنتائج ══ */
  const handleRoundEnd = async () => {
    if (ending) return;
    setEnding(true);
    try {
      const alive = Object.values(players).filter((p) => p.status === "active" && p.role !== "admin");
      if (alive.length <= 1) {
        // انتهت اللعبة
        await update(ref(db, FB_PATHS.titlesGame(roomCode)), { phase: "ended" });
        return;
      }
      // جولة جديدة
      const nextRound = roundNum + 1;
      await update(ref(db, FB_PATHS.titlesGame(roomCode)), {
        roundNum: nextRound,
        deadline: Date.now() + (gameState.roundDuration || 3 * 60 * 1000),
      });
    } finally {
      setEnding(false);
    }
  };

  /* ══ لوحة تحكم المشرف ══ */
  if (role === "admin") {
    return <AdminPanel
      gameState={gameState} players={players} attacks={attacks}
      roundNum={roundNum} timeLeft={timeLeft}
      onEndRound={handleRoundEnd} ending={ending}
      db={db} roomCode={roomCode} notify={notify} goTo={goTo}
    />;
  }

  /* ══ شاشة المتسابق ══ */
  return (
    <div className="scr">
      {/* هيدر الجولة */}
      <div className="card" style={{ background: "linear-gradient(135deg,rgba(240,192,64,.1),rgba(255,140,0,.05))", border: "1.5px solid var(--gold)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 900, fontSize: 15, color: "var(--gold)" }}>
              🎯 جولة {roundNum}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              لقبك: <strong style={{ color: "var(--gold)" }}>{myNickLocal}</strong>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Cairo',sans-serif", fontSize: 26, fontWeight: 900, color: timeLeft < 30000 ? "var(--red)" : "var(--text)" }}>
              {fmtMs(timeLeft)}
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>الوقت</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Cairo',sans-serif", fontSize: 22, fontWeight: 900, color: "var(--green)" }}>
              {myAttackCount}/{attacksPR}
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>هجماتك</div>
          </div>
        </div>
      </div>

      {/* حالة خاصة */}
      {silentOn && (
        <div className="silent-badge">
          🤫 <span>جولة صامتة — لا هجمات هذه الجولة</span>
        </div>
      )}
      {poisonNick && myNickLocal === poisonNick && (
        <div className="poison-badge">
          ☠️ <span>لقبك مسموم! كل من يهاجمك يخسر نقطة</span>
        </div>
      )}

      {/* قائمة الألقاب للهجوم */}
      <div className="card">
        <div className="ctitle">🎯 اهجم لقباً — خمّن صاحبه</div>
        <div className="ngrid">
          {activePlayers
            .filter(([id]) => id !== myId)
            .map(([id, p]) => {
              const attacked = myAttacks.some((a) => a.targetNick === p.nick);
              return (
                <div
                  key={id}
                  className={`nr ${attacked ? "nrd" : ""} ${poisonNick === p.nick ? "poisoned" : ""}`}
                  onClick={() => !attacked && handleAttack(id, p.nick)}
                >
                  <div className="nr-av" style={{ background: AV_COLORS[p.colorIdx % AV_COLORS.length] }}>
                    {p.initials}
                  </div>
                  <div className="nr-info">
                    <div className="nr-name">{p.nick}</div>
                    {p.nick2 && <div className="nr-sub">أيضاً: {p.nick2}</div>}
                    {attacked && <div className="nr-sub" style={{ color: "var(--muted)" }}>✓ هاجمته</div>}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* آخر الهجمات */}
      {Object.values(attacks).length > 0 && (
        <div className="card">
          <div className="ctitle">📜 آخر الهجمات</div>
          <div className="sc">
            {Object.values(attacks)
              .sort((a, b) => b.ts - a.ts)
              .slice(0, 10)
              .map((a, i) => (
                <div key={i} className={`feed-item ${a.correct ? "fc-success" : "fc-fail"}`}>
                  <strong>{a.attackerNick}</strong> هاجم <strong>{a.targetNick}</strong>
                  {" — "}{a.correct ? "🎯 إصابة!" : "💨 خطأ"}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════
   لوحة تحكم المشرف
══════════════════════════════ */
function AdminPanel({ gameState, players, attacks, roundNum, timeLeft, onEndRound, ending, db, roomCode, notify, goTo }) {
  const [endingGame, setEndingGame] = useState(false);

  const alive = Object.values(players).filter((p) => p.status === "active" && p.role !== "admin").length;
  const eliminated = Object.values(players).filter((p) => p.status === "eliminated").length;

  const handleEndGame = async () => {
    setEndingGame(true);
    try {
      await update(ref(db, FB_PATHS.titlesGame(roomCode)), { phase: "ended" });
    } finally {
      setEndingGame(false);
    }
  };

  return (
    <div className="scr">
      <div className="ptitle">👑 لوحة المشرف</div>
      <div className="psub">جولة {roundNum} — أنت تتحكم بالإيقاع</div>

      {/* الوقت */}
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Cairo',sans-serif", fontSize: 52, fontWeight: 900, color: timeLeft < 30000 ? "var(--red)" : "var(--gold)" }}>
          {fmtMs(timeLeft)}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>الوقت المتبقي</div>
      </div>

      {/* إحصائيات */}
      <div className="sg sg3" style={{ marginBottom: 10 }}>
        <div className="sbox">
          <div className="snum" style={{ color: "var(--green)" }}>{alive}</div>
          <div className="slbl">نشط</div>
        </div>
        <div className="sbox">
          <div className="snum" style={{ color: "var(--red)" }}>{eliminated}</div>
          <div className="slbl">مُقصى</div>
        </div>
        <div className="sbox">
          <div className="snum">{Object.values(attacks).length}</div>
          <div className="slbl">هجمة</div>
        </div>
      </div>

      {/* آخر الهجمات */}
      <div className="card">
        <div className="ctitle">⚡ آخر الأحداث</div>
        <div className="sc">
          {Object.values(attacks)
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 12)
            .map((a, i) => (
              <div key={i} className={`feed-item ${a.correct ? "fc-success" : "fc-fail"}`}>
                <strong>{a.attackerNick}</strong> ← <strong>{a.targetNick}</strong>
                {" "}{a.correct ? "🎯" : "💨"}
              </div>
            ))}
          {!Object.values(attacks).length && (
            <div style={{ color: "var(--muted)", fontSize: 12, textAlign: "center", padding: 10 }}>
              لا هجمات بعد...
            </div>
          )}
        </div>
      </div>

      {/* أزرار التحكم */}
      <button className="btn bg" onClick={onEndRound} disabled={ending}>
        {ending ? "⏳..." : "⏭️ انتهاء الجولة"}
      </button>
      <button className="btn br" onClick={handleEndGame} disabled={endingGame} style={{ marginTop: 8 }}>
        {endingGame ? "⏳..." : "🏁 إنهاء اللعبة"}
      </button>
    </div>
  );
}
