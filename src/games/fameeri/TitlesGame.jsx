/**
 * games/titles/TitlesGame.jsx
 * ────────────────────────────
 * 🎭 لعبة الألقاب — المنسق الرئيسي
 * يوزّع الشاشات فقط — لا منطق لعبة هنا
 */
import { useState, useEffect } from "react";
import { ref, onValue, off }   from "firebase/database";
import { FB_PATHS, LS_KEYS }   from "../../core/constants";

import TitlesHome    from "./TitlesHome";
import TitlesSetup   from "./TitlesSetup";
import TitlesJoin    from "./TitlesJoin";
import TitlesLobby   from "./TitlesLobby";
import TitlesPlay    from "./TitlesPlay";
import TitlesResults from "./TitlesResults";

export default function TitlesGame({
  db, isDomainAdmin, activeCode, onNeedCode, onExit, notify,
}) {
  const [screen,       setScreen      ] = useState("home");
  const [role,         setRole        ] = useState(null);
  const [roomCode,     setRoomCode    ] = useState("");
  const [myId,         setMyId        ] = useState(null);
  const [myNickLocal,  setMyNickLocal ] = useState("");
  const [gameState,    setGameState   ] = useState(null);
  const [players,      setPlayers     ] = useState({});
  const [attacks,      setAttacks     ] = useState({});
  const [allRoundsData,setAllRoundsData] = useState({});

  /* ══ Auto-rejoin ══ */
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEYS.session);
    if (!saved) return;
    try {
      const s = JSON.parse(saved);
      if (s.roomCode && s.role) {
        setRoomCode(s.roomCode);
        setRole(s.role);
        setMyId(s.myId || null);
        setMyNickLocal(s.myNickLocal || "");
        setScreen("lobby");
      }
    } catch {
      localStorage.removeItem(LS_KEYS.session);
    }
  }, []);

  /* ══ Firebase Listeners ══ */
  useEffect(() => {
    if (!roomCode) return;
    const refs = {
      game:    ref(db, FB_PATHS.titlesGame(roomCode)),
      players: ref(db, FB_PATHS.titlesPlayers(roomCode)),
      attacks: ref(db, FB_PATHS.titlesAttacks(roomCode)),
      rounds:  ref(db, FB_PATHS.titlesRounds(roomCode)),
    };
    onValue(refs.game,    (snap) => setGameState(snap.val()));
    onValue(refs.players, (snap) => setPlayers(snap.val() || {}));
    onValue(refs.attacks, (snap) => setAttacks(snap.val() || {}));
    onValue(refs.rounds,  (snap) => setAllRoundsData(snap.val() || {}));
    return () => Object.values(refs).forEach((r) => off(r));
  }, [roomCode]);

  /* ══ Auto-navigate حسب phase ══ */
  useEffect(() => {
    if (!gameState) return;
    const ph = gameState.phase;
    if (ph === "lobby")   setScreen("lobby");
    if (ph === "playing") setScreen("playing");
    if (ph === "ended")   setScreen("results");
  }, [gameState?.phase]);

  const shared = {
    db, isDomainAdmin, activeCode, onNeedCode,
    roomCode, setRoomCode, role, setRole,
    myId, setMyId, myNickLocal, setMyNickLocal,
    gameState, players, attacks, allRoundsData,
    notify, goTo: setScreen, onExit,
  };

  return (
    <div className="scr">
      {screen === "home"    && <TitlesHome    {...shared} />}
      {screen === "setup"   && <TitlesSetup   {...shared} />}
      {screen === "join"    && <TitlesJoin    {...shared} />}
      {screen === "lobby"   && <TitlesLobby   {...shared} />}
      {screen === "playing" && <TitlesPlay    {...shared} />}
      {screen === "results" && <TitlesResults {...shared} />}
    </div>
  );
}
