/* ══════════════════════════════════════════════════
   🦅 QUMAIRI GAME — لعبة صيد القميري
   لوحة تحكم للتنافس الثقافي بين المجموعات
   الأدوار: مشرف (admin) + قائد (leader) + متسابق (member)
══════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from 'react';
import { ref, set, get, update, onValue, off, push } from 'firebase/database';
import { db } from './shared/firebase';
import { Q_TREES, Q_WEAPONS, Q_TOTAL } from './shared/constants';
import { genCode } from './shared/utils';
import { playSound } from './shared/audio';

export default function QumairiGame({ onBack, notify }) {

  const [qRoom,         setQRoom]         = useState('');
  const [qRole,         setQRole]         = useState(null);
  const [qGroupName,    setQGroupName]    = useState('');
  const [qGroupId,      setQGroupId]      = useState(null);
  const [qMyName,       setQMyName]       = useState('');
  const [qMyId,         setQMyId]         = useState(null);
  const [gameScreen,    setGameScreen]    = useState('home');
  const [qGameState,    setQGameState]    = useState(null);
  const [qGroups,       setQGroups]       = useState({});
  const [qMembers,      setQMembers]      = useState({});
  const [qAttacks,      setQAttacks]      = useState({});
  const [qJoinInput,    setQJoinInput]    = useState('');
  const [qJoinErr,      setQJoinErr]      = useState('');
  const [qDistribution, setQDistribution] = useState({});
  const [qDistLocked,   setQDistLocked]   = useState(false);
  const [qAttackTarget, setQAttackTarget] = useState({ group: '', tree: '', weapon: '' });
  const [qReveal,       setQReveal]       = useState(null);
  const [qJoinLoading,  setQJoinLoading]  = useState(false);
  const [qCustomTimer,  setQCustomTimer]  = useState('');
  const [qCountdown,    setQCountdown]    = useState(null);
  const [qTurnOverlay,  setQTurnOverlay]  = useState(null);
  const lastResultRef = useRef(null);

  const qSave = (extra = {}) => {
    localStorage.setItem('ng_qumairi', JSON.stringify({
      qRoom, qRole, qGroupId, qGroupName, qMyName, qMyId, qDistLocked, ...extra
    }));
  };

  const resetAndBack = () => {
    setGameScreen('home'); setQRoom(''); setQRole(null);
    setQGroupId(null); setQGroupName(''); setQMyName(''); setQMyId(null);
    setQGameState(null); setQGroups({}); setQMembers({}); setQAttacks({});
    setQDistribution({}); setQReveal(null);
    localStorage.removeItem('ng_qumairi');
    onBack();
  };

  // Auto-rejoin
  useEffect(() => {
    const saved = localStorage.getItem('ng_qumairi');
    if (!saved) return;
    try {
      const s = JSON.parse(saved);
      if (s.qRoom)      setQRoom(s.qRoom);
      if (s.qRole)      setQRole(s.qRole);
      if (s.qGroupId)   setQGroupId(s.qGroupId);
      if (s.qGroupName) setQGroupName(s.qGroupName);
      if (s.qMyName)    setQMyName(s.qMyName);
      if (s.qMyId)      setQMyId(s.qMyId);
      if (s.qDistLocked) setQDistLocked(true);
    } catch(e) { localStorage.removeItem('ng_qumairi'); }
  }, []);

  // Firebase listeners
  useEffect(() => {
    if (!qRoom) return;
    const g = ref(db, `qrooms/${qRoom}/game`);
    const p = ref(db, `qrooms/${qRoom}/groups`);
    const a = ref(db, `qrooms/${qRoom}/attacks`);
    const m = ref(db, `qrooms/${qRoom}/members`);
    onValue(g, snap => setQGameState(snap.val()));
    onValue(p, snap => setQGroups(snap.val() || {}));
    onValue(a, snap => setQAttacks(snap.val() || {}));
    onValue(m, snap => setQMembers(snap.val() || {}));
    return () => { off(g); off(p); off(a); off(m); };
  }, [qRoom]);

  // Countdown
  const qTimerDeadline = qGameState?.timer?.deadline;
  useEffect(() => {
    if (!qTimerDeadline) { setQCountdown(null); return; }
    const dl = qTimerDeadline;
    const tick = () => {
      const rem = Math.ceil((dl - Date.now()) / 1000);
      if (rem <= 0) setQCountdown(0);
      else {
        setQCountdown(rem);
        if (rem <= 3) playSound('countdown_last');
        else if (rem <= 10) playSound('countdown');
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [qTimerDeadline]);

  // Auto-navigate by phase
  useEffect(() => {
    if (!qRoom || !qGameState) return;
    const ph = qGameState.phase;
    if (ph === 'lobby' || ph === 'distributing') setGameScreen('qumairi_lobby');
    else if (ph === 'playing') setGameScreen('qumairi_play');
    else if (ph === 'ended')   setGameScreen('qumairi_results');
  }, [qGameState?.phase, qRoom]);

  // Dramatic reveal
  useEffect(() => {
    if (!qGameState?.showResult) { setQReveal(null); return; }
    if (!qGameState?.lastResult) return;
    const lr = qGameState.lastResult;
    if (lastResultRef.current === lr.timestamp) return;
    lastResultRef.current = lr.timestamp;
    setQReveal({ phase: 'suspense', tree: lr.tree, weapon: lr.weaponName, attackerName: lr.attackerName, targetName: lr.targetName, poisonMsg: lr.poisonMsg });
    setTimeout(() => {
      if (lr.weapon === 'showzel') playSound('explosion');
      else if (lr.weapon === 'omsagma') playSound('suspense');
      else playSound('countdown_last');
      setQReveal(prev => prev ? { ...prev, phase: 'weapon' } : null);
    }, 2000);
    setTimeout(() => {
      if (lr.result === 'success' && lr.hunted > 0) {
        playSound('applause');
        setQReveal(prev => prev ? { ...prev, phase: 'result', type: 'success', hunted: lr.hunted } : null);
      } else if (lr.result === 'success' && lr.hunted === 0) {
        setQReveal(prev => prev ? { ...prev, phase: 'result', type: 'empty' } : null);
      } else {
        setQReveal(prev => prev ? { ...prev, phase: 'result', type: 'fail' } : null);
      }
    }, 3500);
  }, [qGameState?.lastResult, qGameState?.showResult]);

  // Turn overlay
  useEffect(() => {
    if (!qGameState?.currentAttack) { setQTurnOverlay(null); return; }
    const ca = qGameState.currentAttack;
    setQTurnOverlay({ groupName: ca.attackerName, weapon: ca.weaponName });
  }, [qGameState?.currentAttack]);

  // Derived
  const qGList         = Object.entries(qGroups).map(([id, g]) => ({ ...g, id }));
  const qMList         = Object.entries(qMembers).map(([id, m]) => ({ ...m, id }));
  const qMyGroup       = qGList.find(g => g.id === qGroupId);
  const qOtherGroups   = qGList.filter(g => g.id !== qGroupId);
  const qPhase         = qGameState?.phase || 'lobby';
  const qCurrentAttack = qGameState?.currentAttack;
  const qTimer         = qGameState?.timer;
  const isLeader       = qRole === 'leader';
  const isAdminRole    = qRole === 'admin';

  // ── HOME ──
  if (gameScreen === 'home') return (
    <div className="scr">
      <button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={onBack}>← ساحة الألعاب</button>
      <div style={{textAlign:'center',padding:'10px 0 12px'}}>
        <div style={{fontSize:46,marginBottom:6}}>🦅</div>
        <div className="ptitle" style={{fontSize:22}}>صيد القميري</div>
        <div className="psub">وزّع قمائرك • هاجم الأشجار • احمِ مجموعتك</div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <button className="btn bg" onClick={() => setGameScreen('qumairi_admin')}>👑 إنشاء غرفة كمسؤول</button>
        <button className="btn bo" onClick={() => setGameScreen('qumairi_join')}>🎮 انضمام كمجموعة برمز الغرفة</button>
      </div>
      <div className="div">نظرة سريعة</div>
      {['🦅 100 قميري لكل مجموعة توزّع على 11 شجرة','⚔️ ثلاثة أسلحة: شوزل، أم صتمة، نبيطة','🌳 اهجم أشجار الخصوم واصطد قميريهم','🏆 أكثر مجموعة بقي لها قميري تفوز','🔒 لا أحد يعرف توزيع مجموعتك السري'].map((r,i)=>(
        <div key={i} style={{padding:'7px 11px',marginBottom:4,background:'#0f0f22',borderRadius:8,fontSize:12,color:'var(--muted)',border:'1px solid rgba(255,255,255,.04)'}}>{r}</div>
      ))}
    </div>
  );

  // ── ADMIN CREATE ──
  if (gameScreen === 'qumairi_admin') return (
    <div className="scr">
      <button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={() => setGameScreen('home')}>← رجوع</button>
      <div style={{textAlign:'center',padding:'10px 0'}}><div style={{fontSize:46}}>🦅</div></div>
      <div className="ptitle">إنشاء غرفة — صيد القميري</div>
      <div className="psub">أنت المشرف</div>
      <button className="btn bg" onClick={async () => {
        const code = genCode();
        setQRoom(code); setQRole('admin');
        await set(ref(db, `qrooms/${code}`), { game:{phase:'lobby',createdAt:Date.now()}, groups:{}, members:{}, attacks:{} });
        localStorage.setItem('ng_qumairi', JSON.stringify({ qRoom:code, qRole:'admin' }));
        setGameScreen('qumairi_lobby');
        notify(`✅ الغرفة: ${code}`, 'gold');
      }}>🏟️ إنشاء الغرفة</button>
    </div>
  );

  // ── JOIN ──
  if (gameScreen === 'qumairi_join') return (
    <div className="scr">
      <button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={() => setGameScreen('home')}>← رجوع</button>
      <div style={{textAlign:'center',padding:'10px 0'}}><div style={{fontSize:46}}>🦅</div></div>
      <div className="ptitle">انضمام — صيد القميري</div>
      <div className="card">
        <div className="ig"><label className="lbl">🔢 رمز الغرفة</label>
          <input className="inp big" placeholder="× × × × × ×" maxLength={6} value={qJoinInput}
            onChange={e=>{setQJoinInput(e.target.value.replace(/\D/g,''));setQJoinErr('');}}/>
        </div>
        <div className="ig"><label className="lbl">👤 اسمك</label>
          <input className="inp" placeholder="محمد" value={qMyName} onChange={e=>setQMyName(e.target.value)}/>
        </div>
        {qJoinErr && <div className="err-msg">⚠️ {qJoinErr}</div>}
        <button className="btn bg mt2" disabled={qJoinLoading} onClick={async()=>{
          if(qJoinLoading) return;
          if(qJoinInput.length!==6){setQJoinErr('الرمز 6 أرقام');return;}
          if(!qMyName.trim()){setQJoinErr('أدخل اسمك');return;}
          setQJoinLoading(true);
          try {
            const snap = await get(ref(db,`qrooms/${qJoinInput}`));
            if(!snap.exists()){setQJoinErr('الغرفة غير موجودة');return;}
            const data = snap.val();
            if(data.game?.phase!=='lobby'){setQJoinErr('اللعبة بدأت');return;}
            const mRef = push(ref(db,`qrooms/${qJoinInput}/members`));
            await set(mRef,{name:qMyName.trim(),groupId:null,role:'member',joinedAt:Date.now()});
            setQMyId(mRef.key); setQRoom(qJoinInput); setQRole('member');
            localStorage.setItem('ng_qumairi',JSON.stringify({qRoom:qJoinInput,qRole:'member',qMyName:qMyName.trim(),qMyId:mRef.key}));
            setGameScreen('qumairi_lobby');
            notify('✅ انضممت','success');
          } catch(e){setQJoinErr('خطأ');}
          finally{setQJoinLoading(false);}
        }}>{qJoinLoading?'⏳':'🚀 انضمام'}</button>
      </div>
    </div>
  );

  // ── LOBBY ──
  if (gameScreen === 'qumairi_lobby') {
    const unassigned = qMList.filter(m => !m.groupId);
    const myMD       = qMList.find(m => m.id === qMyId);
    if (myMD && qRole !== 'admin') {
      if (myMD.role === 'leader' && qRole !== 'leader') { setQRole('leader'); qSave({qRole:'leader'}); }
      if (myMD.groupId && myMD.groupId !== qGroupId) {
        setQGroupId(myMD.groupId);
        const grp = qGList.find(g => g.id === myMD.groupId);
        if (grp) setQGroupName(grp.name);
        qSave({qGroupId: myMD.groupId});
      }
    }
    return (
      <div className="scr">
        <button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={()=>{setGameScreen('home');localStorage.removeItem('ng_qumairi');setQRoom('');setQRole(null);setQGroupId(null);}}>← رجوع</button>
        <div className="ptitle" style={{fontSize:18}}>🦅 صيد القميري</div>
        <div className="card" style={{textAlign:'center'}}>
          <div style={{fontSize:12,color:'var(--muted)'}}>رمز الغرفة</div>
          <div className="room-code-big" style={{fontSize:28}}>{qRoom}</div>
          <button className="btn bo bxs" style={{width:'auto',margin:'6px auto 0'}} onClick={()=>{navigator.clipboard?.writeText(qRoom);notify('تم النسخ','success');}}>📋 نسخ</button>
        </div>

        {/* ADMIN SECTION */}
        {isAdminRole && <>
          <div className="card">
            <div className="ctitle">➕ إنشاء مجموعة</div>
            <div style={{display:'flex',gap:6}}>
              <input className="inp" placeholder="اسم المجموعة" value={qGroupName} onChange={e=>setQGroupName(e.target.value)} style={{flex:1}}/>
              <button className="btn bg bsm" onClick={async()=>{
                if(!qGroupName.trim()||qGList.length>=6) return;
                const initW={};
                Q_WEAPONS.forEach(w=>{initW[w.id]=w.qty;});
                const nRef=push(ref(db,`qrooms/${qRoom}/groups`));
                await set(nRef,{name:qGroupName.trim(),trees:{},weapons:initW,totalRemaining:Q_TOTAL,distributed:false,shieldUsed:false});
                setQGroupName('');notify('✅','success');
              }}>➕</button>
            </div>
          </div>

          <div className="card">
            <div className="ctitle">👥 المجموعات ({qGList.length})</div>
            {qGList.map(g=>{
              const members=qMList.filter(m=>m.groupId===g.id);
              const leader=members.find(m=>m.role==='leader');
              return(
                <div key={g.id} style={{marginBottom:10,padding:10,background:'#09091e',borderRadius:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontWeight:900,color:'var(--gold)'}}>{g.name}</span>
                    <span style={{fontSize:10,color:'var(--muted)'}}>{members.length} عضو{leader?` · 👑 ${leader.name}`:''}</span>
                  </div>
                  {members.map(m=>(
                    <div key={m.id} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 0',fontSize:12}}>
                      <span>{m.role==='leader'?'👑':'👤'}</span>
                      <span style={{flex:1}}>{m.name}</span>
                      {m.role!=='leader'&&<button className="btn bg bxs" onClick={async()=>{
                        const updates={};
                        members.forEach(mm=>{if(mm.role==='leader')updates[`qrooms/${qRoom}/members/${mm.id}/role`]='member';});
                        updates[`qrooms/${qRoom}/members/${m.id}/role`]='leader';
                        await update(ref(db),updates);
                      }}>👑</button>}
                    </div>
                  ))}
                </div>
              );
            })}
            {unassigned.length>0&&<>
              <div style={{fontSize:11,color:'var(--red)',fontWeight:700,marginTop:10,marginBottom:6}}>⏳ بدون مجموعة ({unassigned.length})</div>
              {unassigned.map(m=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 0',fontSize:12}}>
                  <span>👤 {m.name}</span>
                  <div style={{display:'flex',gap:3}}>
                    {qGList.map(g=>(
                      <button key={g.id} className="btn bg bxs" style={{fontSize:9}} onClick={async()=>{
                        await update(ref(db,`qrooms/${qRoom}/members/${m.id}`),{groupId:g.id});
                      }}>{g.name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </>}
          </div>

          {qPhase==='lobby'&&<button className="btn bg" disabled={qGList.length<2} onClick={async()=>{
            await update(ref(db,`qrooms/${qRoom}/game`),{phase:'distributing'});
            notify('🌳 بدء التوزيع','gold');
          }}>🌳 بدء التوزيع</button>}

          {qPhase==='distributing'&&(()=>{
            const allDist=qGList.length>=2&&qGList.every(g=>g.distributed);
            return allDist
              ?<button className="btn bg" onClick={async()=>{
                  await update(ref(db,`qrooms/${qRoom}/game`),{phase:'playing',round:1,currentAttack:null,timer:null,turnGroup:qGList[0]?.id});
                  notify('⚔️ اللعبة بدأت','gold');
                }}>⚔️ بدء اللعبة</button>
              :<div style={{textAlign:'center',color:'var(--muted)',fontSize:12,padding:10}}>⏳ انتظار التوزيع من المجموعات</div>;
          })()}
        </>}

        {/* NON-ADMIN distributing */}
        {!isAdminRole&&qPhase==='distributing'&&(()=>{
          if(!qGroupId||!qMyGroup) return(
            <div className="card" style={{textAlign:'center',padding:20}}>
              <div style={{fontSize:40}}>⏳</div>
              <div style={{fontSize:14,color:'var(--muted)',marginTop:8}}>انتظر المشرف يحدد مجموعتك</div>
            </div>
          );
          if(qMyGroup.distributed) return(
            <div className="card" style={{textAlign:'center',padding:20}}>
              <div style={{fontSize:40}}>✅</div>
              <div style={{fontSize:15,fontWeight:900,color:'var(--green)',marginTop:8}}>تم التوزيع — انتظار الباقين</div>
            </div>
          );
          if(!isLeader) return(
            <div className="card" style={{textAlign:'center',padding:20}}>
              <div style={{fontSize:40}}>⏳</div>
              <div style={{fontSize:14,color:'var(--muted)',marginTop:8}}>القائد 👑 يوزع — انتظر</div>
            </div>
          );
          const total=Object.values(qDistribution).reduce((s,v)=>s+(parseInt(v)||0),0);
          const remaining=Q_TOTAL-total;
          return(
            <div className="card">
              <div className="ctitle">🌳 وزّع {Q_TOTAL} قميري على الأشجار</div>
              <div style={{textAlign:'center',marginBottom:12}}>
                <div style={{fontFamily:'Cairo',fontSize:32,fontWeight:900,color:remaining===0?'var(--green)':remaining<0?'var(--red)':'var(--gold)'}}>{remaining}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>متبقي للتوزيع</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {Q_TREES.map(tree=>(
                  <div key={tree} style={{background:'#09091e',borderRadius:10,padding:'10px 8px',textAlign:'center'}}>
                    <div style={{fontSize:22}}>🌳</div>
                    <div style={{fontSize:11,fontWeight:700,marginTop:2}}>{tree}</div>
                    <input type="number" min="0" max="100" className="inp"
                      style={{marginTop:6,padding:'6px',fontSize:16,textAlign:'center',width:'100%'}}
                      value={qDistribution[tree]||''} placeholder="0"
                      onChange={e=>setQDistribution(prev=>({...prev,[tree]:e.target.value}))}/>
                  </div>
                ))}
              </div>
              <button className="btn bg mt3" disabled={remaining!==0} onClick={async()=>{
                const trees={};
                Q_TREES.forEach(t=>{trees[t]=parseInt(qDistribution[t])||0;});
                await update(ref(db,`qrooms/${qRoom}/groups/${qGroupId}`),{trees,distributed:true,totalRemaining:Q_TOTAL});
                notify('✅ تم التوزيع السري','success');
              }}>{remaining===0?'✅ تأكيد التوزيع':`وزّع ${Math.abs(remaining)} متبقياً`}</button>
            </div>
          );
        })()}

        {!isAdminRole&&qPhase==='lobby'&&(
          <div className="card" style={{textAlign:'center',padding:20}}>
            <div style={{fontSize:40}}>⏳</div>
            <div style={{fontSize:14,color:'var(--muted)',marginTop:8}}>
              {qGroupId?`مجموعتك: ${qMyGroup?.name||'—'}`:'انتظر المشرف يحدد مجموعتك'}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PLAY SCREEN ──
  if (gameScreen === 'qumairi_play') {
    const myAtks = Object.values(qAttacks||{}).filter(a=>a.attackerId===qGroupId||a.targetId===qGroupId).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));

    // ADMIN PLAY
    if (isAdminRole) {
      const turnGroupId = qGameState?.turnGroup;
      return (
        <div className="scr">
          {/* Reveal overlay */}
          {qReveal&&qReveal.phase==='result'&&(
            <div className={`q-reveal q-reveal-bg-${qReveal.type}`}>
              <div className="q-scene">
                {qReveal.type==='success'&&<>
                  <div className="q-tree-big">🌳</div>
                  <div className="q-birds">
                    {Array.from({length:Math.min(qReveal.hunted||0,20)}).map((_,i)=>(
                      <span key={i} className="q-bird" style={{'--br':`${(Math.random()-.5)*40}deg`,animationDelay:`${i*.1}s`}}>🐦</span>
                    ))}
                  </div>
                  <div className="q-num" style={{color:'var(--green)'}}>-{qReveal.hunted}</div>
                  <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--gold)'}}>🎯 {qReveal.hunted} قميري</div>
                </>}
                {qReveal.type==='empty'&&<>
                  <div className="q-empty-face">😂</div>
                  <div style={{fontFamily:'Cairo',fontSize:20,fontWeight:900,color:'var(--gold)',marginTop:10}}>الشجرة فاضية</div>
                </>}
                {qReveal.type==='fail'&&<>
                  <div style={{fontSize:60}}>💨</div>
                  <div style={{fontFamily:'Cairo',fontSize:20,fontWeight:900,color:'var(--red)',marginTop:8}}>إجابة خاطئة</div>
                </>}
                {qReveal.poisonMsg&&<div style={{marginTop:10,padding:'8px 14px',background:'rgba(155,89,182,.2)',border:'1px solid rgba(155,89,182,.5)',borderRadius:8,fontSize:13,color:'var(--purple)',fontWeight:700}}>{qReveal.poisonMsg}</div>}
              </div>
              <button className="btn bg mt3" style={{width:'auto',padding:'10px 30px'}} onClick={()=>{
                setQReveal(null);
                update(ref(db,`qrooms/${qRoom}/game`),{lastResult:null,showResult:false});
              }}>▶️ متابعة</button>
            </div>
          )}

          <div className="ptitle" style={{fontSize:18}}>👑 لوحة المشرف</div>

          {/* Mode + turn selector */}
          {!qCurrentAttack&&!qReveal&&<div className="card">
            <div style={{display:'flex',gap:5,marginBottom:8}}>
              {[['sequential','📋 تسلسلي'],['speed','⚡ سرعة'],['challenge','🏁 تحدي']].map(([mode,label])=>(
                <button key={mode} className={`btn ${qGameState?.playMode===mode?'bg':'bgh'} bxs`} style={{flex:1}}
                  onClick={async()=>await update(ref(db,`qrooms/${qRoom}/game`),{playMode:mode})}>{label}</button>
              ))}
            </div>
            <div className="ctitle" style={{margin:0}}>⚔️ من يهاجم؟</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {qGList.map(g=>(
                <button key={g.id} className={`btn ${turnGroupId===g.id?'bg':'bgh'}`} style={{flex:1,minWidth:'30%',padding:'8px'}}
                  onClick={async()=>await update(ref(db,`qrooms/${qRoom}/game`),{turnGroup:g.id})}>
                  <div style={{fontSize:13,fontWeight:900}}>{g.name}</div>
                  <div style={{fontSize:9,opacity:.7}}>{g.totalRemaining||0} 🐦</div>
                </button>
              ))}
            </div>
          </div>}

          {/* Active attack */}
          {qCurrentAttack&&<div className="card" style={{background:'rgba(230,57,80,.08)',border:'1px solid rgba(230,57,80,.3)'}}>
            <div className="ctitle" style={{color:'var(--red)'}}>⚔️ هجوم جاري</div>
            <div style={{fontSize:13,marginBottom:8}}>
              <strong style={{color:'var(--gold)'}}>{qCurrentAttack.attackerName}</strong>
              {' → '}
              <strong style={{color:'var(--red)'}}>{qCurrentAttack.targetName}</strong>
              {' / 🌳 '}{qCurrentAttack.tree}
              {' / '}{qCurrentAttack.weaponName}
            </div>
            {/* Weapon difficulty hint */}
            <div style={{background:'rgba(240,192,64,.06)',border:'1px solid rgba(240,192,64,.2)',borderRadius:8,padding:'6px 10px',fontSize:11,color:'var(--muted)',marginBottom:8}}>
              📝 السلاح: <strong style={{color:'var(--gold)'}}>{qCurrentAttack.weaponName}</strong>
              {' — صعوبة: '}{Q_WEAPONS.find(w=>w.id===qCurrentAttack.weapon)?.diff||'—'}
              {' — قوة: '}{Q_WEAPONS.find(w=>w.id===qCurrentAttack.weapon)?.power||0} نقطة
            </div>
            {!qTimer&&<>
              <div style={{display:'flex',gap:4,marginBottom:6}}>
                {[15,30,45,60].map(s=>(
                  <button key={s} className="btn bg bsm" style={{flex:1}}
                    onClick={async()=>{await update(ref(db,`qrooms/${qRoom}/game`),{timer:{deadline:Date.now()+s*1000}});playSound('suspense');}}>
                    {s}ث
                  </button>
                ))}
              </div>
              <div style={{display:'flex',gap:4}}>
                <input type="number" className="inp" style={{flex:1,padding:'5px',textAlign:'center',fontSize:13}} placeholder="مخصص ثانية" value={qCustomTimer} onChange={e=>setQCustomTimer(e.target.value)}/>
                <button className="btn bg bsm" onClick={async()=>{
                  const s=parseInt(qCustomTimer)||30;
                  await update(ref(db,`qrooms/${qRoom}/game`),{timer:{deadline:Date.now()+s*1000}});
                  setQCustomTimer('');playSound('suspense');
                }}>⏱️</button>
              </div>
            </>}
            {qTimer&&<>
              <div style={{textAlign:'center',marginBottom:8}}>
                <div className="q-timer-huge">{qCountdown!==null?(qCountdown>0?qCountdown:'⏰'):'...'}</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn bv" style={{flex:1}} onClick={async()=>{
                  const atk=qCurrentAttack;
                  const tg=qGList.find(g=>g.id===atk.targetId);
                  const u={};
                  if(tg?.shield===atk.tree){
                    u[`qrooms/${qRoom}/groups/${atk.attackerId}/weapons/${atk.weapon}`]=(qGroups[atk.attackerId]?.weapons?.[atk.weapon]||1)-1;
                    u[`qrooms/${qRoom}/groups/${atk.targetId}/shield`]=null;
                    const lr=push(ref(db,`qrooms/${qRoom}/attacks`));
                    u[`qrooms/${qRoom}/attacks/${lr.key}`]={...atk,result:'shielded',hunted:0,timestamp:Date.now()};
                    u[`qrooms/${qRoom}/game/currentAttack`]=null;
                    u[`qrooms/${qRoom}/game/timer`]=null;
                    u[`qrooms/${qRoom}/game/lastResult`]={...atk,result:'success',hunted:0,msg:'🛡️ الدرع صد الهجوم',timestamp:Date.now()};
                    u[`qrooms/${qRoom}/game/showResult`]=true;
                    await update(ref(db),u);return;
                  }
                  const treeCount=tg?.trees?.[atk.tree]||0;
                  const wp=Q_WEAPONS.find(w=>w.id===atk.weapon)?.power||0;
                  const hunted=Math.min(treeCount,wp);
                  u[`qrooms/${qRoom}/groups/${atk.targetId}/trees/${atk.tree}`]=treeCount-hunted;
                  u[`qrooms/${qRoom}/groups/${atk.targetId}/totalRemaining`]=(tg?.totalRemaining||0)-hunted;
                  u[`qrooms/${qRoom}/groups/${atk.attackerId}/weapons/${atk.weapon}`]=(qGroups[atk.attackerId]?.weapons?.[atk.weapon]||1)-1;
                  let poisonMsg=null;
                  if(qGameState?.cursedTree===atk.tree){
                    const atkW={...(qGroups[atk.attackerId]?.weapons||{})};
                    atkW[atk.weapon]=(atkW[atk.weapon]||0)-1;
                    const order=['showzel','omsagma','nabeeta'];
                    let deducted=null;
                    for(let wi=order.indexOf(atk.weapon);wi<order.length;wi++){
                      if((atkW[order[wi]]||0)>0){
                        u[`qrooms/${qRoom}/groups/${atk.attackerId}/weapons/${order[wi]}`]=atkW[order[wi]]-1;
                        deducted=Q_WEAPONS.find(w=>w.id===order[wi])?.name;break;
                      }
                    }
                    poisonMsg=deducted?`☠️ الشجرة المسمومة — خسرت ${deducted} إضافي`:'☠️ الشجرة المسمومة';
                  }
                  const ts=Date.now();
                  const lr=push(ref(db,`qrooms/${qRoom}/attacks`));
                  u[`qrooms/${qRoom}/attacks/${lr.key}`]={...atk,result:'success',hunted,timestamp:ts};
                  u[`qrooms/${qRoom}/game/currentAttack`]=null;
                  u[`qrooms/${qRoom}/game/timer`]=null;
                  u[`qrooms/${qRoom}/game/lastResult`]={...atk,result:'success',hunted,msg:hunted>0?`🎯 ${hunted} قميري`:'🌳 الشجرة فارغة',poisonMsg,timestamp:ts};
                  u[`qrooms/${qRoom}/game/showResult`]=true;
                  await update(ref(db),u);playSound('explosion');
                }}>✅ صح</button>
                <button className="btn br" style={{flex:1}} onClick={async()=>{
                  const atk=qCurrentAttack;const u={};
                  u[`qrooms/${qRoom}/groups/${atk.attackerId}/weapons/${atk.weapon}`]=(qGroups[atk.attackerId]?.weapons?.[atk.weapon]||1)-1;
                  const lr=push(ref(db,`qrooms/${qRoom}/attacks`));
                  u[`qrooms/${qRoom}/attacks/${lr.key}`]={...atk,result:'fail',hunted:0,timestamp:Date.now()};
                  u[`qrooms/${qRoom}/game/currentAttack`]=null;
                  u[`qrooms/${qRoom}/game/timer`]=null;
                  u[`qrooms/${qRoom}/game/lastResult`]={...atk,result:'fail',hunted:0,msg:'❌ إجابة خاطئة',timestamp:Date.now()};
                  u[`qrooms/${qRoom}/game/showResult`]=true;
                  await update(ref(db),u);playSound('countdown_last');
                }}>❌ خطأ</button>
              </div>
            </>}
          </div>}

          {/* Tools */}
          <div className="card">
            <div className="ctitle">🎲 أدوات المشرف</div>
            <div style={{marginBottom:8}}>
              <div style={{fontSize:11,color:'var(--purple)',marginBottom:4}}>☠️ الشجرة المسمومة</div>
              <select className="inp" style={{fontSize:12}} value={qGameState?.cursedTree||''} onChange={async e=>{await update(ref(db,`qrooms/${qRoom}/game`),{cursedTree:e.target.value||null});}}>
                <option value="">بدون</option>
                {Q_TREES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button className={`btn ${qGameState?.sandstorm?'bb':'bgh'} bsm`} onClick={async()=>await update(ref(db,`qrooms/${qRoom}/game`),{sandstorm:!qGameState?.sandstorm})}>
              🌪️ {qGameState?.sandstorm?'إيقاف':'تفعيل'} العاصفة الرملية
            </button>
          </div>

          {/* Groups stats */}
          <div className="card">
            <div className="ctitle">📊 إحصائيات المجموعات</div>
            {qGList.map(g=>(
              <div key={g.id} style={{marginBottom:8,padding:8,background:'#09091e',borderRadius:8}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontWeight:700,color:'var(--gold)'}}>{g.name}</span>
                  <span style={{color:'var(--green)',fontWeight:900}}>{g.totalRemaining||0} 🐦</span>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:3,marginTop:4}}>
                  {Q_TREES.map(t=>(
                    <span key={t} style={{fontSize:9,padding:'1px 4px',borderRadius:4,background:g.trees?.[t]>0?'rgba(46,204,113,.1)':'rgba(255,255,255,.03)',color:g.trees?.[t]>0?'var(--green)':'var(--dim)'}}>
                      {t}:{g.trees?.[t]||0}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Attack log */}
          <div className="card">
            <div className="ctitle">📜 سجل المعركة</div>
            <div className="sc" style={{maxHeight:200}}>
              {Object.values(qAttacks||{}).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)).map((a,i)=>(
                <div key={i} className="feed-item" style={{borderColor:a.result==='success'?'var(--green)':'var(--red)',fontSize:11}}>
                  <strong style={{color:'var(--gold)'}}>{a.attackerName}</strong> → <strong style={{color:'var(--red)'}}>{a.targetName}</strong> / {a.tree} — {a.result==='success'?`🎯 ${a.hunted}`:'❌ فشل'}
                </div>
              ))}
            </div>
          </div>

          {/* End + Report */}
          <button className="btn br mt2" onClick={async()=>{await update(ref(db,`qrooms/${qRoom}/game`),{phase:'ended'});playSound('applause');}}>🏆 إنهاء اللعبة</button>
          <button className="btn bgh mt2" onClick={()=>{
            const lines=['='.repeat(40),'    تقرير صيد القميري','='.repeat(40),`غرفة: #${qRoom}`,''];
            [...qGList].sort((a,b)=>(b.totalRemaining||0)-(a.totalRemaining||0)).forEach((g,i)=>{
              lines.push(`${i===0?'👑':(i+1)+'.'} ${g.name} — ${g.totalRemaining||0} قميري`);
            });
            lines.push('');
            Object.values(qAttacks||{}).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0)).forEach(a=>{
              lines.push(`${a.attackerName} → ${a.targetName} / ${a.tree} — ${a.result==='success'?a.hunted+' 🎯':'❌'}`);
            });
            const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});
            const url=URL.createObjectURL(blob);
            const el=document.createElement('a');el.href=url;el.download=`تقرير-القميري-${qRoom}.txt`;
            document.body.appendChild(el);el.click();document.body.removeChild(el);URL.revokeObjectURL(url);
            notify('✅ تم','success');
          }}>📄 تحميل التقرير</button>
        </div>
      );
    }

    // LEADER / MEMBER PLAY
    return (
      <div className="scr">
        {/* Reveal overlay for all */}
        {qReveal&&(
          <div className={`q-reveal ${qReveal.phase==='result'?`q-reveal-bg-${qReveal.type}`:'q-reveal-bg-pending'}`}>
            <div className="q-scene">
              {qReveal.phase==='suspense'&&<>
                <div className="q-tree-big">🌳</div>
                <div style={{fontFamily:'Cairo',fontSize:16,color:'var(--gold)',marginTop:10}}>شجرة {qReveal.tree}</div>
                <div style={{fontFamily:'Cairo',fontSize:18,color:'var(--muted)',marginTop:20}}>... حبس الأنفاس ...</div>
              </>}
              {qReveal.phase==='weapon'&&<>
                <div className="q-shake"><div className="q-tree-big">🌳</div></div>
                <div style={{fontSize:40,marginTop:12}}>{qReveal.weapon==='شوزل'?'💥':qReveal.weapon==='أم صتمة'?'🎯':'🪃'}</div>
              </>}
              {qReveal.phase==='result'&&qReveal.type==='success'&&<>
                <div className="q-tree-big">🌳</div>
                <div className="q-birds">
                  {Array.from({length:Math.min(qReveal.hunted||0,30)}).map((_,i)=>(
                    <span key={i} className="q-bird" style={{'--br':`${(Math.random()-.5)*40}deg`,animationDelay:`${i*.1}s`}}>🐦</span>
                  ))}
                </div>
                <div className="q-num" style={{color:'var(--green)'}}>-{qReveal.hunted}</div>
                <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--gold)'}}>تم اصطياد {qReveal.hunted} قميري</div>
                <div style={{marginTop:8,padding:'8px 14px',background:'rgba(255,255,255,.05)',borderRadius:8,fontSize:12}}>
                  <div style={{color:'var(--gold)'}}>{qReveal.attackerName} → {qReveal.targetName}</div>
                </div>
                {qReveal.poisonMsg&&<div style={{marginTop:8,padding:'8px 14px',background:'rgba(155,89,182,.2)',border:'1px solid rgba(155,89,182,.5)',borderRadius:8,fontSize:13,color:'var(--purple)',fontWeight:700}}>{qReveal.poisonMsg}</div>}
              </>}
              {qReveal.phase==='result'&&qReveal.type==='empty'&&<>
                <div className="q-empty-face">😂</div>
                <div style={{fontFamily:'Cairo',fontSize:22,fontWeight:900,color:'var(--gold)',marginTop:12}}>الشجرة فاضية</div>
              </>}
              {qReveal.phase==='result'&&qReveal.type==='fail'&&<>
                <div style={{fontSize:60}}>💨</div>
                <div style={{fontFamily:'Cairo',fontSize:22,fontWeight:900,color:'var(--red)',marginTop:8}}>إجابة خاطئة</div>
              </>}
            </div>
          </div>
        )}

        {/* Turn overlay */}
        {qTurnOverlay&&!qReveal&&qCurrentAttack&&!qTimer&&(
          <div className="q-turn-overlay">
            <div style={{fontSize:70,animation:'treeBounce 1s ease infinite'}}>⚔️</div>
            <div style={{fontFamily:'Cairo',fontSize:24,fontWeight:900,color:'var(--gold)',marginTop:12}}>{qTurnOverlay.groupName}</div>
            <div style={{fontSize:14,color:'var(--muted)',marginTop:6}}>اختاروا هدفهم بسلاح {qTurnOverlay.weapon}</div>
          </div>
        )}

        {/* Timer overlay */}
        {qTimer&&!qReveal&&qCountdown!==null&&(
          <div className="q-turn-overlay">
            <div className="q-timer-huge">{qCountdown>0?qCountdown:'⏰'}</div>
            <div style={{fontSize:14,color:'var(--gold)',marginTop:8}}>{qCurrentAttack?.attackerName} يهاجم {qCurrentAttack?.targetName}</div>
          </div>
        )}

        {/* Group header */}
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
          <div style={{fontSize:15,fontWeight:900,color:'var(--gold)'}}>{qMyGroup?.name||'—'} {isLeader?'👑':''}</div>
          <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--green)'}}>{qMyGroup?.totalRemaining||0} 🐦</div>
        </div>

        {/* Announcement */}
        {qGameState?.announcement&&(Date.now()-qGameState.announcement.timestamp<10000)&&(
          <div className="ann ag" style={{marginBottom:8}}><div style={{fontSize:13,fontWeight:700}}>{qGameState.announcement.msg}</div></div>
        )}

        {/* Current attack display */}
        {qCurrentAttack&&<div className="card" style={{background:qCurrentAttack.targetId===qGroupId?'rgba(230,57,80,.12)':'rgba(230,57,80,.06)',border:`1.5px solid ${qCurrentAttack.targetId===qGroupId?'rgba(230,57,80,.5)':'rgba(230,57,80,.2)'}`}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--red)',marginBottom:4}}>⚔️ هجوم</div>
          <div style={{fontSize:12}}>
            <strong style={{color:'var(--gold)'}}>{qCurrentAttack.attackerName}</strong> يهاجم <strong style={{color:'var(--red)'}}>{qCurrentAttack.targetName}</strong>
          </div>
          {qCurrentAttack.targetId===qGroupId&&!qMyGroup?.shieldUsed&&isLeader&&(
            <div style={{marginTop:8,padding:'10px',background:'rgba(155,89,182,.1)',border:'1.5px solid rgba(155,89,182,.4)',borderRadius:8}}>
              <div style={{fontSize:13,fontWeight:900,color:'var(--red)',marginBottom:6}}>⚠️ أنت تتعرض للهجوم!</div>
              <button className="btn bp bsm" onClick={async()=>{
                const tree=qCurrentAttack.tree;
                await update(ref(db,`qrooms/${qRoom}/groups/${qGroupId}`),{shield:tree,shieldUsed:true});
                await update(ref(db,`qrooms/${qRoom}/game`),{announcement:{msg:`🛡️ ${qMyGroup?.name} استخدمت الدرع`,timestamp:Date.now()}});
                notify('🛡️ تم تفعيل الدرع','success');
              }}>🛡️ تفعيل الدرع</button>
            </div>
          )}
        </div>}

        {/* Weapons display */}
        <div className="card">
          <div className="ctitle">🔫 أسلحتنا</div>
          <div style={{display:'flex',gap:6}}>
            {Q_WEAPONS.map(w=>(
              <div key={w.id} style={{flex:1,textAlign:'center',padding:8,background:'#09091e',borderRadius:8}}>
                <div style={{fontSize:18}}>{w.icon}</div>
                <div style={{fontSize:10,fontWeight:700}}>{w.name}</div>
                <div style={{fontFamily:'Cairo',fontSize:16,fontWeight:900,color:qMyGroup?.weapons?.[w.id]>0?'var(--gold)':'var(--red)'}}>{qMyGroup?.weapons?.[w.id]||0}</div>
              </div>
            ))}
          </div>
        </div>

        {/* LEADER attack panel */}
        {isLeader&&!qCurrentAttack&&qGameState?.turnGroup===qGroupId&&(
          <div className="card" style={{background:'linear-gradient(135deg,rgba(230,57,80,.08),rgba(200,40,60,.04))',border:'1.5px solid rgba(230,57,80,.3)'}}>
            <div style={{textAlign:'center',marginBottom:10}}>
              <div style={{fontSize:36}}>⚔️</div>
              <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--red)'}}>دورك — شن هجوم!</div>
            </div>
            <div className="ig">
              <label className="lbl">🎯 المجموعة المستهدفة</label>
              <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {qOtherGroups.map(g=>(
                  <button key={g.id} className={`btn ${qAttackTarget.group===g.id?'bg':'bgh'} bsm`}
                    onClick={()=>setQAttackTarget(p=>({...p,group:g.id,groupName:g.name}))}>
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
            {qAttackTarget.group&&!qGameState?.sandstorm&&(
              <div className="ig">
                <label className="lbl">🌳 الشجرة</label>
                <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                  {Q_TREES.map(t=>(
                    <button key={t} className={`btn ${qAttackTarget.tree===t?'bg':'bgh'} bxs`}
                      onClick={()=>setQAttackTarget(p=>({...p,tree:t}))}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {qAttackTarget.group&&qGameState?.sandstorm&&(
              <div style={{padding:8,background:'rgba(240,192,64,.08)',borderRadius:8,marginBottom:6,fontSize:12,color:'var(--gold)'}}>
                🌪️ العاصفة مفعّلة — الشجرة ستُختار عشوائياً
              </div>
            )}
            {qAttackTarget.group&&(
              <div className="ig">
                <label className="lbl">🔫 السلاح</label>
                <div style={{display:'flex',gap:5}}>
                  {Q_WEAPONS.filter(w=>(qMyGroup?.weapons?.[w.id]||0)>0).map(w=>(
                    <button key={w.id} className={`btn ${qAttackTarget.weapon===w.id?'bg':'bgh'} bsm`} style={{flex:1}}
                      onClick={()=>setQAttackTarget(p=>({...p,weapon:w.id,weaponName:w.name}))}>
                      {w.icon} {w.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {qAttackTarget.group&&qAttackTarget.weapon&&(qAttackTarget.tree||qGameState?.sandstorm)&&(
              <button className="btn br mt2" onClick={async()=>{
                const finalTree=qGameState?.sandstorm
                  ?Q_TREES[Math.floor(Math.random()*Q_TREES.length)]
                  :qAttackTarget.tree;
                await update(ref(db,`qrooms/${qRoom}/game`),{
                  currentAttack:{
                    attackerId:qGroupId, attackerName:qMyGroup?.name,
                    targetId:qAttackTarget.group, targetName:qAttackTarget.groupName,
                    tree:finalTree, weapon:qAttackTarget.weapon, weaponName:qAttackTarget.weaponName,
                    time:Date.now()
                  }
                });
                setQAttackTarget({group:'',tree:'',weapon:''});
                notify('⚔️ تم إرسال الهجوم','gold');
              }}>⚔️ هاجم الآن</button>
            )}
          </div>
        )}

        {/* Waiting for turn */}
        {isLeader&&!qCurrentAttack&&qGameState?.turnGroup!==qGroupId&&!qReveal&&(
          <div className="card" style={{textAlign:'center',padding:14}}>
            <div style={{fontSize:36}}>⏳</div>
            <div style={{fontSize:14,color:'var(--muted)',marginTop:6}}>ليس دورك — انتظر</div>
          </div>
        )}

        {/* My group log */}
        <div className="card">
          <div className="ctitle">📋 سجل مجموعتي</div>
          {myAtks.length===0
            ?<div style={{textAlign:'center',color:'var(--muted)',fontSize:12,padding:8}}>لا أحداث بعد</div>
            :myAtks.slice(0,15).map((a,i)=>(
              <div key={i} className="feed-item" style={{borderColor:a.attackerId===qGroupId?(a.result==='success'?'var(--green)':'var(--red)'):'var(--red)'}}>
                {a.attackerId===qGroupId
                  ?`${a.result==='success'?'🎯':'❌'} هاجمنا ${a.targetName} / ${a.tree} — ${a.result==='success'?`اصطدنا ${a.hunted}`:'فشل'}`
                  :`🛡️ هاجمتنا ${a.attackerName} وخسرنا ${a.hunted||0} قميري`
                }
              </div>
            ))
          }
        </div>
      </div>
    );
  }

  // ── RESULTS ──
  if (gameScreen === 'qumairi_results') {
    const sorted = [...qGList].sort((a,b)=>(b.totalRemaining||0)-(a.totalRemaining||0));
    return (
      <div className="scr">
        <div style={{textAlign:'center',padding:'16px 0'}}>
          <div style={{fontSize:60,animation:'bnc 1s infinite'}}>🏆</div>
          <div className="ptitle" style={{fontSize:24}}>نتائج صيد القميري</div>
        </div>
        <div className="sg sg3" style={{marginBottom:12}}>
          <div className="sbox"><div className="snum">{sorted.length}</div><div className="slbl">مجموعات</div></div>
          <div className="sbox"><div className="snum" style={{color:'var(--red)'}}>
            {Object.values(qAttacks||{}).filter(a=>a.result==='success').reduce((s,a)=>s+(a.hunted||0),0)}
          </div><div className="slbl">قميري صيدت</div></div>
          <div className="sbox"><div className="snum" style={{color:'var(--green)'}}>{Object.keys(qAttacks||{}).length}</div><div className="slbl">هجمات</div></div>
        </div>
        {sorted.map((g,i)=>{
          const isWinner=i===0;
          return(
            <div key={g.id} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:isWinner?'linear-gradient(135deg,rgba(240,192,64,.2),rgba(255,140,0,.1))':'#09091e',border:isWinner?'2px solid var(--gold)':'1px solid rgba(255,255,255,.05)',borderRadius:14,marginBottom:8}}>
              <div style={{fontFamily:'Cairo',fontSize:isWinner?28:20,fontWeight:900,width:34,color:isWinner?'var(--gold)':'var(--muted)'}}>{isWinner?'👑':i+1}</div>
              <div style={{flex:1}}><div style={{fontWeight:900,fontSize:isWinner?16:14}}>{g.name}</div></div>
              <div style={{fontFamily:'Cairo',fontSize:isWinner?28:20,fontWeight:900,color:isWinner?'var(--gold)':'var(--text)'}}>{g.totalRemaining||0} 🐦</div>
            </div>
          );
        })}
        <button className="btn bgh mt3" onClick={resetAndBack}>🏟️ ساحة الألعاب</button>
      </div>
    );
  }

  return null;
}
