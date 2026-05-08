/**
 * games/fameeri/FameeriGame.jsx
 * ──────────────────────────────
 * 🌳 لعبة صيد القميري — المنسق الرئيسي
 *
 * الجوهر: Dashboard مشرف + تنافس ثقافي بين مجموعات
 *   - المشرف  ← لوحة تحكم كاملة، يوزع المجموعات، يدير الأسلحة والأسئلة
 *   - القائد  ← يتحدث باسم مجموعته، ينفذ الهجمات
 *   - الأعضاء ← يتابعون على شاشة مجموعتهم
 *
 * هذا الملف يوزّع الشاشات فقط — لا منطق لعبة هنا
 * الحد الأقصى: 150 سطر
 */

import { useState, useEffect } from "react";
import { ref, onValue, off }   from "firebase/database";
import { FB_PATHS, LS_KEYS }   from "../../core/constants";

// شاشات اللعبة
import FameeriHome      from "./FameeriHome";
import FameeriSetup     from "./FameeriSetup";
import FameeriJoin      from "./FameeriJoin";
import FameeriLobby     from "./FameeriLobby";
import FameeriPlay      from "./FameeriPlay";      // شامل الـ Dashboard
import FameeriReveal    from "./FameeriReveal";
import FameeriResults   from "./FameeriResults";

export default function FameeriGame({
  db,
  isDomainAdmin,
  activeCode,
  onNeedCode,
  onExit,
  notify,
}) {
  // ── الشاشة الحالية ──
  const [screen, setScreen] = useState("home");
  // home | setup | join | lobby | playing | reveal | results

  // ── الجلسة ──
  const [role,        setRole       ] = useState(null);   // 'admin' | 'leader' | 'member'
  const [roomCode,    setRoomCode   ] = useState("");
  const [myId,        setMyId       ] = useState(null);
  const [myName,      setMyName     ] = useState("");
  const [groupId,     setGroupId    ] = useState(null);
  const [groupName,   setGroupName  ] = useState("");

  // ── بيانات Firebase (live) ──
  const [gameState, setGameState] = useState(null);
  const [groups,    setGroups   ] = useState({});
  const [members,   setMembers  ] = useState({});
  const [attacks,   setAttacks  ] = useState({});

  /* ══ AUTO-REJOIN ══ */
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEYS.qumairi);
    if (!saved) return;
    try {
      const s = JSON.parse(saved);
      if (s.roomCode && s.role) {
        setRoomCode(s.roomCode);
        setRole(s.role);
        setMyId(s.myId || null);
        setMyName(s.myName || "");
        setGroupId(s.groupId || null);
        setGroupName(s.groupName || "");
        setScreen("lobby");
      }
    } catch {
      localStorage.removeItem(LS_KEYS.qumairi);
    }
  }, []);

  /* ══ Firebase Listeners ══ */
  useEffect(() => {
    if (!roomCode) return;

    const refs = {
      game:    ref(db, FB_PATHS.fameeriGame(roomCode)),
      groups:  ref(db, FB_PATHS.fameeriGroups(roomCode)),
      members: ref(db, FB_PATHS.fameeriMembers(roomCode)),
      attacks: ref(db, FB_PATHS.fameeriAttacks(roomCode)),
    };

    onValue(refs.game,    snap => setGameState(snap.val()));
    onValue(refs.groups,  snap => setGroups(snap.val() || {}));
    onValue(refs.members, snap => setMembers(snap.val() || {}));
    onValue(refs.attacks, snap => setAttacks(snap.val() || {}));

    return () => Object.values(refs).forEach(r => off(r));
  }, [roomCode]);

  /* ══ Auto-navigate بناء على phase ══ */
  useEffect(() => {
    if (!gameState) return;
    const ph = gameState.phase;
    if (ph === "lobby"        || ph === "distributing") setScreen("lobby");
    if (ph === "playing")                               setScreen("playing");
    if (ph === "ended")                                 setScreen("results");
    // الكشف الدرامي يظهر فوق شاشة اللعب (لا يغير الشاشة)
  }, [gameState?.phase]);

  /* ══ Props مشتركة ══ */
  const sharedProps = {
    db, isDomainAdmin, activeCode, onNeedCode,
    roomCode, setRoomCode,
    role, setRole,
    myId, setMyId,
    myName, setMyName,
    groupId, setGroupId,
    groupName, setGroupName,
    gameState, groups, members, attacks,
    notify,
    goTo: setScreen,
    onExit,
  };

  /* ══ عرض الشاشة المناسبة ══ */
  return (
    <div className="scr">
      {screen === "home"    && <FameeriHome    {...sharedProps} />}
      {screen === "setup"   && <FameeriSetup   {...sharedProps} />}
      {screen === "join"    && <FameeriJoin    {...sharedProps} />}
      {screen === "lobby"   && <FameeriLobby   {...sharedProps} />}
      {screen === "playing" && (
        <>
          <FameeriPlay {...sharedProps} />
          {/* الكشف الدرامي يظهر فوق اللعب */}
          {gameState?.showResult && (
            <FameeriReveal {...sharedProps} />
          )}
        </>
      )}
      {screen === "results" && <FameeriResults {...sharedProps} />}
    </div>
  );
}
