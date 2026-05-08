/* ══════════════════════════════════════════════════
   🎭 NICKNAMES GAME — لعبة الألقاب
   لعبة فردية تعتمد على إخفاء الهوية وتخمين الزملاء
   الأدوار: مشرف (admin) + متسابق (player)
══════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from 'react';
import { ref, set, get, update, onValue, off, push } from 'firebase/database';
import { db, roomRef, playersRef, attacksRef, gameRef } from './shared/firebase';
import { AV_COLORS, SUPPORT_EMAIL } from './shared/constants';
import { mkI, genCode, fmtMs, shuffle, normalizeName } from './shared/utils';
import { playSound } from './shared/audio';
import { Av, OnboardingScreen, MyStatsCard } from './shared/components';

export default function NicknamesGame({ onBack, notify, isAdmin: isSuperAdmin, activeCode }) {

  /* ── SESSION ── */
  const [role,          setRole]          = useState(null);   // 'admin' | 'player'
  const [myId,          setMyId]          = useState(null);
  const [myNickLocal,   setMyNickLocal]   = useState('');
  const [gameScreen,    setGameScreen]    = useState('home'); // home | admin | join | waiting | attack | admin_live | results | stats | winner
  const [showOnboarding,setShowOnboarding]= useState(null);  // 'admin' | 'player' | null

  /* ── ROOM ── */
  const [roomCode,      setRoomCode]      = useState('');
  const [joinInput,     setJoinInput]     = useState('');
  const [joinErr,       setJoinErr]       = useState('');
  const [joinName,      setJoinName]      = useState('');
  const [joinNick,      setJoinNick]      = useState('');
  const [joinNick2,     setJoinNick2]     = useState('');
  const [joinLoading,   setJoinLoading]   = useState(false);
  const [roomNickMode,  setRoomNickMode]  = useState(1);

  /* ── LIVE FIREBASE STATE ── */
  const [gameState,     setGameState]     = useState(null);
  const [players,       setPlayers]       = useState({});
  const [attacks,       setAttacks]       = useState({});
  const [allRoundsData, setAllRoundsData] = useState({});

  /* ── ADMIN LOCAL ── */
  const [nickMode,      setNickMode]      = useState(1);
  const [form,          setForm]          = useState({ name: '', nick: '', nick2: '' });
  const [attackDur,     setAttackDur]     = useState({ h: 0, m: 5, s: 0 });

  /* ── ATTACK ── */
  const [myNick,        setMyNick]        = useState(null);
  const [myGuess,       setMyGuess]       = useState(null);
  const [mySubmitted,   setMySubmitted]   = useState(false);
  const [proxyFor,      setProxyFor]      = useState(null);
  const [isProxyMode,   setIsProxyMode]   = useState(false);

  /* ── UI ── */
  const [modal,         setModal]         = useState(null);
  const [statsTab,      setStatsTab]      = useState('round');
  const [heatmapView,   setHeatmapView]   = useState('nicks');
  const [guideRole,     setGuideRole]     = useState('player');

  /* ── SPECIAL MODES ── */
  const [poisonNick,    setPoisonNick]    = useState('');
  const [silentRound,   setSilentRound]   = useState(false);
  const [specialRound,  setSpecialRound]  = useState(1);
  const [pendingSilent, setPendingSilent] = useState(null);
  const [exitAnnounce,  setExitAnnounce]  = useState(null);
  const [flipCards,     setFlipCards]     = useState({});
  const [countdown,     setCountdown]     = useState(null);

  /* ── REFS ── */
  const listenersRef = useRef([]);

  /* ── DERIVED ── */
  const effectiveNickMode = role === 'admin' ? nickMode : (gameState?.nickMode || 1);
  const playersList       = Object.entries(players).map(([id, p]) => ({ ...p, id }));
  const activePlayers     = playersList.filter(p => p.status === 'active');
  const elimPlayers       = playersList.filter(p => p.status !== 'active');
  const attacksList       = Object.values(attacks || {});
  const submittedCount    = attacksList.length;
  const phase             = gameState?.phase    || 'lobby';
  const roundNum          = gameState?.roundNum || 0;
  const roundOrder        = gameState?.roundOrder || { nicks: [], names: [] };
  const attacksPerRound   = gameState?.attacksPerRound || 1;
  const deadline          = gameState?.deadline || null;
  const activePoisonNick  = gameState?.poisonNick  || poisonNick;
  const activeSpecialRound= gameState?.specialRound || specialRound;
  const isSilentActive    = gameState?.silentActive || silentRound;

  const playerAttackCounts = {};
  attacksList.forEach(a => {
    if (a.attackerNick) playerAttackCounts[a.attackerNick] = (playerAttackCounts[a.attackerNick] || 0) + 1;
  });
  const allSubmitted = activePlayers.length > 0 && activePlayers.every(p => {
    const nicks = [p.nick, p.nick2].filter(Boolean);
    const done  = nicks.reduce((sum, n) => sum + (playerAttackCounts[n] || 0), 0);
    return done >= attacksPerRound;
  });
  const myDoneCount   = attacksList.filter(a => a.attackerNick === myNickLocal).length;
  const myAttacksDone = myNickLocal ? myDoneCount >= attacksPerRound : false;
  const allRoundsList = Object.values(allRoundsData || {}).sort((a, b) => a.round - b.round);
  const allAttacksFlat= allRoundsList.flatMap(r => Object.values(r.attacks || {}));

  const attackerRankGlobal = playersList.map(p => {
    const nicks = [p.nick, p.nick2].filter(Boolean);
    const atks  = allAttacksFlat.filter(a => nicks.includes(a.attackerNick));
    return { id: p.id, name: p.name, nick: p.nick, nick2: p.nick2, colorIdx: p.colorIdx, initials: p.initials, status: p.status, count: atks.length, hits: atks.filter(a => a.correct).length };
  }).filter(p => p.count > 0).sort((a, b) => b.hits - a.hits || b.count - a.count);

  /* ══ FIREBASE LISTENERS ══ */
  useEffect(() => {
    if (!roomCode) return;
    const gRef = gameRef(roomCode);
    const pRef = playersRef(roomCode);
    const aRef = attacksRef(roomCode);
    const rRef = ref(db, `rooms/${roomCode}/rounds`);
    onValue(gRef, snap => setGameState(snap.val()));
    onValue(pRef, snap => setPlayers(snap.val() || {}));
    onValue(aRef, snap => setAttacks(snap.val() || {}));
    onValue(rRef, snap => setAllRoundsData(snap.val() || {}));
    return () => { off(gRef); off(pRef); off(aRef); off(rRef); };
  }, [roomCode]);

  /* ══ COUNTDOWN ══ */
  useEffect(() => {
    if (!deadline) { setCountdown(null); return; }
    const tick = () => {
      const rem = deadline - Date.now();
      if (rem <= 0) { setCountdown(0); }
      else {
        setCountdown(rem);
        const secs = Math.floor(rem / 1000);
        if (secs <= 3 && secs > 0) playSound('countdown_last');
        else if (secs <= 10 && secs > 3) playSound('countdown');
      }
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [deadline, phase]);

  /* ══ AUTO-NAVIGATE ══ */
  useEffect(() => {
    if (!gameState) return;
    if (phase === 'attacking') {
      window._resultsPlayed = false;
      if (role === 'admin' && !proxyFor) setGameScreen('admin_live');
      else setGameScreen('attack');
      setMyNick(null); setMyGuess(null); setMySubmitted(false);
      if (!proxyFor) setProxyFor(null);
    }
    if (phase === 'revealing') setGameScreen('results');
    if (phase === 'ended')     { setGameScreen('winner'); setTimeout(() => playSound('applause'), 500); setTimeout(() => playSound('applause'), 1400); }
  }, [phase]);

  /* ══ AUTO-REJOIN ══ */
  useEffect(() => { checkAutoRejoin(); }, []);

  const checkAutoRejoin = async () => {
    try {
      const adminSaved = localStorage.getItem('ng_admin_session');
      if (adminSaved) {
        const s     = JSON.parse(adminSaved);
        const snap  = await get(roomRef(s.roomCode));
        if (snap.exists()) {
          const data  = snap.val();
          const phase = data.game?.phase || 'lobby';
          if (phase === 'ended') { localStorage.removeItem('ng_admin_session'); return; }
          setRoomCode(s.roomCode); setRole('admin');
          if (phase === 'lobby')     setGameScreen('admin');
          else if (phase === 'attacking') setGameScreen('attack');
          else if (phase === 'revealing') setGameScreen('results');
          return;
        } else { localStorage.removeItem('ng_admin_session'); }
      }
      const saved = localStorage.getItem('ng_session');
      if (!saved) return;
      const session = JSON.parse(saved);
      if (!session.roomCode || !session.name || !session.nick) return;
      const snap = await get(roomRef(session.roomCode));
      if (!snap.exists()) { localStorage.removeItem('ng_session'); return; }
      const data     = snap.val();
      const existing = Object.entries(data.players || {}).find(([, p]) => p.name?.trim() === session.name && p.nick?.trim() === session.nick);
      if (!existing) { localStorage.removeItem('ng_session'); return; }
      const [existingId] = existing;
      const ph = data.game?.phase || 'lobby';
      if (ph === 'ended') { localStorage.removeItem('ng_session'); return; }
      setMyId(existingId); setMyNickLocal(session.nick);
      setJoinName(session.name); setJoinNick(session.nick);
      setJoinInput(session.roomCode); setRoomCode(session.roomCode); setRole('player');
      if (ph === 'lobby') setGameScreen('waiting');
      else if (ph === 'attacking') setGameScreen('attack');
      else if (ph === 'revealing') setGameScreen('results');
    } catch (e) { localStorage.removeItem('ng_session'); }
  };

  /* ══ HELPERS ══ */
  const totalMs = () => Math.max((Number(attackDur.h) * 3600 + Number(attackDur.m) * 60 + Number(attackDur.s)) * 1000, 5 * 60 * 1000);
  const cdInfo  = () => {
    if (countdown === null) return { label: '—', urgent: false };
    if (countdown <= 0)     return { label: 'انتهى الوقت!', urgent: true };
    return { label: fmtMs(countdown), urgent: countdown < 5 * 60 * 1000 };
  };
  const cdi = cdInfo();

  /* ══ CREATE ROOM ══ */
  const createRoom = async () => {
    localStorage.removeItem('ng_session');
    localStorage.removeItem('ng_admin_session');
    const code = genCode();
    setRoomCode(code);
    await set(roomRef(code), { game: { phase: 'lobby', roundNum: 0, createdAt: Date.now() }, players: {} });
    localStorage.setItem('ng_admin_session', JSON.stringify({ roomCode: code }));
    setRole('admin'); setGameScreen('admin');
    notify(`✅ الغرفة جاهزة: ${code}`, 'gold');
  };

  /* ══ ADD PLAYER ══ */
  const addPlayer = async () => {
    const { name, nick, nick2 } = form;
    if (!name.trim() || !nick.trim()) { notify('أدخل الاسم واللقب', 'error'); return; }
    if (nickMode === 2 && !nick2.trim()) { notify('أدخل اللقب الثاني', 'error'); return; }
    const allNicks       = playersList.flatMap(p => [p.nick, p.nick2].filter(Boolean));
    const normalizedNicks= allNicks.map(normalizeName);
    if (normalizedNicks.includes(normalizeName(nick)))  { notify(`⚠️ اللقب "${nick.trim()}" سبقك أحد عليه`, 'error'); return; }
    if (nickMode === 2 && normalizedNicks.includes(normalizeName(nick2))) { notify(`⚠️ اللقب "${nick2.trim()}" سبقك أحد عليه`, 'error'); return; }
    if (nickMode === 2 && normalizeName(nick) === normalizeName(nick2))   { notify('اللقبان متطابقان', 'error'); return; }
    const newRef = push(playersRef(roomCode));
    await set(newRef, { name: name.trim(), nick: nick.trim(), nick2: nickMode === 2 ? nick2.trim() : null, initials: mkI(name.trim()), colorIdx: playersList.length % AV_COLORS.length, status: 'active', missedRounds: 0 });
    setForm({ name: '', nick: '', nick2: '' });
    notify(`✅ أضيف ${name.trim()}`, 'success');
  };

  /* ══ JOIN ROOM ══ */
  const joinRoom = async () => {
    if (joinLoading) return;
    setJoinErr('');
    if (joinInput.length !== 6) { setJoinErr('الرمز 6 أرقام'); return; }
    if (!joinName.trim() || !joinNick.trim()) { setJoinErr('أدخل اسمك ولقبك'); return; }
    setJoinLoading(true);
    try {
      const snap = await get(roomRef(joinInput));
      if (!snap.exists()) { setJoinErr('الغرفة غير موجودة'); return; }
      const data            = snap.val();
      const existingPlayers = Object.entries(data.players || {});
      const gamePhase       = data.game?.phase || 'lobby';
      const existing        = existingPlayers.find(([, p]) => p.name?.trim() === joinName.trim() && p.nick?.trim() === joinNick.trim());
      if (existing) {
        const [existingId, existingData] = existing;
        setMyId(existingId); setMyNickLocal(existingData.nick); setRoomCode(joinInput); setRole('player');
        localStorage.setItem('ng_session', JSON.stringify({ roomCode: joinInput, name: joinName.trim(), nick: joinNick.trim(), playerId: existingId }));
        if (gamePhase === 'lobby')     setGameScreen('waiting');
        else if (gamePhase === 'attacking') setGameScreen('attack');
        else if (gamePhase === 'revealing') setGameScreen('results');
        else if (gamePhase === 'ended')     setGameScreen('winner');
        notify('✅ تم الرجوع للعبة!', 'success'); return;
      }
      if (gamePhase !== 'lobby') { setJoinErr('اللعبة بدأت — لا يمكن الانضمام لأول مرة'); return; }
      const existingNicks      = existingPlayers.flatMap(([, p]) => [p.nick, p.nick2].filter(Boolean));
      const normalizedExisting = existingNicks.map(normalizeName);
      if (normalizedExisting.includes(normalizeName(joinNick))) { setJoinErr(`⚠️ اللقب "${joinNick.trim()}" مأخوذ`); return; }
      if (roomNickMode === 2) {
        if (!joinNick2.trim()) { setJoinErr('أدخل لقبك الثاني'); return; }
        if (normalizedExisting.includes(normalizeName(joinNick2))) { setJoinErr('اللقب الثاني مأخوذ'); return; }
        if (normalizeName(joinNick) === normalizeName(joinNick2)) { setJoinErr('اللقبان يجب أن يختلفا'); return; }
      }
      const newRef = push(playersRef(joinInput));
      await set(newRef, { name: joinName.trim(), nick: joinNick.trim(), nick2: roomNickMode === 2 ? joinNick2.trim() : null, initials: mkI(joinName.trim()), colorIdx: existingPlayers.length % AV_COLORS.length, status: 'active', missedRounds: 0 });
      setMyId(newRef.key); setMyNickLocal(joinNick.trim()); setRoomCode(joinInput); setRole('player');
      localStorage.removeItem('ng_admin_session');
      localStorage.setItem('ng_session', JSON.stringify({ roomCode: joinInput, name: joinName.trim(), nick: joinNick.trim(), playerId: newRef.key }));
      setGameScreen('waiting');
      notify('✅ انضممت للعبة! انتظر المشرف', 'success');
    } catch (e) { setJoinErr('خطأ في الاتصال'); }
    finally { setJoinLoading(false); }
  };

  /* ══ LAUNCH ROUND ══ */
  const launchRound = async (rn) => {
    const dl       = Date.now() + totalMs();
    const allNicks = shuffle(playersList.flatMap(p => [p.nick, p.nick2].filter(Boolean)));
    const allNames = shuffle(playersList.map(p => p.id));
    await set(ref(db, `rooms/${roomCode}/currentRound`), { attacks: {} });
    const banCleanup = {};
    playersList.forEach(p => { if (p.isBannedNextRound && p.isBannedNextRound < rn) banCleanup[`rooms/${roomCode}/players/${p.id}/isBannedNextRound`] = null; });
    if (Object.keys(banCleanup).length > 0) await update(ref(db), banCleanup);
    const updates = { phase: 'attacking', roundNum: rn, deadline: dl, roundOrder: { nicks: allNicks, names: allNames }, attacksPerRound: activeSpecialRound, specialRound: 1, poisonNick: null };
    if (!isSilentActive) updates.silentActive = false;
    await update(gameRef(roomCode), updates);
    setSpecialRound(1);
    notify(`🔔 الجولة ${rn} بدأت!`, 'gold');
  };

  const startGame = async () => {
    const minPlayers = nickMode === 2 ? 4 : 6;
    if (activePlayers.length < minPlayers) { notify(`يلزم ${minPlayers} لاعبين على الأقل`, 'error'); return; }
    await update(gameRef(roomCode), { nickMode });
    await launchRound(1);
  };

  /* ══ SUBMIT ATTACK ══ */
  const submitAttack = async (attackerNickOverride = null) => {
    if (!myNick || !myGuess) { notify('اختر لقباً وحدد صاحبه', 'error'); return; }
    const attackerNick   = attackerNickOverride || myNickLocal || '(لاعب)';
    const attackerData   = playersList.find(p => p.nick === attackerNick || p.nick2 === attackerNick);
    if (attackerData?.isBannedNextRound && attackerData.isBannedNextRound >= roundNum) { notify('☠️ أنت ممنوع من الهجوم هذه الجولة!', 'error'); return; }
    const attackerPlayer = playersList.find(p => p.nick === attackerNick || p.nick2 === attackerNick);
    if (attackerPlayer && attackerPlayer.status !== 'active') { notify('❌ أنت خارج المسابقة', 'error'); return; }
    const realOwner = playersList.find(p => p.nick === myNick || p.nick2 === myNick);
    if (!realOwner) { notify('لقب غير موجود!', 'error'); return; }
    if (realOwner.nick === attackerNick || realOwner.nick2 === attackerNick) { notify('❌ لا يمكنك مهاجمة لقبك!', 'error'); return; }
    if (attackerPlayer && myGuess === attackerPlayer.id) { notify('❌ لا يمكنك تخمين نفسك!', 'error'); return; }
    if (myId && myGuess === myId) { notify('❌ لا يمكنك تخمين نفسك!', 'error'); return; }
    const guessedP = playersList.find(p => p.id === myGuess);
    if (guessedP && joinName.trim() && guessedP.name?.trim() === joinName.trim()) { notify('❌ لا يمكنك تخمين نفسك!', 'error'); return; }

    const freshSnap         = await get(attacksRef(roomCode));
    const freshAttacks      = freshSnap.val() || {};
    const attackerPlayerId  = attackerPlayer?.id;
    const myAttacksCount    = Object.values(freshAttacks).filter(a => {
      if (a.attackerPlayerId && attackerPlayerId) return a.attackerPlayerId === attackerPlayerId;
      const nicks = attackerPlayer ? [attackerPlayer.nick, attackerPlayer.nick2].filter(Boolean) : [attackerNick];
      return nicks.includes(a.attackerNick);
    }).length;
    if (myAttacksCount >= attacksPerRound) { notify(`❌ وصلت للحد — ${attacksPerRound} هجمة لكل لاعب`, 'error'); return; }

    const guessedPlayer    = playersList.find(p => p.id === myGuess);
    const correct          = guessedPlayer?.id === realOwner.id;
    const actualAttackerId = attackerPlayer?.id || myId || null;
    const attackData       = { attackerNick, attackerId: myId || attackerNickOverride, attackerPlayerId: actualAttackerId, targetNick: myNick, guessedId: myGuess, guessedName: guessedPlayer?.name, realOwnerId: realOwner.id, realOwnerName: realOwner.name, correct, time: Date.now() };
    const newAttackRef = push(attacksRef(roomCode));
    try {
      await set(newAttackRef, attackData);
    } catch (err) { notify('⚠️ فشل الإرسال — حاول مرة أخرى', 'error'); return; }
    const myNewCount = myAttacksCount + 1;
    setMyNick(null); setMyGuess(null); setProxyFor(null);
    if (attacksPerRound > 1) notify(`✅ هجمة ${myNewCount}/${attacksPerRound}${myNewCount < attacksPerRound ? ' — هاجم مرة أخرى!' : ' — اكتملت!'}`, 'gold');
    else notify('✅ تم إرسال الهجوم!', 'gold');
  };

  /* ══ REVEAL ══ */
  const doReveal = async () => {
    if (phase !== 'attacking') return;
    const currentAttacks = Object.values(attacks || {});
    const notSent        = activePlayers.filter(p => !currentAttacks.some(a => a.attackerNick === p.nick));
    if (notSent.length > 0 && !modal) { setModal({ type: 'confirm_reveal', notSent }); return; }
    setModal(null);
    await processReveal(currentAttacks);
  };

  const processReveal = async (currentAttacks) => {
    playSound('suspense');
    if (activePoisonNick) {
      const poisonMisses = currentAttacks.filter(a => a.targetNick === activePoisonNick && !a.correct);
      if (poisonMisses.length > 0) {
        setTimeout(() => { playSound('poison_hit'); notify(`☠️ ${poisonMisses.length} لاعب وقع في فخ اللقب المسموم!`, 'info'); }, 600);
        const banUpdates = {};
        const nextRound  = (gameState?.roundNum || 0) + 1;
        poisonMisses.forEach(atk => {
          const pid = atk.attackerPlayerId || playersList.find(p => p.nick === atk.attackerNick || p.nick2 === atk.attackerNick)?.id;
          if (pid) banUpdates[`rooms/${roomCode}/players/${pid}/isBannedNextRound`] = nextRound;
        });
        if (Object.keys(banUpdates).length > 0) await update(ref(db), banUpdates);
      }
    }
    const seenElimIds  = new Set();
    const elimAttackers= {};
    currentAttacks.forEach(a => {
      if (a.correct) {
        if (!elimAttackers[a.realOwnerId]) elimAttackers[a.realOwnerId] = [];
        elimAttackers[a.realOwnerId].push(a.attackerNick);
        seenElimIds.add(a.realOwnerId);
      }
    });
    const elimIds = seenElimIds;

    if (isSilentActive) {
      const roundKey   = `round_${roundNum}`;
      const silentExits = playersList.filter(p => elimIds.has(p.id)).map(p => ({ playerId: p.id, nick: p.nick, nick2: p.nick2, name: p.name, attackers: elimAttackers[p.id] || [], roundNum, initials: p.initials, colorIdx: p.colorIdx }));
      const silentMissed= playersList.filter(p => p.status === 'active' && !currentAttacks.some(a => a.attackerNick === p.nick)).map(p => ({ playerId: p.id, missedRounds: (p.missedRounds || 0) + 1 }));
      const updates     = {};
      updates[`rooms/${roomCode}/rounds/${roundKey}`]       = { round: roundNum, attacks: attacks || {}, endedAt: Date.now(), silent: true };
      updates[`rooms/${roomCode}/game/phase`]               = 'attacking';
      updates[`rooms/${roomCode}/game/silentPending`]       = { silentExits, silentMissed, roundNum };
      await update(ref(db), updates);
      setSilentRound(false); await update(gameRef(roomCode), { silentActive: false });
      notify(`🤫 جولة الصمت ${roundNum} — انتقلنا للجولة ${roundNum + 1}`, 'info');
      await launchRound(roundNum + 1); return;
    }

    const updates = {};
    const exitList= [];
    const pendingSilent = gameState?.silentPending;
    if (pendingSilent?.silentExits?.length > 0) {
      pendingSilent.silentExits.forEach(ex => {
        const p = playersList.find(pl => pl.id === ex.playerId);
        if (p && p.status === 'active') {
          const attackersStr = (ex.attackers || []).join(' + ');
          updates[`rooms/${roomCode}/players/${p.id}/status`]           = 'eliminated';
          updates[`rooms/${roomCode}/players/${p.id}/eliminatedBy`]     = attackersStr;
          updates[`rooms/${roomCode}/players/${p.id}/eliminatedRound`]  = ex.roundNum;
          exitList.push({ nick: ex.nick, nick2: ex.nick2, name: ex.name, eliminatedBy: attackersStr, attackers: ex.attackers, initials: ex.initials, colorIdx: ex.colorIdx, fromSilentRound: ex.roundNum });
        }
      });
      pendingSilent.silentMissed?.forEach(m => {
        const p = playersList.find(pl => pl.id === m.playerId);
        if (p && p.status === 'active') {
          updates[`rooms/${roomCode}/players/${p.id}/missedRounds`] = m.missedRounds;
          if (m.missedRounds >= 2) {
            updates[`rooms/${roomCode}/players/${p.id}/status`]          = 'inactive';
            updates[`rooms/${roomCode}/players/${p.id}/eliminatedRound`] = pendingSilent.roundNum;
          }
        }
      });
      updates[`rooms/${roomCode}/game/silentPending`] = null;
    }

    for (const p of playersList) {
      if (elimIds.has(p.id)) {
        const attackers       = elimAttackers[p.id] || [];
        const eliminatedByStr = attackers.join(' + ');
        if (p.nick2) {
          const hitNicks = currentAttacks.filter(a => a.correct && a.realOwnerId === p.id).map(a => a.targetNick);
          const nick1Hit = hitNicks.includes(p.nick);
          const nick2Hit = hitNicks.includes(p.nick2);
          if (!nick1Hit || !nick2Hit) {
            const revealedNick = nick1Hit ? p.nick : p.nick2;
            updates[`rooms/${roomCode}/players/${p.id}/revealedNick`] = revealedNick;
            exitList.push({ nick: revealedNick, name: null, partial: true, eliminatedBy: eliminatedByStr, attackers, initials: p.initials, colorIdx: p.colorIdx });
            continue;
          }
        }
        updates[`rooms/${roomCode}/players/${p.id}/status`]               = 'eliminated';
        updates[`rooms/${roomCode}/players/${p.id}/eliminatedBy`]         = eliminatedByStr;
        updates[`rooms/${roomCode}/players/${p.id}/eliminatedByList`]     = attackers;
        updates[`rooms/${roomCode}/players/${p.id}/eliminatedRound`]      = roundNum;
        exitList.push({ nick: p.nick, nick2: p.nick2, name: p.name, eliminatedBy: eliminatedByStr, attackers, initials: p.initials, colorIdx: p.colorIdx });
      } else if (p.status === 'active') {
        const submitted = currentAttacks.some(a => a.attackerNick === p.nick);
        const nm        = submitted ? 0 : (p.missedRounds || 0) + 1;
        updates[`rooms/${roomCode}/players/${p.id}/missedRounds`] = nm;
        if (nm >= 2 && !p.isBannedNextRound) {
          updates[`rooms/${roomCode}/players/${p.id}/status`]          = 'inactive';
          updates[`rooms/${roomCode}/players/${p.id}/eliminatedRound`] = roundNum;
          exitList.push({ nick: p.nick, name: p.name, eliminatedBy: 'الخمول', attackers: [], initials: p.initials, colorIdx: p.colorIdx, inactive: true });
        }
      }
    }
    const roundKey      = `round_${roundNum}`;
    const remainingAfter= playersList.filter(p => p.status === 'active' && !elimIds.has(p.id)).length;
    updates[`rooms/${roomCode}/rounds/${roundKey}`]  = { round: roundNum, attacks: attacks || {}, endedAt: Date.now() };
    updates[`rooms/${roomCode}/game/phase`]          = remainingAfter <= 2 ? 'ended' : 'revealing';
    await update(ref(db), updates);

    if (exitList.length > 0) {
      exitList.forEach((ex, i) => {
        setTimeout(() => {
          playSound('explosion');
          setExitAnnounce(ex);
          setTimeout(() => setExitAnnounce(null), 3000);
        }, i * 3200);
      });
    }
    const fc = {};
    [...elimIds].forEach(id => { const p = playersList.find(pl => pl.id === id); if (p) fc[p.nick] = false; });
    setFlipCards(fc);
  };

  /* ══ OTHER ADMIN CONTROLS ══ */
  const nextRound    = async () => { const still = playersList.filter(p => p.status === 'active'); if (still.length <= 2) { await update(gameRef(roomCode), { phase: 'ended' }); return; } await launchRound(roundNum + 1); };
  const extendTime   = async (ms) => { await update(gameRef(roomCode), { deadline: (deadline || Date.now()) + ms }); notify(`⏱️ تمديد ${fmtMs(ms)}`, 'gold'); };
  const endGame      = async () => { await update(gameRef(roomCode), { phase: 'ended' }); localStorage.removeItem('ng_session'); localStorage.removeItem('ng_admin_session'); };
  const elimCheat    = async (pid) => { const p = playersList.find(pl => pl.id === pid); await update(ref(db, `rooms/${roomCode}/players/${pid}`), { status: 'cheater', eliminatedRound: roundNum, eliminatedBy: 'المشرف' }); notify(`🚫 أُخرج ${p?.name}`, 'error'); };

  /* ══ STATS HELPERS ══ */
  const nickHeatmap        = () => { const c = {}; allAttacksFlat.forEach(a => { if (a.targetNick) c[a.targetNick] = (c[a.targetNick] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]); };
  const nameHeatmap        = () => { const c = {}; allAttacksFlat.forEach(a => { if (a.guessedName) c[a.guessedName] = (c[a.guessedName] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]); };
  const nickHeatmapActive  = () => { const c = {}; allAttacksFlat.forEach(a => { if (a.targetNick) c[a.targetNick] = (c[a.targetNick] || 0) + 1; }); return Object.entries(c).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]); };
  const nameHeatmapActive  = () => { const c = {}; allAttacksFlat.forEach(a => { if (a.guessedName) c[a.guessedName] = (c[a.guessedName] || 0) + 1; }); return Object.entries(c).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]); };
  const mostHuntedNick     = () => { const h = nickHeatmap(); return h[0] ? { nick: h[0][0], count: h[0][1] } : null; };
  const leastHuntedNick    = () => { const h = nickHeatmap(); const l = h[h.length - 1]; return l && h.length > 1 ? { nick: l[0], count: l[1] } : null; };
  const mostTargeted       = () => { const h = nameHeatmap(); return h[0] ? { name: h[0][0], count: h[0][1] } : null; };
  const leastTargeted      = () => { const h = nameHeatmap(); const l = h[h.length - 1]; return l && h.length > 1 ? { name: l[0], count: l[1] } : null; };

  /* ══ PDF REPORT ══ */
  const downloadPDFReport = () => {
    const report = { gameType: 'لعبة الألقاب', roomCode, timestamp: new Date().toLocaleString('ar-SA'), players: playersList.map(p => ({ name: p.name, nick: p.nick, nick2: p.nick2, status: p.status, eliminatedBy: p.eliminatedBy, eliminatedRound: p.eliminatedRound })), rounds: allRoundsList.map(r => ({ round: r.round, attacks: Object.values(r.attacks || {}).length })), winner: activePlayers[0]?.name || 'لا يوجد' };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `تقرير_${roomCode}_${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    notify('✅ تم تحميل التقرير', 'success');
  };

  /* ══ FULL LOG ══ */
  const renderFullLog = (forEveryone = false) => {
    if (allRoundsList.length === 0) return <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24, fontSize: 12 }}>لا جولات منتهية بعد</div>;
    return (
      <div id="full-log">
        <div className="sg sg4" style={{ marginBottom: 14 }}>
          <div className="sbox"><div className="snum">{allRoundsList.length}</div><div className="slbl">جولات</div></div>
          <div className="sbox"><div className="snum">{allAttacksFlat.length}</div><div className="slbl">هجمات</div></div>
          <div className="sbox"><div className="snum" style={{ color: 'var(--green)' }}>{allAttacksFlat.filter(a => a.correct).length}</div><div className="slbl">إصابات</div></div>
          <div className="sbox"><div className="snum" style={{ color: 'var(--red)' }}>{allAttacksFlat.filter(a => !a.correct).length}</div><div className="slbl">فشل</div></div>
        </div>
        {allRoundsList.map((r, ri) => {
          const ratks  = Object.values(r.attacks || {}).sort((a, b) => a.time - b.time);
          const hits   = ratks.filter(a => a.correct);
          const misses = ratks.filter(a => !a.correct);
          return (
            <div key={ri} className="round-block">
              <div className="round-header">
                <div style={{ fontFamily: 'Cairo', fontSize: 15, fontWeight: 900, color: 'var(--gold)' }}>الجولة {r.round} {r.silent && <span className="tag tb" style={{ fontSize: 10, marginRight: 4 }}>🤫 صمت</span>}</div>
                <div style={{ display: 'flex', gap: 6 }}><span className="tag tb">{ratks.length} هجمة</span><span className="tag tv">{hits.length} ✅</span><span className="tag tr">{misses.length} ❌</span></div>
              </div>
              {hits.length > 0 && <>{<div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, marginBottom: 6 }}>✅ الإصابات</div>}{hits.map((a, i) => { const victim = playersList.find(p => p.id === a.realOwnerId); return (<div key={i} className="attack-row attack-hit" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}><span style={{ fontSize: 14 }}>💥</span><span style={{ fontWeight: 700, color: 'var(--gold)' }}>"{a.attackerNick}"</span><span style={{ color: 'var(--muted)', fontSize: 11 }}>هاجم</span><span style={{ fontWeight: 700 }}>"{a.targetNick}"</span><span className="tag tv" style={{ marginRight: 'auto', fontSize: 9 }}>✅ صح</span></div><div style={{ fontSize: 11, color: 'var(--muted)', paddingRight: 20 }}>خمّن: <strong style={{ color: 'var(--text)' }}>{a.guessedName}</strong>{!forEveryone && <> — الحقيقي: <strong style={{ color: 'var(--gold)' }}>{victim?.name} ({victim?.nick})</strong></>}</div></div>); })}</>}
              {misses.length > 0 && <>{<div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, marginBottom: 6, marginTop: 10 }}>❌ الهجمات الخاطئة</div>}{misses.map((a, i) => { const realOwner = playersList.find(p => p.id === a.realOwnerId); return (<div key={i} className="attack-row attack-miss" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}><span style={{ fontSize: 14 }}>🎯</span><span style={{ fontWeight: 700, color: 'var(--gold)' }}>"{a.attackerNick}"</span><span style={{ color: 'var(--muted)', fontSize: 11 }}>هاجم</span><span style={{ fontWeight: 700 }}>"{a.targetNick}"</span><span className="tag tr" style={{ marginRight: 'auto', fontSize: 9 }}>❌ خطأ</span></div>{!forEveryone && <div style={{ fontSize: 11, color: 'var(--muted)', paddingRight: 20 }}>الحقيقي: <strong style={{ color: 'var(--gold)' }}>{realOwner?.name} ({realOwner?.nick})</strong></div>}</div>); })}</>}
            </div>
          );
        })}
      </div>
    );
  };

  /* ══════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════ */

  /* ── ONBOARDING ── */
  if (showOnboarding) {
    return (
      <OnboardingScreen
        role={showOnboarding}
        onDismiss={() => {
          setShowOnboarding(null);
          if (showOnboarding === 'admin') createRoom();
          else setGameScreen('join');
        }}
      />
    );
  }

  /* ── HOME ── */
  if (gameScreen === 'home') return (
    <div className="scr">
      <button className="btn bgh bsm" style={{ width: 'auto', marginBottom: 12 }} onClick={onBack}>← ساحة الألعاب</button>
      <div style={{ textAlign: 'center', padding: '10px 0 12px' }}>
        <div style={{ fontSize: 46, marginBottom: 6 }}>🎭</div>
        <div className="ptitle" style={{ fontSize: 22 }}>لعبة الألقاب</div>
        <div className="psub">أخفِ هويتك • الكل يهاجم معاً • اكشف الهويات</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="btn bg" onClick={() => setShowOnboarding('admin')}>👑 إنشاء غرفة كمسؤول</button>
        <button className="btn bo" onClick={() => setShowOnboarding('player')}>🎮 انضمام كلاعب برمز الغرفة</button>
      </div>
      <button className="btn bgh" style={{ marginTop: 4 }} onClick={() => setModal({ type: 'guide' })}>📖 كيف تلعب؟</button>
      <div className="div">قوانين اللعبة</div>
      {['🎭 اختر لقباً لا يمت بصلة لاهتماماتك', '⚔️ الكل يهاجم في نفس الوقت — سرية تامة', '🔓 النتائج تنكشف للجميع في لحظة واحدة', '⏰ الوقت يحدده المشرف ويمكن تمديده', '❌ جولتان بلا هجوم = خروج صامت بلا كشف لقبك', '🚫 التعاون ممنوع — عقوبته الإخراج الفوري', '👁️ الألقاب لا تُكشف كاملةً إلا في نهاية المسابقة'].map((r, i) => (
        <div key={i} style={{ padding: '7px 11px', marginBottom: 4, background: '#0f0f22', borderRadius: 8, fontSize: 12, color: 'var(--muted)', border: '1px solid rgba(255,255,255,.04)' }}>{r}</div>
      ))}

      {/* ── GUIDE MODAL ── */}
      {modal?.type === 'guide' && (
        <div className="mbg" style={{ alignItems: 'flex-start', paddingTop: 16, overflowY: 'auto' }}>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 20, maxWidth: 430, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontFamily: 'Cairo', fontSize: 18, fontWeight: 900, color: 'var(--gold)' }}>📖 دليل لعبة الألقاب</div>
              <button className="btn bgh bxs" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="role-toggle" style={{ marginBottom: 16 }}>
              <button className={`role-btn ${guideRole === 'player' ? 'active' : ''}`} onClick={() => setGuideRole('player')}>🎮 أنا متسابق</button>
              <button className={`role-btn ${guideRole === 'admin' ? 'active' : ''}`} onClick={() => setGuideRole('admin')}>👑 أنا المشرف</button>
            </div>
            {guideRole === 'player' && <>
              {[{ n: 1, title: 'ادخل رمز الغرفة وسجّل بياناتك', desc: 'المشرف يرسل رمزاً من 6 أرقام. أدخله واكتب اسمك ولقبك السري.', tip: 'اختر لقباً لا يمت بصلة لاهتماماتك!' }, { n: 2, title: 'انتظر في غرفة الانتظار', desc: 'لقبك مخفي تماماً. انتظر حتى يبدأ المشرف اللعبة — ستنتقل تلقائياً.' }, { n: 3, title: 'شاشة الهجوم', desc: 'لوحة الألقاب فوق + قائمة الأسماء تحت. اختر لقباً تعرف صاحبه ثم اختر الاسم واضغط تأكيد.', tip: 'الكل يهاجم في نفس الوقت سراً!' }, { n: 4, title: 'كشف النتائج', desc: 'المشرف يقرر متى تُكشف. النتائج تظهر للجميع في نفس اللحظة!' }].map(s => (
                <div key={s.n} className="step-card" style={{ marginBottom: 9 }}><div className="step-num">{s.n}</div><div className="step-body"><div className="step-title">{s.title}</div><div className="step-desc">{s.desc}</div>{s.tip && <div className="step-tip">💡 {s.tip}</div>}</div></div>
              ))}
              <div style={{ marginTop: 4, marginBottom: 12, fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>⚠️ قوانين مهمة</div>
              {[['❌', 'جولتان بدون هجوم = خروج صامت بدون كشف لقبك'], ['🚫', 'التعاون ممنوع — المشرف يراقب'], ['🔄', 'لو خرجت عن طريق الخطأ — أدخل نفس البيانات للرجوع'], ['🏆', 'الهدف: ابقَ آخر لاعب دون أن يُكشف لقبك']].map(([ic, tx], i) => (
                <div key={i} className="rule-row">{ic} <span>{tx}</span></div>
              ))}
            </>}
            {guideRole === 'admin' && <>
              {[{ n: 1, title: 'أنشئ الغرفة', desc: 'اضغط "إنشاء غرفة كمسؤول". أرسل الرمز الظاهر للمتسابقين أو أضفهم يدوياً.' }, { n: 2, title: 'حدّد الإعدادات', desc: 'عدد الألقاب (1 أو 2) ومدة كل جولة. الحد الأدنى 5 دقائق — لا حد أقصى.', tip: 'رحلة 3 أيام؟ اجعل كل جولة 2-6 ساعات' }, { n: 3, title: 'ابدأ اللعبة', desc: 'بعد 6 لاعبين على الأقل، اضغط "بدء اللعبة". الجميع ينتقلون تلقائياً.' }, { n: 4, title: 'راقب من زر 👑 تحكم', desc: 'ترى من أرسل هجومه، السجل السري، وتمديد الوقت والهجوم بالنيابة.' }, { n: 5, title: 'كشف النتائج', desc: 'اضغط "كشف نتائج الجولة" متى أردت.', tip: '⚠️ "إنهاء المسابقة كاملاً" يختلف عن "كشف نتائج الجولة"!' }].map(s => (
                <div key={s.n} className="step-card" style={{ marginBottom: 9 }}><div className="step-num">{s.n}</div><div className="step-body"><div className="step-title">{s.title}</div><div className="step-desc">{s.desc}</div>{s.tip && <div className="step-tip">💡 {s.tip}</div>}</div></div>
              ))}
              <div style={{ marginTop: 4, marginBottom: 12, fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>🎲 أدوات الإثارة</div>
              {[['☠️', 'اللقب المسموم — من يهاجمه ويخطئ يخسر جولة'], ['🤫', 'جولة الصمت — النتائج مخفية حتى تقرر أنت'], ['🎮', 'هجوم بالنيابة — إذا لاعب جواله أُغلق'], ['🚫', 'إخراج للغش — إذا رأيت تعاوناً مشبوهاً']].map(([ic, tx], i) => (
                <div key={i} className="rule-row">{ic} <span>{tx}</span></div>
              ))}
            </>}
            <button className="btn bg" style={{ marginTop: 16 }} onClick={() => setModal(null)}>✅ فهمت!</button>
          </div>
        </div>
      )}
    </div>
  );

  /* ── WAITING ── */
  if (gameScreen === 'waiting') return (
    <div className="scr">
      <button className="btn bgh bsm" style={{ width: 'auto', marginBottom: 12 }} onClick={() => setModal({ type: 'exit_game' })}>🚪 انسحاب</button>
      <div style={{ textAlign: 'center', padding: '40px 20px 20px' }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>⏳</div>
        <div className="ptitle">في انتظار المشرف</div>
        <div className="psub">انضممت للغرفة بنجاح!<br/>انتظر حتى يبدأ المشرف اللعبة</div>
      </div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>رمز الغرفة</div>
        <div className="room-code-big" style={{ fontSize: 28, letterSpacing: 6 }}>{roomCode}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}><span className="online-dot" /> {activePlayers.length} لاعب في الغرفة الآن</div>
      </div>
      <div className="card">
        <div className="ctitle">👤 معلوماتك</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),#ff8c00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#07070f', fontSize: 15 }}>{mkI(joinName)}</div>
          <div><div style={{ fontWeight: 700, fontSize: 14 }}>{joinName}</div><div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>لقبك: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>مخفي 🔒</span></div></div>
        </div>
      </div>
      {modal?.type === 'exit_game' && renderExitModal()}
    </div>
  );

  /* ── JOIN ── */
  if (gameScreen === 'join') return (
    <div className="scr">
      <button className="btn bgh bsm" style={{ width: 'auto', marginBottom: 12 }} onClick={() => setGameScreen('home')}>← رجوع</button>
      <div className="ptitle">انضمام للعبة</div>
      <div className="psub">أدخل رمز الغرفة المرسل من المشرف</div>
      <div className="card">
        <div className="ig"><label className="lbl">🔢 رمز الغرفة (6 أرقام)</label>
          <input className={`inp big${joinErr ? 'err-b' : ''}`} placeholder="× × × × × ×" maxLength={6} value={joinInput} onChange={async e => {
            const val = e.target.value.replace(/\D/g, '');
            setJoinInput(val); setJoinErr('');
            if (val.length === 6) { try { const s = await get(roomRef(val)); if (s.exists()) setRoomNickMode(s.val()?.game?.nickMode || 1); } catch (e) {} }
            else setRoomNickMode(1);
          }} />
        </div>
      </div>
      <div className="card">
        <div className="ctitle">👤 بياناتك</div>
        <div className="ig"><label className="lbl">اسمك الكامل</label><input className="inp" placeholder="محمد عبدالله" value={joinName} onChange={e => setJoinName(e.target.value)} /></div>
        <div className="ig"><label className="lbl">{roomNickMode === 2 ? 'لقبك الأول' : 'لقبك السري'}</label><input className="inp" placeholder="القناص" value={joinNick} onChange={e => setJoinNick(e.target.value)} /></div>
        {roomNickMode === 2 && <div className="ig"><label className="lbl">لقبك الثاني</label><input className="inp" placeholder="الصقر" value={joinNick2} onChange={e => setJoinNick2(e.target.value)} /></div>}
        {roomNickMode === 2 && <div style={{ background: 'rgba(79,163,224,.08)', border: '1px solid rgba(79,163,224,.25)', borderRadius: 8, padding: '7px 12px', fontSize: 11, color: 'var(--blue)', marginBottom: 6 }}>ℹ️ هذه اللعبة تستخدم نظام اللقبين</div>}
        <div style={{ background: 'rgba(240,192,64,.06)', border: '1px solid rgba(240,192,64,.2)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--muted)' }}>💡 اختر لقباً لا يمت بصلة لاهتماماتك!</div>
        <div style={{ marginTop: 8, background: 'rgba(79,163,224,.06)', border: '1px solid rgba(79,163,224,.2)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--muted)' }}>🔄 إذا خرجت عن طريق الخطأ، أدخل نفس البيانات للرجوع</div>
        {joinErr && <div className="err-msg">⚠️ {joinErr}</div>}
      </div>
      <button className="btn bg" onClick={joinRoom} disabled={joinLoading}>{joinLoading ? '⏳ جارٍ الانضمام...' : '🚀 انضمام'}</button>
    </div>
  );

  /* ── ADMIN SETUP ── */
  if (gameScreen === 'admin') return (
    <div className="scr">
      <button className="btn bgh bsm" style={{ width: 'auto', marginBottom: 12 }} onClick={() => setModal({ type: 'exit_game' })}>← رجوع</button>
      <div className="card">
        <div className="ctitle">📡 رمز الغرفة <span className="online-dot" /></div>
        <div className="room-code-big">{roomCode}</div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>أرسل هذا الرمز للمتسابقين — {activePlayers.length} منضم الآن</div>
        <button className="btn bo bsm" style={{ width: 'auto', margin: '0 auto' }} onClick={() => { navigator.clipboard?.writeText(roomCode); notify('تم النسخ ✓', 'success'); }}>📋 نسخ الرمز</button>
      </div>
      <div className="card">
        <div className="ctitle">⚙️ إعدادات اللعبة</div>
        <div className="lbl mb2">عدد الألقاب لكل لاعب</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[1, 2].map(n => <button key={n} className={`btn ${nickMode === n ? 'bg' : 'bgh'}`} style={{ flex: 1 }} onClick={async () => { setNickMode(n); if (roomCode) await update(gameRef(roomCode), { nickMode: n }); }}>{n === 1 ? 'لقب واحد' : 'لقبان'}</button>)}
        </div>
        <div className="lbl mb2">⏱️ مدة كل جولة</div>
        <div className="tpick">
          {[['h', 'ساعات'], ['m', 'دقائق'], ['s', 'ثواني']].map(([k, l]) => (
            <div key={k} className="tunit"><label>{l}</label><input type="number" min="0" max={k === 'h' ? 999 : 59} value={attackDur[k]} onChange={e => setAttackDur(p => ({ ...p, [k]: e.target.value }))} /></div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 7 }}>مدة الجولة: <strong style={{ color: 'var(--gold)' }}>{fmtMs(totalMs())}</strong></div>
      </div>
      <div className="card">
        <div className="ctitle">➕ إضافة لاعب</div>
        <div className="ig"><label className="lbl">الاسم الكامل</label><input className="inp" placeholder="محمد عبدالله" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div className="ig"><label className="lbl">اللقب {nickMode === 2 ? 'الأول' : ''}</label><input className="inp" placeholder="القناص" value={form.nick} onChange={e => setForm(f => ({ ...f, nick: e.target.value }))} /></div>
        {nickMode === 2 && <div className="ig"><label className="lbl">اللقب الثاني</label><input className="inp" placeholder="الصقر" value={form.nick2} onChange={e => setForm(f => ({ ...f, nick2: e.target.value }))} /></div>}
        <button className="btn bg" onClick={addPlayer}>➕ إضافة</button>
      </div>
      {playersList.length > 0 && <div className="card">
        <div className="ctitle">👥 المسجلون ({playersList.length})</div>
        <div className="sc">{playersList.map(p => (
          <div key={p.id} className="pi"><Av p={p} />
            <div className="pi-info"><div className="pi-name">{p.name}</div><div className="pi-nick">"{p.nick}"{p.nick2 ? <span style={{ color: 'rgba(240,192,64,.6)' }}> · "{p.nick2}"</span> : ''}</div></div>
            <button className="btn bgh bxs" onClick={async () => { await set(ref(db, `rooms/${roomCode}/players/${p.id}`), null); }}>✕</button>
          </div>
        ))}</div>
      </div>}
      <div className="sg">
        <div className="sbox"><div className="snum">{playersList.length}</div><div className="slbl">مسجلون</div></div>
        <div className="sbox"><div className="snum" style={{ color: 'var(--green)' }}>{activePlayers.length}</div><div className="slbl">نشطون</div></div>
      </div>
      {(() => { const min = nickMode === 2 ? 4 : 6; return activePlayers.length < min && playersList.length > 0 && <div style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center', marginBottom: 9 }}>يلزم {min - activePlayers.length} لاعب إضافي</div>; })()}
      <button className="btn bg" disabled={nickMode === 2 ? activePlayers.length < 4 : activePlayers.length < 6} onClick={startGame} style={{ marginBottom: 8 }}>🚀 بدء اللعبة ({activePlayers.length}/{nickMode === 2 ? 4 : 6}+)</button>
      {phase !== 'lobby' && <button className="btn bb" onClick={() => setGameScreen('attack')} style={{ marginBottom: 8 }}>🎮 العودة للعبة</button>}

      {/* أدوات المشرف الخاصة */}
      <div className="card">
        <div className="ctitle">🎲 أدوات المشرف الخاصة</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {[1, 2, 3].map(n => (
            <button key={n} className={`btn ${specialRound === n ? 'bg' : 'bgh'} bsm`} style={{ flex: 1 }} onClick={async () => { setSpecialRound(n); await update(gameRef(roomCode), { specialRound: n }); }}>
              {n === 1 ? '1 هجمة' : n === 2 ? '⚔️ مزدوجة' : '⚡ اندفاع'}
            </button>
          ))}
        </div>
        <div className="ig">
          <label className="lbl">☠️ اللقب المسموم</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="inp" placeholder="اسم اللقب المسموم" value={poisonNick} onChange={e => setPoisonNick(e.target.value)} style={{ flex: 1 }} />
            <button className="btn br bsm" onClick={async () => { await update(gameRef(roomCode), { poisonNick: poisonNick.trim() || null }); notify(poisonNick.trim() ? `☠️ لقب مسموم: ${poisonNick}` : 'تم إلغاء اللقب المسموم', 'info'); }}>تفعيل</button>
          </div>
        </div>
      </div>
      {modal?.type === 'exit_game' && renderExitModal()}
    </div>
  );

  /* ── ATTACK ── */
  if (gameScreen === 'attack') {
    const inactiveNicks  = playersList.filter(p => p.status === 'inactive').flatMap(p => [p.nick, p.nick2].filter(Boolean));
    const activeNicks    = roundOrder.nicks?.length > 0 ? roundOrder.nicks : playersList.filter(p => p.status === 'active').flatMap(p => [p.nick, p.nick2].filter(Boolean));
    const proxyPlayer    = proxyFor ? playersList.find(p => p.id === proxyFor) : null;
    const effectivePlayer= proxyPlayer || playersList.find(p => p.nick === myNickLocal || p.nick2 === myNickLocal);
    const myNicksList    = effectivePlayer ? [effectivePlayer.nick, effectivePlayer.nick2].filter(Boolean) : [];
    const displayNicks   = [...new Set([...activeNicks, ...inactiveNicks])];
    const visibleNicks   = displayNicks.filter(n => !myNicksList.includes(n));
    const myPlayerId     = proxyPlayer?.id || myId || playersList.find(p => p.nick === myNickLocal || p.nick2 === myNickLocal)?.id;
    const displayNames   = (roundOrder.names?.length > 0 ? roundOrder.names.map(id => playersList.find(p => p.id === id)).filter(Boolean) : playersList.filter(p => p.status === 'active')).filter(p => p.id !== myPlayerId);

    return (
      <div className="scr">
        {/* Info bar */}
        <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              <span style={{ color: 'var(--gold)', fontWeight: 700 }}>#{roomCode}</span>
              <span style={{ margin: '0 8px' }}>·</span>الجولة <strong style={{ color: 'var(--gold)' }}>{roundNum}</strong>
              <span style={{ margin: '0 8px' }}>·</span>نشطون: <strong style={{ color: 'var(--green)' }}>{activePlayers.length}</strong>
            </div>
            <button className="btn bgh bxs" style={{ padding: '3px 8px' }} onClick={() => setGameScreen('stats')}>📊</button>
          </div>
          {role === 'player' && myNickLocal && !proxyFor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,.05)', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>أنت:</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{joinName}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>"{myNickLocal}"</span>
            </div>
          )}
          {role === 'admin' && proxyFor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,.05)', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--purple)' }}>⚡ تهاجم بالإنابة عن:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>{proxyPlayer?.name}</span>
            </div>
          )}
        </div>

        {/* Alerts */}
        {isSilentActive && (<div style={{ background: 'rgba(79,163,224,.08)', border: '1px solid rgba(79,163,224,.3)', borderRadius: 9, padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--blue)' }}><span style={{ fontSize: 16 }}>🤫</span><span><strong>جولة الصمت</strong> — النتائج تُخفى حتى الجولة القادمة</span></div>)}
        {gameState?.silentPending && !isSilentActive && (<div style={{ background: 'rgba(155,89,182,.1)', border: '1.5px solid rgba(155,89,182,.4)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--purple)' }}><span style={{ fontSize: 18 }}>🤫</span><span><strong>جولة صامتة سابقة!</strong> — ستُكشف نتائجها مع هذه الجولة</span></div>)}
        {(() => { const myP = playersList.find(p => p.nick === myNickLocal || p.nick2 === myNickLocal); if (myP?.isBannedNextRound && myP.isBannedNextRound >= roundNum) return (<div style={{ background: 'rgba(230,57,80,.1)', border: '1px solid rgba(230,57,80,.4)', borderRadius: 9, padding: '10px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--red)' }}><span style={{ fontSize: 18 }}>☠️</span><span><strong>أنت محروم هذه الجولة!</strong></span></div>); return null; })()}
        {activePoisonNick && (<div style={{ background: 'rgba(155,89,182,.08)', border: '1px solid rgba(155,89,182,.3)', borderRadius: 9, padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--purple)' }}><span style={{ fontSize: 16 }}>☠️</span><span>تحذير: <strong>يوجد لقب مسموم</strong> — إذا هاجمته وأخطأت تخسر جولة!</span></div>)}
        {attacksPerRound > 1 && (<div style={{ background: 'rgba(240,192,64,.08)', border: '1px solid rgba(240,192,64,.3)', borderRadius: 9, padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}><span>{attacksPerRound === 2 ? '⚔️' : '⚡'}</span><span style={{ color: 'var(--gold)', fontWeight: 700 }}>{attacksPerRound === 2 ? 'جولة مزدوجة' : 'جولة الاندفاع'} — لديك <strong>{attacksPerRound}</strong> هجمات</span></div>)}

        {/* Timer */}
        <div className={`tbar${cdi.urgent ? ' urg' : ''}`}>
          <div style={{ fontSize: 20 }}>{cdi.urgent ? '🔴' : '⏱️'}</div>
          <div style={{ flex: 1 }}><div className={`tval${cdi.urgent ? ' urg' : ''}`}>{cdi.label}</div><div className="tlbl">متبقي للجولة {roundNum}</div></div>
          {role === 'admin' && <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn bgh bxs" onClick={() => extendTime(30 * 60 * 1000)}>+30د</button>
            <button className="btn br bxs" onClick={doReveal}>كشف</button>
            <button className="btn bgh bxs" onClick={() => { setIsProxyMode(false); setGameScreen('admin_live'); }}>👑</button>
          </div>}
        </div>

        {/* Counter */}
        <div className="counter-bar">
          <div style={{ fontSize: 16 }}>📨</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{submittedCount}/{activePlayers.length * attacksPerRound} هجمة{attacksPerRound > 1 && <span style={{ fontSize: 11, color: 'var(--gold)', marginRight: 6 }}> ({attacksPerRound} لكل لاعب)</span>}{allSubmitted && <span style={{ color: 'var(--green)', fontSize: 12, marginRight: 6 }}>✓ اكتمل!</span>}</div>
            <div className="counter-track mt2"><div className="counter-fill" style={{ width: `${(submittedCount / Math.max(activePlayers.length * attacksPerRound, 1)) * 100}%` }} /></div>
          </div>
          {allSubmitted && role === 'admin' && <button className="btn bv bxs" onClick={doReveal}>كشف ▶</button>}
        </div>

        {/* Proxy banner */}
        {proxyPlayer && <div className="ann ag" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>🎮 المشرف يهاجم نيابةً عن</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>{proxyPlayer.name} — {proxyPlayer.nick}</div>
          <button className="btn bgh bsm" style={{ width: 'auto', margin: '8px auto 0' }} onClick={() => { setProxyFor(null); setIsProxyMode(false); setMyNick(null); setMyGuess(null); }}>إلغاء</button>
        </div>}

        {/* SUBMITTED */}
        {(myAttacksDone || myDoneCount >= attacksPerRound) && !proxyFor ? (
          <div className="card">
            <div className="waiting-box">
              <div className="waiting-icon">⏳</div>
              <div className="waiting-title">تم إرسال الهجوم!</div>
              <div className="waiting-sub">لقب مستهدف: <strong style={{ color: 'var(--gold)' }}>"{myNick}"</strong><br />تخمين: <strong>{playersList.find(p => p.id === myGuess)?.name || '—'}</strong><br /><br /><span style={{ fontSize: 11 }}>انتظر كشف النتائج من المشرف 🔓</span></div>
            </div>
          </div>
        ) : (
          <>
            {/* NICK BOARD */}
            <div className="bwrap">
              <div className="blbl">🎭 لوحة الألقاب — اضغط لقباً للهجوم عليه</div>
              <div className="bgrid">
                {(role === 'admin' ? displayNicks : visibleNicks).map((nick, i) => {
                  const owner      = playersList.find(p => p.nick === nick || p.nick2 === nick);
                  const isEliminated= owner && (owner.status === 'eliminated' || owner.status === 'cheater');
                  const isElim     = isEliminated;
                  return (
                    <div key={i} className={`nt${isElim ? ' nd' : myNick === nick ? ' nsel' : ''}`}
                      onClick={() => { if (!isElim) { setMyNick(nick); setMyGuess(null); } }}>
                      <div>{nick}</div>
                      {isElim && <div className="nt-sub">✕ ج{owner.eliminatedRound}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* NAMES LIST */}
            <div className="card">
              <div className="ctitle">👥 قائمة الأسماء{myNick ? <span style={{ color: 'var(--text)', fontWeight: 400, fontSize: 11 }}> — صاحب "<span style={{ color: 'var(--gold)' }}>{myNick}</span>" هو؟</span> : <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 11 }}> — اختر لقباً أولاً</span>}</div>
              <div className="ngrid">
                {displayNames.map(p => {
                  const isElim = p.status !== 'active';
                  return (
                    <div key={p.id} className={`nr${isElim ? ' nrd' : myGuess === p.id ? ' nrsel' : ''}`}
                      onClick={() => { if (!isElim && myNick) setMyGuess(p.id); }}>
                      <Av p={p} sz={30} fs={11} />
                      <div className="nr-info">
                        <div className="nr-name" style={isElim ? { color: 'var(--dim)' } : {}}>{p.name}</div>
                        {isElim && <div className="nr-sub">"{p.nick}"{p.nick2 ? ` / "${p.nick2}"` : ''} — خرج ج{p.eliminatedRound}{p.eliminatedBy ? ` · ${p.eliminatedBy}` : ''}</div>}
                      </div>
                      {myGuess === p.id && <div style={{ color: 'var(--gold)', fontSize: 16 }}>✓</div>}
                    </div>
                  );
                })}
              </div>
              {myNick && myGuess ? (
                <button className="btn bg mt3" onClick={() => submitAttack(proxyPlayer?.nick || null)}>
                  🎯 تأكيد الهجوم على "{myNick}"{proxyPlayer && <span style={{ fontSize: 11, fontWeight: 400 }}> (نيابةً عن {proxyPlayer.name})</span>}
                </button>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, padding: '10px 0' }}>
                  {!myNick ? '① اختر لقباً من اللوحة' : '② اختر الشخص الذي تخمّن أنه صاحب اللقب'}
                </div>
              )}
            </div>
          </>
        )}

        {/* Graveyard */}
        {elimPlayers.length > 0 && <div className="card">
          <div className="ctitle">⚰️ مقبرة الألقاب ({elimPlayers.length})</div>
          <div className="sc">
            {gameState?.silentPending?.silentExits?.map((ex, i) => (
              <div key={i} className="grave" style={{ borderColor: 'rgba(79,163,224,.3)', background: 'rgba(79,163,224,.05)' }}>
                <div className="grave-name" style={{ color: 'var(--blue)' }}>🤫 لقب مخفي</div>
                <div className="grave-info" style={{ color: 'var(--blue)' }}>جولة الصمت {ex.roundNum}</div>
              </div>
            ))}
            {[...elimPlayers].sort((a, b) => (b.eliminatedRound || 0) - (a.eliminatedRound || 0)).map(p => (
              <div key={p.id} className="grave">
                <div className="grave-name">{p.name}</div>
                {p.status === 'eliminated' && <div className="grave-nick">{(() => { const targetedNick = allAttacksFlat.find(a => a.correct && a.realOwnerId === p.id)?.targetNick; const shownNick = targetedNick || p.nick; const otherTargeted = p.nick2 && allAttacksFlat.some(a => a.correct && a.realOwnerId === p.id && a.targetNick === p.nick2); return <>"{shownNick}"{otherTargeted ? ` / "${p.nick2}"` : ''}</>; })()}</div>}
                <div className="grave-info">{p.status === 'cheater' ? '🚫 خرج من المسابقة' : p.status === 'inactive' ? `😴 خرج لعدم الهجوم — ج${p.eliminatedRound}` : `💥 خرج ج${p.eliminatedRound}${p.eliminatedBy ? ` — كشفه: ${p.eliminatedBy}` : ''}`}</div>
              </div>
            ))}
          </div>
        </div>}
      </div>
    );
  }

  /* ── ADMIN LIVE ── */
  if (gameScreen === 'admin_live') return (
    <div className="scr">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button className="btn bgh bxs" onClick={() => setGameScreen('attack')}>← اللعبة</button>
        <div style={{ fontFamily: 'Cairo', fontSize: 16, fontWeight: 900, color: 'var(--gold)' }}>الجولة {roundNum}</div>
        <button className="btn bgh bxs" onClick={() => setGameScreen('stats')}>📊</button>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <div className="sbox" style={{ flex: 1 }}><div className="snum" style={{ fontSize: 16, color: 'var(--green)' }}>{activePlayers.length}</div><div className="slbl">نشطون</div></div>
        <div className="sbox" style={{ flex: 1 }}><div className="snum" style={{ fontSize: 16, color: 'var(--gold)' }}>{submittedCount}</div><div className="slbl">هاجموا</div></div>
        <div className="sbox" style={{ flex: 1 }}><div className="snum" style={{ fontSize: 16, color: 'var(--muted)' }}>{activePlayers.length - submittedCount < 0 ? 0 : activePlayers.length - submittedCount}</div><div className="slbl">ينتظرون</div></div>
      </div>
      {/* Special modes bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[1, 2, 3].map(n => (<button key={n} className={`btn ${activeSpecialRound === n ? 'bg' : 'bgh'} bxs`} style={{ flex: 1 }} onClick={async () => { setSpecialRound(n); await update(gameRef(roomCode), { specialRound: n }); }}>{n === 1 ? '1⚔' : n === 2 ? '2⚔' : '3⚔'}</button>))}
        </div>
        <button className={`btn ${isSilentActive ? 'bb' : 'bgh'} bxs`} style={{ flex: 1 }} onClick={async () => { const v = !isSilentActive; setSilentRound(v); await update(gameRef(roomCode), { silentActive: v }); }}>{isSilentActive ? '🤫 صمت' : '🔕 صمت'}</button>
      </div>
      {/* Timer */}
      <div className={`tbar${cdi.urgent ? ' urg' : ''}`} style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 16 }}>{cdi.urgent ? '🔴' : '⏱️'}</div>
        <div style={{ flex: 1 }}><div className={`tval${cdi.urgent ? ' urg' : ''}`}>{cdi.label}</div><div className="tlbl">متبقي — الجولة {roundNum}</div></div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <button className="btn bg bxs" style={{ flex: 1 }} onClick={() => extendTime(5 * 60 * 1000)}>+5د</button>
        <button className="btn bg bxs" style={{ flex: 1 }} onClick={() => extendTime(15 * 60 * 1000)}>+15د</button>
        <button className="btn bg bxs" style={{ flex: 1 }} onClick={() => extendTime(30 * 60 * 1000)}>+30د</button>
        <input type="number" className="inp" style={{ width: 55, padding: '4px', textAlign: 'center', fontSize: 11 }} placeholder="دقائق" onKeyDown={e => { if (e.key === 'Enter') { const m = parseInt(e.target.value); if (m > 0) { extendTime(m * 60 * 1000); e.target.value = ''; } } }} />
      </div>
      {/* Progress */}
      <div className="counter-bar" style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 14 }}>📨</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{submittedCount}/{activePlayers.length * attacksPerRound} هجمة{attacksPerRound > 1 && <span style={{ fontSize: 10, color: 'var(--gold)', marginRight: 4 }}> ({attacksPerRound} لكل لاعب)</span>}{allSubmitted && <span style={{ color: 'var(--green)', fontSize: 11 }}> ✓</span>}</div>
          <div className="counter-track mt2"><div className="counter-fill" style={{ width: `${(submittedCount / Math.max(activePlayers.length * attacksPerRound, 1)) * 100}%` }} /></div>
        </div>
      </div>
      {/* Smart button */}
      <div style={{ marginBottom: 10 }}>
        {phase === 'attacking' && isSilentActive && (<button className="btn bb" onClick={async () => {
          const currentAtks = Object.values(attacks || {}); const seenIds = new Set(); const elimAtt = {};
          currentAtks.forEach(a => { if (a.correct) { if (!elimAtt[a.realOwnerId]) elimAtt[a.realOwnerId] = []; elimAtt[a.realOwnerId].push(a.attackerNick); seenIds.add(a.realOwnerId); } });
          const silentExits  = playersList.filter(p => seenIds.has(p.id)).map(p => ({ playerId: p.id, nick: p.nick, nick2: p.nick2, name: p.name, attackers: elimAtt[p.id] || [], roundNum, initials: p.initials, colorIdx: p.colorIdx }));
          const silentMissed = playersList.filter(p => p.status === 'active' && !currentAtks.some(a => a.attackerNick === p.nick)).map(p => ({ playerId: p.id, missedRounds: (p.missedRounds || 0) + 1 }));
          const updates = {};
          updates[`rooms/${roomCode}/rounds/round_${roundNum}`]       = { round: roundNum, attacks: attacks || {}, endedAt: Date.now(), silent: true };
          const prev = gameState?.silentPending || { silentExits: [], silentMissed: [] };
          updates[`rooms/${roomCode}/game/silentPending`]             = { silentExits: [...(prev.silentExits || []), ...silentExits], silentMissed: [...(prev.silentMissed || []), ...silentMissed], roundNum };
          setSilentRound(false); await update(gameRef(roomCode), { silentActive: false });
          await set(ref(db, `rooms/${roomCode}/currentRound`), { attacks: {} });
          await update(ref(db), updates); await launchRound(roundNum + 1);
          notify(`🤫 الجولة ${roundNum} مخفية`, 'info');
        }}>🤫 ⏭️ الجولة التالية سراً</button>)}
        {phase === 'attacking' && !isSilentActive && <button className="btn bv" onClick={doReveal}>🔓 كشف نتائج الجولة {roundNum}</button>}
        {phase === 'revealing' && activePlayers.length > 2 && <button className="btn bg" onClick={nextRound}>▶️ الجولة التالية ({roundNum + 1})</button>}
        {phase === 'revealing' && activePlayers.length <= 2 && <button className="btn br" onClick={endGame}>🏆 إعلان الفائز</button>}
      </div>
      <div className="div">حالة اللاعبين</div>
      {/* Players status */}
      <div className="card" style={{ marginBottom: 8 }}>
        {activePlayers.map(p => {
          const pNicks  = [p.nick, p.nick2].filter(Boolean);
          const pDone   = pNicks.reduce((s, n) => s + (playerAttackCounts[n] || 0), 0);
          const allDone = pDone >= attacksPerRound;
          const isBanned= p.isBannedNextRound && p.isBannedNextRound >= roundNum;
          return (
            <div key={p.id} className="pi" style={{ marginBottom: 4 }}>
              <Av p={p} sz={30} fs={11} />
              <div className="pi-info">
                <div style={{ fontSize: 12, fontWeight: 700 }}>{p.name} — <span style={{ color: 'var(--gold)' }}>{p.nick}</span></div>
                <div style={{ fontSize: 10, color: isBanned ? 'var(--purple)' : allDone ? 'var(--green)' : pDone > 0 ? 'var(--gold)' : 'var(--muted)' }}>
                  {isBanned ? '☠️ محروم (مسموم)' : allDone ? `✅ أكمل ${pDone}/${attacksPerRound}` : pDone > 0 ? `⚡ ${pDone}/${attacksPerRound}` : '⏳ لم يرسل'}
                  {p.missedRounds > 0 && !isBanned ? ` · ⚠️ غاب ${p.missedRounds}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {!allDone && !isBanned && <button className="btn bb bxs" onClick={() => { setProxyFor(p.id); setIsProxyMode(true); setMyNick(null); setMyGuess(null); setMySubmitted(false); setGameScreen('attack'); }}>🎮</button>}
                <button className="btn br bxs" onClick={() => elimCheat(p.id)}>غش</button>
              </div>
            </div>
          );
        })}
      </div>
      {/* Secret attack log */}
      <div className="card">
        <div className="ctitle">🕵️ سجل الهجمات</div>
        {attacksList.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, padding: 10 }}>لا هجمات بعد</div> :
          <div className="sc" style={{ maxHeight: 180 }}>{attacksList.map((a, i) => (
            <div key={i} style={{ padding: '5px 8px', marginBottom: 3, background: '#09091e', borderRadius: 7, borderRight: `3px solid ${a.correct ? 'var(--green)' : 'var(--red)'}`, fontSize: 11 }}>
              <span style={{ fontWeight: 700 }}>"{a.attackerNick}"</span> → <span>"{a.targetNick}"</span>
              <span style={{ marginRight: 6 }}> خمّن: {a.guessedName}</span>
              <span style={{ color: a.correct ? 'var(--green)' : 'var(--red)' }}>{a.correct ? '✅' : '❌'}</span>
            </div>
          ))}</div>}
      </div>
      {/* End game */}
      <div style={{ margin: '8px 0', padding: '6px 10px', background: 'rgba(255,255,255,.03)', borderRadius: 7, textAlign: 'center', fontSize: 10, color: 'var(--dim)', border: '1px dashed rgba(255,255,255,.08)' }}>─── إنهاء المسابقة نهائياً ───</div>
      <button className="btn bgh" style={{ border: '1px solid var(--red)', color: 'var(--red)' }} onClick={() => setModal({ type: 'confirm_end' })}>🛑 إنهاء المسابقة كاملاً</button>
      {modal?.type === 'confirm_end' && renderConfirmEndModal()}
    </div>
  );

  /* ── RESULTS ── */
  if (gameScreen === 'results') {
    if (!window._resultsPlayed) { window._resultsPlayed = true; playSound('suspense'); setTimeout(() => playSound('explosion'), 500); }
    const lastRound     = allRoundsList[allRoundsList.length - 1];
    const atks          = Object.values(lastRound?.attacks || attacks || {});
    const silentRoundNum= gameState?.silentPending?.roundNum;
    const silentRoundData= silentRoundNum ? allRoundsList.find(r => r.round === silentRoundNum) : null;
    const silentAtks    = silentRoundData ? Object.values(silentRoundData.attacks || {}) : [];
    const allAtks       = [...atks, ...silentAtks];
    const correct       = allAtks.filter(a => a.correct);
    const wrong         = allAtks.filter(a => !a.correct);
    return (
      <div className="scr">
        <div className="ptitle">🔓 كُشفت النتائج!</div>
        <div className="psub">الجولة {roundNum}</div>
        {silentRoundData && (<div style={{ background: 'linear-gradient(135deg,rgba(155,89,182,.15),rgba(79,163,224,.1))', border: '2px solid rgba(155,89,182,.5)', borderRadius: 12, padding: 14, marginBottom: 12, textAlign: 'center' }}><div style={{ fontSize: 28, marginBottom: 6 }}>🤫</div><div style={{ fontSize: 15, fontWeight: 900, color: 'var(--purple)', marginBottom: 4 }}>كشف نتائج الجولة الصامتة رقم {silentRoundNum}!</div></div>)}
        <div className="sg sg3">
          <div className="sbox"><div className="snum">{atks.length}</div><div className="slbl">هجمات</div></div>
          <div className="sbox"><div className="snum" style={{ color: 'var(--green)' }}>{correct.length}</div><div className="slbl">إصابات ✅</div></div>
          <div className="sbox"><div className="snum" style={{ color: 'var(--red)' }}>{wrong.length}</div><div className="slbl">فشل ❌</div></div>
        </div>
        {correct.length > 0 && <div className="card">
          <div className="ctitle">💥 كُشفت الهويات — اضغط البطاقة للكشف</div>
          {[...new Set(correct.map(a => a.realOwnerId))].map((elimId) => {
            const elim        = playersList.find(p => p.id === elimId);
            if (!elim) return null;
            const allAttackers= [...new Set(correct.filter(a => a.realOwnerId === elimId).map(a => a.attackerNick))];
            const flipped     = flipCards[elim.nick] || false;
            return (
              <div key={elimId} className="flip-scene" onClick={() => { if (!flipped) playSound('explosion'); setFlipCards(prev => ({ ...prev, [elim.nick]: !prev[elim.nick] })); }}>
                <div className={`flip-card${flipped ? ' flipped' : ''}`}>
                  <div className="flip-front"><div style={{ fontSize: 36, marginBottom: 8 }}>🎭</div><div style={{ fontFamily: 'Cairo', fontSize: 18, fontWeight: 900, color: 'var(--gold)' }}>"{elim.nick}"</div><div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>اضغط لكشف الهوية 👆</div></div>
                  <div className="flip-back"><Av p={{ ...elim, status: 'eliminated' }} sz={44} fs={16} /><div style={{ fontFamily: 'Cairo', fontSize: 16, fontWeight: 900, color: 'var(--gold)', marginTop: 8 }}>"{elim.nick}"</div><div style={{ fontSize: 14, color: 'var(--text)', marginTop: 4 }}>{elim.name}</div><div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>⚔️ كُشف من قِبَل: <span style={{ color: 'var(--gold)' }}>{allAttackers.join(' + ')}</span></div></div>
                </div>
              </div>
            );
          })}
        </div>}
        {correct.length === 0 && <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: 'var(--green)' }}>✅ لم يُكشف أحد هذه الجولة</div>}
        {role === 'player' && myNickLocal && <MyStatsCard myNickLocal={myNickLocal} allAttacksFlat={allAttacksFlat} />}
        <button className="btn bo mt2" onClick={() => { setStatsTab('nicks'); setGameScreen('stats'); }}>🔥 الإحصائيات</button>
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, marginTop: 8 }}>المشرف يتحكم بالجولة التالية من 👑</div>
      </div>
    );
  }

  /* ── STATS ── */
  if (gameScreen === 'stats') {
    const roundNickMap   = {}; attacksList.forEach(a => { if (a.targetNick) roundNickMap[a.targetNick] = (roundNickMap[a.targetNick] || 0) + 1; });
    const roundNickSorted= Object.entries(roundNickMap).sort((a, b) => b[1] - a[1]);
    const roundNameMap   = {}; attacksList.forEach(a => { if (a.guessedName) roundNameMap[a.guessedName] = (roundNameMap[a.guessedName] || 0) + 1; });
    const roundNameSorted= Object.entries(roundNameMap).sort((a, b) => b[1] - a[1]);
    const allNickSorted  = nickHeatmapActive();
    const allNameSorted  = nameHeatmapActive();
    const attackerRank   = attackerRankGlobal;
    const myPlayer       = playersList.find(p => p.nick === myNickLocal);
    const myAtks         = allAttacksFlat.filter(a => a.attackerNick === myNickLocal);
    const myHits         = myAtks.filter(a => a.correct);
    const myTargeted     = allAttacksFlat.filter(a => a.realOwnerId === myPlayer?.id);
    const myExposed      = allAttacksFlat.filter(a => a.realOwnerId === myPlayer?.id && a.correct);
    const myAccuracy     = myAtks.length > 0 ? Math.round(myHits.length / myAtks.length * 100) : 0;
    const myRank         = attackerRank.findIndex(p => p.nick === myNickLocal) + 1;
    const effectiveRole  = (role === 'admin' && isProxyMode) ? 'player' : role;
    const tabs           = effectiveRole === 'admin'
      ? [['nicks', '🎭 الألقاب'], ['names', '👥 الأسماء'], ['fierce', '⚔️ الأشرس'], ['poison', '☠️ المسموم'], ['remaining', 'المتبقون'], ['log', '📜 مسار اللعبة']]
      : [['nicks', '🎭 الألقاب'], ['fierce', '⚔️ الأشرس'], ['poison', '☠️ المسموم'], ['me', '👤 أنا'], ['remaining', 'المتبقون']];

    const HeatBar = ({ items, maxVal }) => (
      <>{items.map(([label, count], i) => (
        <div key={label} style={{ marginBottom: 9, maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: i === 0 ? 'var(--red)' : i === 1 ? 'var(--gold)' : i === 2 ? 'var(--blue)' : 'var(--text)', flex: 1, minWidth: 0 }}>{i + 1}. {label}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{count} هجمة</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round(count / maxVal * 100)}%`, background: i === 0 ? 'var(--red)' : i === 1 ? 'var(--gold)' : i === 2 ? 'var(--blue)' : 'var(--muted)', borderRadius: 3, transition: 'width .4s' }} />
          </div>
        </div>
      ))}</>
    );

    return (
      <div className="scr">
        <button className="btn bgh bsm" style={{ width: 'auto', marginBottom: 12 }} onClick={() => setGameScreen(phase === 'revealing' || phase === 'ended' ? 'results' : 'attack')}>← رجوع</button>
        {gameState?.silentPending && role !== 'admin' ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤫</div>
            <div style={{ fontFamily: 'Cairo', fontSize: 18, fontWeight: 900, color: 'var(--blue)', marginBottom: 8 }}>جولة الصمت</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>النتائج محفوظة — ستظهر الإحصائيات عند إعلان المشرف</div>
          </div>
        ) : (
          <>
            <div className="tabs" style={{ flexWrap: 'wrap', gap: 4 }}>
              {tabs.map(([k, l]) => (<button key={k} className={`tab${statsTab === k ? ' on' : ''}`} style={{ flex: 'none', padding: '7px 10px', fontSize: 11 }} onClick={() => setStatsTab(k)}>{l}</button>))}
            </div>

            {statsTab === 'nicks' && <>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, textAlign: 'center' }}>الألقاب من الأكثر استهدافاً للأقل</div>
              {phase === 'revealing' && roundNickSorted.length > 0 && <><div className="ctitle">الجولة الحالية</div><HeatBar items={roundNickSorted} maxVal={roundNickSorted[0]?.[1] || 1} /><div className="div" /></>}
              {phase === 'attacking' && <div style={{ textAlign: 'center', background: 'rgba(240,192,64,.06)', border: '1px solid rgba(240,192,64,.15)', borderRadius: 10, padding: 10, fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>🔒 إحصائيات الجولة الحالية ستظهر بعد الإعلان</div>}
              <div className="ctitle">كامل الجولات</div>
              {allNickSorted.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 18, fontSize: 12 }}>لا بيانات بعد</div> : <HeatBar items={allNickSorted} maxVal={allNickSorted[0]?.[1] || 1} />}
            </>}

            {statsTab === 'names' && effectiveRole === 'admin' && <>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, textAlign: 'center' }}>الأسماء من الأكثر استهدافاً للأقل</div>
              {phase === 'revealing' && roundNameSorted.length > 0 && <><div className="ctitle">الجولة الحالية</div><HeatBar items={roundNameSorted} maxVal={roundNameSorted[0]?.[1] || 1} /><div className="div" /></>}
              <div className="ctitle">كامل الجولات</div>
              {allNameSorted.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 18, fontSize: 12 }}>لا بيانات بعد</div> : <HeatBar items={allNameSorted} maxVal={allNameSorted[0]?.[1] || 1} />}
            </>}

            {statsTab === 'me' && role === 'player' && <>
              <div className="card" style={{ textAlign: 'center', padding: '18px 14px', background: 'linear-gradient(135deg,rgba(240,192,64,.1),rgba(255,140,0,.05))' }}>
                {myPlayer && <Av p={myPlayer} sz={52} fs={18} />}
                <div style={{ fontFamily: 'Cairo', fontSize: 18, fontWeight: 900, color: 'var(--gold)', marginTop: 8 }}>{myPlayer?.name || joinName}</div>
                <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 3 }}>"{myNickLocal}"</div>
                <div style={{ marginTop: 6 }}>{myPlayer?.status === 'active' ? <span className="badge bvd">✅ نشط</span> : <span className="badge brd">خرج ج{myPlayer?.eliminatedRound}</span>}</div>
              </div>
              <div className="sg sg4" style={{ marginBottom: 10 }}>
                {[[myAtks.length, '⚔️ هجماتي', 'var(--gold)'], [myHits.length, '🎯 إصاباتي', 'var(--green)'], [myTargeted.length, '👁️ استُهدفت', 'var(--blue)'], [myExposed.length, '🔓 انكشفت', 'var(--red)']].map(([n, l, col]) => (<div key={l} className="sbox"><div className="snum" style={{ color: col, fontSize: 18 }}>{n}</div><div className="slbl" style={{ fontSize: 9 }}>{l}</div></div>))}
              </div>
              {myAtks.length > 0 && <div className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ fontWeight: 700 }}>دقة هجماتي</span><span style={{ color: 'var(--gold)', fontWeight: 900 }}>{myAccuracy}%</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${myAccuracy}%`, background: `linear-gradient(90deg,${myAccuracy >= 60 ? 'var(--green)' : myAccuracy >= 30 ? 'var(--gold)' : 'var(--red)'},${myAccuracy >= 60 ? '#1a8a50' : '#b5720c'})`, borderRadius: 4, transition: 'width .6s' }} />
                </div>
              </div>}
              {myRank > 0 && <div className="card" style={{ textAlign: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>ترتيبي بالهجمات</div>
                <div style={{ fontFamily: 'Cairo', fontSize: 28, fontWeight: 900, color: 'var(--gold)' }}>{myRank}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>من {attackerRank.length} لاعب هاجم</div>
              </div>}
              <div className="ctitle">سجل هجماتي الشخصي</div>
              {myAtks.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 16, fontSize: 12 }}>لم تهاجم بعد</div> : allRoundsList.map(r => {
                const rAtk = Object.values(r.attacks || {}).filter(a => a.attackerNick === myNickLocal);
                if (rAtk.length === 0) return null;
                return rAtk.map((a, i) => (<div key={i} style={{ padding: '8px 12px', marginBottom: 5, background: '#09091e', borderRadius: 9, borderRight: `3px solid ${a.correct ? 'var(--green)' : 'var(--red)'}`, fontSize: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span style={{ color: 'var(--muted)', fontSize: 10 }}>الجولة {r.round}</span><span style={{ color: a.correct ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{a.correct ? '✅ إصابة' : '❌ خطأ'}</span></div><div>هاجمت <strong style={{ color: 'var(--gold)' }}>"{a.targetNick}"</strong> وخمّنت <strong>{a.guessedName}</strong></div></div>));
              })}
            </>}

            {statsTab === 'fierce' && <>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, textAlign: 'center' }}>{effectiveRole === 'admin' ? 'الاسم واللقب — للمشرف فقط' : 'الألقاب فقط'}</div>
              {attackerRank.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 18, fontSize: 12 }}>لا هجمات بعد</div> : attackerRank.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: '#09091e', borderRadius: 9, marginBottom: 5, border: `1px solid ${i === 0 ? 'rgba(240,192,64,.3)' : i === 1 ? 'rgba(200,200,220,.15)' : i === 2 ? 'rgba(230,57,80,.15)' : 'rgba(255,255,255,.05)'}` }}>
                  <div style={{ fontFamily: 'Cairo', fontSize: 16, fontWeight: 900, width: 26, textAlign: 'center', color: i === 0 ? 'var(--gold)' : i === 1 ? 'rgba(200,200,220,.8)' : i === 2 ? 'var(--red)' : 'var(--muted)' }}>{i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div>
                  {effectiveRole === 'admin' && <Av p={p} sz={32} fs={12} />}
                  <div style={{ flex: 1 }}>{effectiveRole === 'admin' ? <><div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div><div style={{ fontSize: 11, color: 'var(--gold)' }}>"{p.nick}"</div></> : <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gold)' }}>"{p.nick}"</div>}</div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'Cairo', fontSize: 16, fontWeight: 900, color: 'var(--gold)' }}>{p.count}</div><div style={{ fontSize: 9, color: 'var(--muted)' }}>هجمة</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'Cairo', fontSize: 16, fontWeight: 900, color: 'var(--green)' }}>{p.hits}</div><div style={{ fontSize: 9, color: 'var(--muted)' }}>إصابة</div></div>
                </div>
              ))}
            </>}

            {statsTab === 'poison' && <>
              {(() => {
                const poisoned = playersList.filter(p => p.isBannedNextRound);
                if (poisoned.length === 0) return <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 20, fontSize: 12 }}><div style={{ fontSize: 40, marginBottom: 8 }}>☠️</div>لا أحد وقع في فخ اللقب المسموم بعد</div>;
                return (<div>
                  <div style={{ textAlign: 'center', marginBottom: 12 }}><div style={{ fontFamily: 'Cairo', fontSize: 28, fontWeight: 900, color: 'var(--purple)' }}>{poisoned.length}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>لاعب وقع في الفخ</div></div>
                  {poisoned.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'rgba(155,89,182,.08)', border: '1px solid rgba(155,89,182,.2)', borderRadius: 9, marginBottom: 5 }}>
                      <span style={{ fontSize: 16 }}>☠️</span>
                      <div style={{ flex: 1 }}>{effectiveRole === 'admin' ? <><div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div><div style={{ fontSize: 11, color: 'var(--gold)' }}>"{p.nick}"</div></> : <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gold)' }}>"{p.nick}"</div>}</div>
                      <div style={{ fontSize: 11, color: 'var(--purple)' }}>ممنوع ج{p.isBannedNextRound}</div>
                    </div>
                  ))}
                </div>);
              })()}
            </>}

            {statsTab === 'remaining' && <>
              <div className="sg sg3" style={{ marginBottom: 14 }}>
                <div className="sbox"><div className="snum" style={{ color: 'var(--green)' }}>{activePlayers.length}</div><div className="slbl">نشطون</div></div>
                <div className="sbox"><div className="snum" style={{ color: 'var(--red)' }}>{elimPlayers.length}</div><div className="slbl">خارجون</div></div>
                <div className="sbox"><div className="snum">{playersList.length}</div><div className="slbl">الكل</div></div>
              </div>
              <div className="ctitle" style={{ marginBottom: 8 }}>✅ ما زالوا في اللعبة</div>
              {activePlayers.map((p, i) => (
                <div key={p.id} className="pi" style={{ marginBottom: 5 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,var(--green),#1a8a50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#07070f', flexShrink: 0 }}>{i + 1}</div>
                  <Av p={p} sz={30} fs={11} />
                  <div className="pi-info">
                    <div className="pi-name">{p.name}</div>
                    <div className="pi-sub" style={{ color: role === 'admin' ? 'var(--gold)' : 'var(--muted)' }}>{role === 'admin' ? `"${p.nick}"${p.nick2 ? ` · "${p.nick2}"` : ''}` : ' لقبه مخفي 🔒'}</div>
                  </div>
                </div>
              ))}
              {elimPlayers.length > 0 && <><div className="ctitle" style={{ marginBottom: 8, marginTop: 14 }}>⚰️ مقبرة الألقاب</div>
                {[...elimPlayers].sort((a, b) => (b.eliminatedRound || 0) - (a.eliminatedRound || 0)).map(p => (
                  <div key={p.id} className="grave">
                    <div className="grave-name">{p.name}</div>
                    {p.status === 'eliminated' && <div className="grave-nick">{(() => { const targetedNick = allAttacksFlat.find(a => a.correct && a.realOwnerId === p.id)?.targetNick; const shownNick = targetedNick || p.nick; const otherTargeted = p.nick2 && allAttacksFlat.some(a => a.correct && a.realOwnerId === p.id && a.targetNick === p.nick2); return <>"{shownNick}"{otherTargeted ? ` / "${p.nick2}"` : ''}</>; })()}</div>}
                    <div className="grave-info">{p.status === 'cheater' ? '🚫 خرج من المسابقة' : p.status === 'inactive' ? `😴 خرج لعدم الهجوم — ج${p.eliminatedRound}` : `💥 خرج ج${p.eliminatedRound}${p.eliminatedBy ? ` — كشفه: ${p.eliminatedBy}` : ''}`}</div>
                  </div>
                ))}
              </>}
            </>}

            {statsTab === 'log' && role === 'admin' && <>
              <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, marginBottom: 12 }}>🕵️ السجل الكامل — للمشرف فقط</div>
              {renderFullLog(false)}
            </>}
          </>
        )}
      </div>
    );
  }

  /* ── WINNER ── */
  if (gameScreen === 'winner') {
    const winners      = activePlayers;
    const totalCorrect = allAttacksFlat.filter(a => a.correct).length;
    return (
      <div className="scr">
        <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
          <div style={{ fontSize: 80, animation: 'bnc 1s infinite' }}>🏆</div>
          <div style={{ fontFamily: 'Cairo', fontSize: 28, fontWeight: 900, background: 'linear-gradient(135deg,var(--gold),#ff8c00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginTop: 8 }}>{winners.length === 1 ? 'الفائز' : 'الفائزون'}</div>
        </div>
        {winners.map((w, i) => (
          <div key={w.id} style={{ background: 'linear-gradient(135deg,rgba(240,192,64,.2),rgba(255,200,50,.1))', border: '2px solid var(--gold)', borderRadius: 20, padding: '24px 18px', marginBottom: 12, textAlign: 'center', boxShadow: '0 0 40px rgba(240,192,64,.15)', animation: 'fi .6s ease' }}>
            <div style={{ fontSize: 50, marginBottom: 6 }}>{i === 0 ? '👑' : '🥈'}</div>
            <div style={{ fontFamily: 'Cairo', fontSize: 24, fontWeight: 900, color: 'var(--gold)' }}>{w.name}</div>
            <div style={{ fontSize: 15, color: 'var(--text)', marginTop: 4 }}>"{w.nick}"{w.nick2 ? <span style={{ color: 'rgba(240,192,64,.6)' }}> · "{w.nick2}"</span> : ''}</div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>صمد {roundNum} جولة بدون كشف</div>
          </div>
        ))}
        <div className="sg sg3" style={{ marginBottom: 12 }}>
          <div className="sbox"><div className="snum">{roundNum}</div><div className="slbl">جولات</div></div>
          <div className="sbox"><div className="snum">{allAttacksFlat.length}</div><div className="slbl">هجمات</div></div>
          <div className="sbox"><div className="snum" style={{ color: 'var(--green)' }}>{totalCorrect}</div><div className="slbl">إصابات</div></div>
        </div>
        {attackerRankGlobal.length > 0 && <div className="card">
          <div className="ctitle">⚔️ الأشرس هجوماً</div>
          {attackerRankGlobal.slice(0, 5).map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#09091e', borderRadius: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: 'Cairo', fontSize: 14, fontWeight: 900, width: 22, color: i === 0 ? 'var(--gold)' : 'var(--muted)' }}>{i === 0 ? '👑' : i + 1}</span>
              <span style={{ fontWeight: 700, color: 'var(--gold)', flex: 1 }}>"{p.nick}"</span>
              <span style={{ fontSize: 12, color: 'var(--green)' }}>{p.hits} إصابة</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.count} هجمة</span>
            </div>
          ))}
        </div>}
        <div className="card">
          <div className="ctitle">📜 تسلسل المسابقة</div>
          {renderFullLog(role !== 'admin')}
        </div>
        <button className="btn bgh mt2" onClick={() => setGameScreen('stats')}>📊 الإحصائيات الكاملة</button>
        {role === 'admin' && <button className="btn bg mt2" onClick={downloadPDFReport}>📄 تحميل التقرير</button>}
        <button className="btn bo mt2" onClick={() => { setGameScreen('home'); setRole(null); setRoomCode(''); setGameState(null); setPlayers({}); setAttacks({}); setAllRoundsData({}); }}>🏟️ العودة للرئيسية</button>
      </div>
    );
  }

  /* ── MODALS ── */
  function renderExitModal() {
    return (
      <div className="mbg">
        <div className="modal">
          <div className="micn">🚪</div>
          <div className="mtitle">الرجوع للصفحة الرئيسية؟</div>
          <div className="msub">
            {role === 'player' && <><يمكنك العودة لاحقاً بنفس:<br /><span style={{ color: 'var(--gold)', fontWeight: 700 }}>رمز الغرفة + اسمك + لقبك</span></>}
            {role === 'admin' && <>المتسابقون سيبقون في انتظار عودتك.<br /><span style={{ color: 'var(--gold)', fontWeight: 700 }}>يمكنك العودة تلقائياً بفتح الرابط</span></>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn bg" onClick={() => setModal(null)}>← أكمل اللعبة</button>
            <button className="btn br" onClick={() => { setModal(null); localStorage.removeItem('ng_session'); localStorage.removeItem('ng_admin_session'); setRole(null); setRoomCode(''); setGameState(null); setPlayers({}); setAttacks({}); setAllRoundsData({}); setMyId(null); setMyNickLocal(''); setJoinName(''); setJoinNick(''); setJoinInput(''); setGameScreen('home'); onBack(); notify('تم الخروج من اللعبة', 'info'); }}>🚪 انسحاب من اللعبة</button>
          </div>
        </div>
      </div>
    );
  }

  function renderConfirmEndModal() {
    return (
      <div className="mbg">
        <div className="modal">
          <div className="micn">⚠️</div>
          <div className="mtitle" style={{ color: 'var(--red)' }}>إنهاء المسابقة كاملاً؟</div>
          <div className="msub">هذا سيُنهي المسابقة نهائياً وسيُعلن الفائزون الحاليون.<br /><strong style={{ color: 'var(--red)' }}>لا يمكن التراجع!</strong></div>
          <div style={{ background: 'rgba(230,57,80,.08)', border: '1px solid rgba(230,57,80,.2)', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>إذا أردت فقط كشف نتائج الجولة الحالية اضغط <strong style={{ color: 'var(--green)' }}>رجوع</strong> واستخدم زر <strong style={{ color: 'var(--green)' }}>🔓 كشف نتائج الجولة</strong></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn br" style={{ flex: 1 }} onClick={() => { setModal(null); endGame(); }}>نعم، أنهِ</button>
            <button className="btn bv" style={{ flex: 1 }} onClick={() => setModal(null)}>← رجوع</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Cinematic exit overlay */}
      {exitAnnounce && (
        <div className="exit-screen" onClick={() => setExitAnnounce(null)}>
          <div className="exit-icon">💥</div>
          <div className="exit-title">كُشفت الهوية!</div>
          <div className="exit-nick">"{exitAnnounce.nick}"</div>
          <div className="exit-name">{exitAnnounce.inactive ? 'خرج بسبب الخمول' : `الشخص خلف اللقب: ${exitAnnounce.name}`}</div>
          {!exitAnnounce.inactive && <div className="exit-killer">⚔️ كُشف من قِبَل: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{exitAnnounce.eliminatedBy}</span></div>}
          <div style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,.3)' }}>اضغط للإغلاق</div>
        </div>
      )}
      {modal?.type === 'confirm_reveal' && (
        <div className="mbg">
          <div className="modal">
            <div className="micn">⚠️</div>
            <div className="mtitle" style={{ color: 'var(--gold)' }}>كشف مبكر؟</div>
            <div className="msub">{modal.notSent.length} لاعب لم يرسل:<br /><span style={{ color: 'var(--red)' }}>{modal.notSent.map(p => p.name).join('، ')}</span></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn br" style={{ flex: 1 }} onClick={() => { setModal(null); processReveal(attacksList); }}>كشف الآن</button>
              <button className="btn bgh" style={{ flex: 1 }} onClick={() => setModal(null)}>انتظر</button>
            </div>
          </div>
        </div>
      )}
      {modal?.type === 'exit_game' && renderExitModal()}
      {modal?.type === 'confirm_end' && renderConfirmEndModal()}
    </>
  );
}
