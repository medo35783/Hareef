/**
 * games/titles/TitlesSetup.jsx
 * ─────────────────────────────
 * المشرف يُعِدّ الغرفة ويختار الإعدادات
 */
import { useState } from "react";
import { ref, set } from "firebase/database";
import { genCode, buildPlayerData } from "../../core/helpers";
import { FB_PATHS, LS_KEYS, AV_COLORS } from "../../core/constants";

const NICK_OPTIONS = [
  { mode: 1, icon: "🏷️", label: "لقب واحد",        desc: "بسيط وسريع"             },
  { mode: 2, icon: "🎭", label: "لقبان",            desc: "تشويش مضاعف"            },
  { mode: 3, icon: "🕵️", label: "لقب + اسم مزيف",  desc: "أصعب مستوى من الخداع"  },
];

export default function TitlesSetup({
  db, myId, setMyId, setRoomCode, setRole, setMyNickLocal, goTo, notify,
}) {
  const [name,        setName       ] = useState("");
  const [nickMode,    setNickMode   ] = useState(1);
  const [attacksPR,  setAttacksPR  ] = useState(2);
  const [roundMins,  setRoundMins  ] = useState(3);
  const [loading,    setLoading    ] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { notify("أدخل اسمك أولاً", "error"); return; }
    setLoading(true);
    try {
      const code   = genCode();
      const pId    = "admin_" + Date.now();
      const player = buildPlayerData({ name, nick: "المشرف", colorIdx: 0 });

      await set(ref(db, FB_PATHS.titlesRoom(code)), {
        game: {
          phase:          "lobby",
          nickMode,
          roundNum:       0,
          deadline:       null,
          attacksPerRound: attacksPR,
          roundDuration:  roundMins * 60 * 1000,
          poisonNick:     null,
          specialRound:   null,
          silentActive:   false,
          createdAt:      Date.now(),
          adminId:        pId,
        },
        players: {
          [pId]: { ...player, role: "admin" },
        },
      });

      // حفظ الجلسة
      localStorage.setItem(LS_KEYS.session, JSON.stringify({
        roomCode: code, role: "admin", myId: pId, myNickLocal: "المشرف",
      }));

      setMyId(pId);
      setRoomCode(code);
      setRole("admin");
      setMyNickLocal("المشرف");
      goTo("lobby");
      notify("✅ تم إنشاء الغرفة!", "success");
    } catch (e) {
      console.error(e);
      notify("❌ خطأ في الإنشاء", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scr">
      <div className="ptitle">⚙️ إعداد الغرفة</div>
      <div className="psub">خصّص اللعبة كما تريد</div>

      {/* الاسم */}
      <div className="card">
        <div className="ctitle">👤 اسمك</div>
        <div className="ig">
          <label className="lbl">اسمك كمشرف:</label>
          <input
            className="inp" value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: أبو خالد"
            maxLength={20}
          />
        </div>
      </div>

      {/* وضع الألقاب */}
      <div className="card">
        <div className="ctitle">🎭 وضع الألقاب</div>
        <div className="bgrid">
          {NICK_OPTIONS.map((o) => (
            <div
              key={o.mode}
              className={`nt ${nickMode === o.mode ? "nsel" : ""}`}
              onClick={() => setNickMode(o.mode)}
            >
              <div style={{ fontSize: 22, marginBottom: 3 }}>{o.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{o.label}</div>
              <div className="nt-sub">{o.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* إعدادات الجولة */}
      <div className="card">
        <div className="ctitle">⏱️ إعدادات الجولة</div>

        <div className="ig">
          <label className="lbl">هجمات لكل لاعب في الجولة:</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                className={`tab ${attacksPR === n ? "on" : ""}`}
                onClick={() => setAttacksPR(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="ig">
          <label className="lbl">مدة الجولة (دقائق):</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[2, 3, 5, 7].map((m) => (
              <button
                key={m}
                className={`tab ${roundMins === m ? "on" : ""}`}
                onClick={() => setRoundMins(m)}
              >
                {m}د
              </button>
            ))}
          </div>
        </div>
      </div>

      <button className="btn bg" onClick={handleCreate} disabled={loading || !name.trim()}>
        {loading ? "⏳ جاري الإنشاء..." : "🚀 إنشاء الغرفة"}
      </button>

      <button className="btn bgh" onClick={() => goTo("home")} style={{ marginTop: 8 }}>
        ← رجوع
      </button>
    </div>
  );
}
