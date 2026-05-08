/* ══════════════════════════════════════════════════
   🏟️ APP — ساحة الألعاب
   الهيكل الرئيسي — يحمل اللعبتين + التنقل + الأكواد
   v40 — فصل كامل
══════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { CSS }              from './shared/styles';
import { Stars, Notif }     from './shared/components';
import { SUPPORT_EMAIL }    from './shared/constants';
import { db }               from './shared/firebase';
import { getActiveCode, isCodeValid } from './SubscriptionTimer';
import NicknamesGame        from './NicknamesGame';
import QumairiGame          from './QumairiGame';
import AdminCodesPanel      from './AdminCodesPanel';
import CodeActivation       from './CodeActivation';
import SubscriptionTimer    from './SubscriptionTimer';
import EndGameJoinPrompt    from './EndGameJoinPrompt';

export default function App() {

  /* ── NAV ── */
  const [tab,          setTab]          = useState('game');
  const [selectedGame, setSelectedGame] = useState(null); // null | 'nicknames' | 'qumairi'

  /* ── SUBSCRIPTION ── */
  const [activeCode,          setActiveCode]          = useState(null);
  const [showCodeActivation,  setShowCodeActivation]  = useState(false);
  const [showEndGamePrompt,   setShowEndGamePrompt]   = useState(false);
  const [playerStatsEndGame,  setPlayerStatsEndGame]  = useState(null);
  const [isAdminUser,         setIsAdminUser]         = useState(false);
  const [myId]                                        = useState(null);

  /* ── UI ── */
  const [notifs,       setNotifs]       = useState([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [suggForm,     setSuggForm]     = useState({ cat: 'لعبة', text: '' });
  const [suggestions]                   = useState([
    { id:1, cat:'تصميم', text:'وضع داكن أكثر', date:'2025-03-10' },
    { id:2, cat:'لعبة',  text:'مؤقت صوتي عند النهاية', date:'2025-03-12' },
  ]);
  const hasNews = true;

  const notify = (text, type = 'info') => {
    const id = Date.now() + Math.random();
    setNotifs(p => [...p, { id, text, type }]);
    setTimeout(() => setNotifs(p => p.filter(n => n.id !== id)), 3200);
  };

  /* ── CHECK CODE & ADMIN ── */
  useEffect(() => {
    const init = async () => {
      const storedAdmin = localStorage.getItem('pfcc_is_admin');
      if (storedAdmin === 'true') { setIsAdminUser(true); setIsLoading(false); return; }
      const code = await getActiveCode(db, myId);
      if (code && isCodeValid(code)) {
        setActiveCode(code); setShowCodeActivation(false);
      } else {
        setActiveCode(null);
        if (!selectedGame) setShowCodeActivation(true);
      }
      setIsLoading(false);
    };
    init();
  }, [myId]);

  /* ── EXPIRY WATCH ── */
  useEffect(() => {
    if (!activeCode) return;
    const t = setInterval(() => {
      if (!isCodeValid(activeCode)) {
        setActiveCode(null);
        if (!isAdminUser) { notify('⏰ انتهى اشتراكك! جدّد الآن', 'error'); setShowCodeActivation(true); }
      }
    }, 60000);
    return () => clearInterval(t);
  }, [activeCode, isAdminUser]);

  /* ── LOADING SPLASH ── */
  if (isLoading) return (
    <div style={{minHeight:'100vh',background:'#07071a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
      <style>{CSS}</style>
      <Stars />
      <div style={{fontSize:64,animation:'bnc 1s infinite'}}>🎭</div>
      <div style={{fontFamily:'Cairo',fontSize:22,fontWeight:900,background:'linear-gradient(135deg,#f0c040,#ff8c00)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>ساحة الألعاب</div>
      <div style={{display:'flex',gap:6,marginTop:8}}>
        {[0,1,2].map(i=>(
          <div key={i} style={{width:8,height:8,borderRadius:'50%',background:'#f0c040',opacity:.3,animation:'pls 1.2s infinite',animationDelay:`${i*0.2}s`}}/>
        ))}
      </div>
    </div>
  );

  /* ── NAV ITEMS ── */
  const navItems = [
    { id:'game',    icon:'🏟️', label:'الألعاب' },
    { id:'news',    icon:'🔔', label:'أخبار', dot: hasNews },
    ...(isAdminUser ? [{ id:'codes', icon:'🎫', label:'الأكواد' }] : []),
    { id:'pricing', icon:'💎', label:'الباقات' },
    { id:'suggest', icon:'💡', label:'اقتراح' },
  ];

  /* ── LOGO TEXT ── */
  const logoText =
    tab === 'news'    ? '🔔 أخبار' :
    tab === 'codes'   ? '🎫 الأكواد' :
    tab === 'suggest' ? '💡 اقتراح' :
    tab === 'pricing' ? '💎 الباقات' :
    selectedGame === 'nicknames' ? '🎭 لعبة الألقاب' :
    selectedGame === 'qumairi'   ? '🦅 صيد القميري' :
    '🏟️ ساحة الألعاب';

  /* ── CODE GATE ── */
  if (!isAdminUser && !activeCode && !selectedGame) {
    return (
      <div className="app">
        <style>{CSS}</style>
        <Stars />
        {notifs.map(n => <Notif key={n.id} msg={n} />)}
        <div className="main">
          <CodeActivation
            db={db}
            currentUser={{ uid: myId }}
            onActivationSuccess={codeData => {
              setActiveCode(codeData);
              setShowCodeActivation(false);
              notify('✅ تم تفعيل الاشتراك بنجاح!', 'success');
            }}
          />
        </div>
      </div>
    );
  }

  /* ── GAME SCREENS ── */
  const renderGameTab = () => {
    if (selectedGame === 'nicknames') {
      return (
        <NicknamesGame
          onBack={() => setSelectedGame(null)}
          notify={notify}
          isAdmin={isAdminUser}
          activeCode={activeCode}
        />
      );
    }
    if (selectedGame === 'qumairi') {
      return (
        <QumairiGame
          onBack={() => setSelectedGame(null)}
          notify={notify}
        />
      );
    }
    // ── الرئيسية ──
    return (
      <div className="scr">
        <div style={{textAlign:'center',padding:'18px 0 14px'}}>
          <div style={{fontSize:42,marginBottom:6}}>🏟️</div>
          <div className="ptitle" style={{fontSize:24}}>ساحة الألعاب</div>
          <div className="psub">ألعاب جماعية تفاعلية للرحلات والاجتماعات والمناسبات</div>
        </div>

        {/* بطاقة الألقاب */}
        <div onClick={()=>setSelectedGame('nicknames')}
          style={{background:'linear-gradient(135deg,rgba(240,192,64,.12),rgba(255,140,0,.06))',border:'2px solid rgba(240,192,64,.3)',borderRadius:16,padding:'18px 16px',marginBottom:12,cursor:'pointer',transition:'all .2s'}}
          onTouchStart={e=>e.currentTarget.style.transform='scale(.98)'}
          onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{fontSize:44}}>🎭</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--gold)'}}>لعبة الألقاب</div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:3,lineHeight:1.6}}>أخفِ هويتك واكشف الآخرين قبل أن يكشفوك</div>
              <div style={{display:'flex',gap:5,marginTop:8,flexWrap:'wrap'}}>
                {['6-50 لاعب','متعدد الجولات','إثارة وتشويق'].map(t=>(
                  <span key={t} className="tag tg" style={{fontSize:10}}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{fontSize:20,color:'var(--gold)'}}>←</div>
          </div>
        </div>

        {/* بطاقة القميري */}
        <div onClick={()=>setSelectedGame('qumairi')}
          style={{background:'linear-gradient(135deg,rgba(46,204,113,.1),rgba(26,138,80,.05))',border:'2px solid rgba(46,204,113,.25)',borderRadius:16,padding:'18px 16px',marginBottom:12,cursor:'pointer',transition:'all .2s'}}
          onTouchStart={e=>e.currentTarget.style.transform='scale(.98)'}
          onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{fontSize:44}}>🦅</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--green)'}}>صيد القميري</div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:3,lineHeight:1.6}}>وزّع القميري على الأشجار واهجم مجموعات الخصوم</div>
              <div style={{display:'flex',gap:5,marginTop:8,flexWrap:'wrap'}}>
                {['2-6 مجموعات','100 قميري','استراتيجية'].map(t=>(
                  <span key={t} className="tag tv" style={{fontSize:10}}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{fontSize:20,color:'var(--green)'}}>←</div>
          </div>
        </div>

        {/* قريباً */}
        <div style={{background:'rgba(255,255,255,.03)',border:'1px dashed rgba(255,255,255,.1)',borderRadius:16,padding:16,marginBottom:12,textAlign:'center'}}>
          <div style={{fontSize:28,marginBottom:6}}>🎲</div>
          <div style={{fontSize:13,fontWeight:700,color:'var(--muted)'}}>المزيد من الألعاب قادمة!</div>
          <div style={{fontSize:11,color:'var(--dim)',marginTop:3}}>ترقبوا ألعاب جماعية جديدة ومثيرة</div>
          <button className="btn bgh" style={{marginTop:8,fontSize:12}} onClick={()=>window.open(`mailto:${SUPPORT_EMAIL}?subject=اقتراح لعبة جديدة`)}>💡 اقترح لعبة جديدة</button>
        </div>
      </div>
    );
  };

  const renderNews = () => (
    <div className="scr">
      <div className="ptitle">🔔 آخر الأخبار</div>
      <div className="psub">تحديثات التطبيق والميزات الجديدة</div>
      {[
        {id:1,date:'2025-03-29',title:'🎉 إطلاق النسخة التجريبية',body:'تم إطلاق لعبة الألقاب رسمياً مع دعم الغرف الحقيقية عبر Firebase!',isNew:true},
        {id:2,date:'2025-03-25',title:'⚡ نظام الهجوم المتزامن',body:'الكل يهاجم في نفس الوقت — سرية تامة ثم كشف مفاجئ.',isNew:true},
        {id:3,date:'2025-03-20',title:'📊 إحصائيات الإثارة',body:'أكثر لقب مطاردة وأقل اسم استهدافاً.',isNew:false},
      ].map(n=>(
        <div key={n.id} className="news-item">
          <div className="news-date">{n.isNew&&<span className="news-new">جديد</span>}{n.date}</div>
          <div className="news-title">{n.title}</div>
          <div className="news-body">{n.body}</div>
        </div>
      ))}
    </div>
  );

  const renderSuggest = () => (
    <div className="scr">
      <div className="ptitle">💡 الاقتراحات</div>
      <div className="psub">شاركنا أفكارك — يُفتح تطبيق البريد تلقائياً</div>
      <div className="card">
        <div className="ctitle">📩 إرسال اقتراح</div>
        <div className="ig">
          <label className="lbl">التصنيف</label>
          <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
            {['لعبة','تصميم','إحصائيات','أسعار','أخرى'].map(c=>(
              <button key={c} className={`btn bsm ${suggForm.cat===c?'bg':'bgh'}`} style={{width:'auto'}} onClick={()=>setSuggForm(f=>({...f,cat:c}))}>{c}</button>
            ))}
          </div>
        </div>
        <div className="ig">
          <label className="lbl">اكتب اقتراحك</label>
          <textarea className="inp" placeholder="اقتراحك هنا..." value={suggForm.text} onChange={e=>setSuggForm(f=>({...f,text:e.target.value}))}/>
        </div>
        <button className="btn bg" onClick={()=>{
          if(!suggForm.text.trim()){notify('اكتب اقتراحك أولاً','error');return;}
          const sub=encodeURIComponent(`اقتراح [${suggForm.cat}] — PFCC Playground`);
          const bod=encodeURIComponent(`التصنيف: ${suggForm.cat}\n\nالاقتراح:\n${suggForm.text}`);
          window.open(`mailto:${SUPPORT_EMAIL}?subject=${sub}&body=${bod}`);
          setSuggForm(f=>({...f,text:''}));notify('✅ سيُفتح تطبيق البريد','success');
        }}>📤 فتح البريد للإرسال</button>
        <div style={{marginTop:10,padding:'9px 12px',background:'rgba(79,163,224,.07)',border:'1px solid rgba(79,163,224,.2)',borderRadius:8,fontSize:11,color:'var(--muted)',textAlign:'center'}}>
          إلى: <strong style={{color:'var(--blue)'}}>{SUPPORT_EMAIL}</strong>
        </div>
      </div>
      <div className="div">اقتراحات من المجتمع</div>
      {suggestions.map(s=>(
        <div key={s.id} className="sugg-item">
          <div className="sugg-cat">{s.cat}</div>
          <div className="sugg-text">{s.text}</div>
          <div className="sugg-date">{s.date}</div>
        </div>
      ))}
    </div>
  );

  const renderPricing = () => (
    <div className="scr">
      <div className="ptitle">💎 باقات الاشتراك</div>
      <div className="psub">اشتراك شهري أو سنوي — الأسعار تُعلن قريباً</div>
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {['شهري','سنوي (وفّر 20%)'].map((t,i)=>(
          <button key={t} className={`btn ${i===1?'bo':'bgh'}`} style={{flex:1}}>{t}</button>
        ))}
      </div>
      {[
        {cls:'plan-super',badge:{bg:'var(--purple)',c:'#fff',label:'⭐ الأشهر'},name:'سوبر 🚀',nameColor:'var(--purple)',feats:'✦ لاعبون غير محدودون\n✦ جلسات متزامنة متعددة\n✦ تقارير تفصيلية كاملة\n✦ دعم أولوية 24/7\n✦ جميع مميزات الذهبي والفضي'},
        {cls:'plan-gold', badge:{bg:'var(--gold)',c:'#07070f',label:'🏆 ذهبي'},name:'ذهبي ✨',nameColor:'var(--gold)',feats:'✦ حتى 50 لاعب\n✦ إحصائيات متقدمة\n✦ سجل تاريخ الجلسات\n✦ ألقاب وأيقونات مخصصة'},
        {cls:'plan-silver',badge:{bg:'rgba(200,200,220,.4)',c:'var(--text)',label:'🥈 فضي'},name:'فضي',nameColor:'rgba(210,210,230,.9)',feats:'✦ حتى 20 لاعب\n✦ إحصائيات أساسية\n✦ غرفة واحدة نشطة'},
      ].map((p,i)=>(
        <div key={i} className={`plan-card ${p.cls}`}>
          <div className="plan-badge" style={{background:p.badge.bg,color:p.badge.c}}>{p.badge.label}</div>
          <div className="plan-name" style={{color:p.nameColor}}>{p.name}</div>
          <div style={{display:'flex',alignItems:'center',gap:8,margin:'8px 0 6px'}}>
            <span style={{fontSize:13,color:'var(--muted)'}}>السعر:</span>
            <span style={{background:'rgba(255,255,255,.08)',color:'var(--muted)',padding:'3px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>يُعلن قريباً</span>
          </div>
          <div className="plan-feat">{p.feats.split('\n').map((f,j)=><div key={j}>{f}</div>)}</div>
        </div>
      ))}
      <div className="card" style={{textAlign:'center',padding:14}}>
        <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:4}}>🎉 سجّل اهتمامك الآن</div>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:10}}>كن أول من يعرف عند إطلاق الأسعار</div>
        <button className="btn bg bsm" style={{width:'auto',margin:'0 auto'}}
          onClick={()=>window.open(`mailto:${SUPPORT_EMAIL}?subject=أريد الاشتراك — PFCC Playground`)}>
          📧 أبلغني عند الإطلاق
        </button>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════
     MAIN RENDER
  ══════════════════════════════════════════════════ */
  return (
    <div className="app">
      <style>{CSS}</style>
      <Stars />
      {notifs.map(n => <Notif key={n.id} msg={n} />)}

      {/* HEADER */}
      <div className="hdr">
        {tab === 'game' && selectedGame ? (
          <button className="btn bgh bsm" style={{width:'auto',padding:'6px 12px',fontSize:12,color:'var(--muted)',border:'1px solid rgba(255,255,255,.1)'}}
            onClick={() => setSelectedGame(null)}>
            ← رجوع
          </button>
        ) : (
          <div style={{width:60}}/>
        )}

        <div className="logo" style={{position:'absolute',left:'50%',transform:'translateX(-50%)'}}>
          {logoText}
        </div>

        {/* Subscription timer */}
        {activeCode && !isAdminUser && (
          <div style={{position:'absolute',left:16}}>
            <SubscriptionTimer
              activeCode={activeCode}
              onExpired={() => { setActiveCode(null); setShowCodeActivation(true); }}
            />
          </div>
        )}

        <div style={{width:60}}/>
      </div>

      {/* MAIN CONTENT */}
      <div className="main">
        {tab === 'game'    && (() => { try { return renderGameTab(); } catch(e) { console.error(e); return <div style={{padding:20,textAlign:'center',color:'var(--red)'}}><div style={{fontSize:40}}>⚠️</div><div style={{marginTop:8}}>خطأ — حدّث الصفحة</div><button className="btn bg mt2" onClick={()=>window.location.reload()}>🔄 تحديث</button></div>; } })()}
        {tab === 'news'    && renderNews()}
        {tab === 'codes'   && isAdminUser && <AdminCodesPanel db={db} currentUser={{uid: myId}} />}
        {tab === 'suggest' && renderSuggest()}
        {tab === 'pricing' && renderPricing()}
      </div>

      {/* End game prompt */}
      {showEndGamePrompt && playerStatsEndGame && (
        <EndGameJoinPrompt
          playerStats={playerStatsEndGame}
          onClose={() => setShowEndGamePrompt(false)}
          onSubscribe={() => { notify('قريباً: ربط بوابة الدفع', 'info'); setShowEndGamePrompt(false); }}
          onTryFree={() => { setShowEndGamePrompt(false); notify('🎁 التجربة المجانية مُفعّلة!', 'success'); }}
        />
      )}

      {/* BOTTOM NAV */}
      <nav className="bnav">
        {navItems.map(item => (
          <button key={item.id} className={`bnav-item${tab === item.id ? ' active' : ''}`} onClick={() => setTab(item.id)}>
            <div className="bnav-icon">{item.icon}</div>
            <div className="bnav-label">{item.label}</div>
            {item.dot && <div className="bnav-dot"/>}
          </button>
        ))}
      </nav>
    </div>
  );
}
