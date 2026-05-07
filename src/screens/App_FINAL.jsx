import { useState, useEffect } from 'react';
import { db } from './shared/firebase';
import { getStorageItem, setStorageItem } from './shared/utils';
import { useNotifications } from './shared/hooks';

// Shared Components
import CodeActivation from './shared/CodeActivation';
import AdminCodesPanel from './shared/AdminCodesPanel';
import SubscriptionTimer, { getActiveCode, isCodeValid } from './shared/SubscriptionTimer';
import EndGameJoinPrompt from './shared/EndGameJoinPrompt';

// Games
import TitlesGame from './titles/TitlesGame';

// Screens
import NewsScreen from './screens/NewsScreen';
import PricingScreen from './screens/PricingScreen';

/* ══════════════════════════════════════════════════
   APP ROOT - FINAL VERSION
   - Complete app with all screens
   - Routes to games and information pages
══════════════════════════════════════════════════ */

export default function App() {
  // Navigation & View State
  const [tab, setTab] = useState('game');
  const [selectedGame, setSelectedGame] = useState(null);

  // Session & Auth
  const [role, setRole] = useState(null);
  const [myId, setMyId] = useState(null);
  const [myName, setMyName] = useState('');
  const [myNick, setMyNick] = useState('');

  // Room & Game
  const [roomCode, setRoomCode] = useState('');
  const [activeCode, setActiveCode] = useState(null);
  const [showCodeActivation, setShowCodeActivation] = useState(false);

  // UI
  const { notifs, notify } = useNotifications();
  const isAdmin = role === 'admin';

  // Check for active subscription
  useEffect(() => {
    const stored = getStorageItem('activeCode');
    if (stored && isCodeValid(stored)) {
      setActiveCode(stored);
    }
  }, []);

  // Global styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=Cairo:wght@400;600;700;900&display=swap');
      
      :root {
        --gold: #f0c040;
        --red: #e63950;
        --green: #2ecc71;
        --blue: #4fa3e0;
        --purple: #9b59b6;
        --card: #0f0f22;
        --card2: #151530;
        --border: rgba(240,192,64,.18);
        --text: #e8e0ff;
        --muted: #7a74a0;
        --dim: #2a2850;
      }
      
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      html, body {
        font-family: 'Tajawal', sans-serif;
        direction: rtl;
        background: #07071a;
        color: var(--text);
        min-height: 100vh;
        overflow-x: hidden;
      }
      
      .app {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        padding-bottom: 70px;
      }
      
      .main {
        flex: 1;
        padding: 14px;
        max-width: 580px;
        margin: 0 auto;
        width: 100%;
      }
      
      .hdr {
        position: sticky;
        top: 0;
        z-index: 60;
        background: rgba(7,7,26,.97);
        backdrop-filter: blur(14px);
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-bottom: 1px solid var(--border);
      }
      
      .logo {
        font-family: 'Cairo', sans-serif;
        font-size: 18px;
        font-weight: 900;
        background: linear-gradient(135deg, var(--gold), #ff8c00);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      
      .bnav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 80;
        background: rgba(7,7,26,.97);
        backdrop-filter: blur(16px);
        border-top: 1px solid var(--border);
        display: flex;
        align-items: stretch;
        height: 62px;
        max-width: 720px;
        margin: 0 auto;
      }
      
      .bnav-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        cursor: pointer;
        border: none;
        background: transparent;
        padding: 6px 2px;
        color: var(--muted);
        font-family: 'Tajawal', sans-serif;
        transition: all .18s;
      }
      
      .bnav-item.active {
        color: var(--gold);
      }
      
      .bnav-icon {
        font-size: 20px;
        line-height: 1;
      }
      
      .bnav-label {
        font-size: 10px;
        font-weight: 600;
      }
      
      .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 10px;
        font-family: 'Tajawal', sans-serif;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all .18s;
      }
      
      .btn:active {
        transform: scale(.97);
      }
      
      .bg {
        background: linear-gradient(135deg, var(--gold), #d4920a);
        color: #07070f;
      }
      
      .bg:hover {
        filter: brightness(1.08);
      }
      
      .bv {
        background: linear-gradient(135deg, var(--green), #1a8a50);
        color: #fff;
      }
      
      .notif {
        position: fixed;
        top: 68px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999;
        padding: 10px 18px;
        border-radius: 10px;
        font-weight: 700;
        font-size: 13px;
        text-align: center;
        animation: slideDown .3s ease, fadeOut .3s ease 2.7s forwards;
      }
      
      @keyframes slideDown {
        from { opacity: 0; transform: translateX(-50%) translateY(-14px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      .notif-success {
        background: #0c2d1c;
        border: 1px solid var(--green);
        color: var(--green);
      }
      
      .notif-error {
        background: #2d0c0c;
        border: 1px solid var(--red);
        color: var(--red);
      }
      
      .notif-info {
        background: #0c1c2d;
        border: 1px solid var(--blue);
        color: var(--blue);
      }
    `;
    document.head.appendChild(style);
  }, []);

  const navItems = [
    { id: 'game', icon: '🎮', label: 'لعبة' },
    { id: 'codes', icon: '🎫', label: 'أكواد', admin: true },
    { id: 'news', icon: '🔔', label: 'أخبار' },
    { id: 'pricing', icon: '💎', label: 'باقات' }
  ];

  return (
    <div className="app">
      {/* Notifications */}
      {notifs.map(notif => (
        <div key={notif.id} className={`notif notif-${notif.type}`}>
          {notif.text}
        </div>
      ))}

      {/* Header */}
      <div className="hdr">
        <div className="logo">🏟️ ساحة الألعاب</div>
      </div>

      {/* Main Content */}
      <div className="main">
        {/* Code Activation */}
        {showCodeActivation && !activeCode && (
          <CodeActivation
            db={db}
            onActivationSuccess={(code) => {
              setActiveCode(code);
              setShowCodeActivation(false);
              notify('✅ تم تفعيل الكود!', 'success');
            }}
            currentUser={{ uid: myId }}
          />
        )}

        {/* Admin Panel */}
        {isAdmin && tab === 'codes' && (
          <AdminCodesPanel db={db} currentUser={{ uid: myId }} />
        )}

        {/* Subscription Timer */}
        {activeCode && !isAdmin && (
          <SubscriptionTimer
            activeCode={activeCode}
            onExpired={() => {
              setActiveCode(null);
              notify('⏰ انتهت فترة الاشتراك', 'info');
              setShowCodeActivation(true);
            }}
          />
        )}

        {/* Game Selection */}
        {tab === 'game' && !selectedGame && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <h1 style={{
              fontSize: '28px',
              marginBottom: '20px',
              background: 'linear-gradient(135deg, var(--gold), #ff8c00)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              🎮 ساحة الألعاب
            </h1>
            <p style={{ color: 'var(--muted)', marginBottom: '30px', fontSize: '14px' }}>
              اختر اللعبة التي تريد اللعب بها
            </p>
            <button
              className="btn bg"
              onClick={() => setSelectedGame('titles')}
              style={{ marginBottom: '12px', padding: '14px' }}
            >
              🎭 لعبة الألقاب
            </button>
            <button
              className="btn bv"
              onClick={() => setSelectedGame('qumairi')}
              style={{ padding: '14px' }}
            >
              🦅 صيد القميري
            </button>
          </div>
        )}

        {/* Titles Game */}
        {tab === 'game' && selectedGame === 'titles' && (
          <TitlesGame
            code={roomCode}
            role={role}
            myId={myId}
            onExit={() => setSelectedGame(null)}
          />
        )}

        {/* Qumairi Game - Coming Soon */}
        {tab === 'game' && selectedGame === 'qumairi' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🦅</div>
            <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>صيد القميري</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>قريباً جداً!</p>
            <button className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.1)', color: 'var(--muted)' }} onClick={() => setSelectedGame(null)}>
              ← رجوع
            </button>
          </div>
        )}

        {/* News */}
        {tab === 'news' && <NewsScreen />}

        {/* Pricing */}
        {tab === 'pricing' && <PricingScreen />}

        {/* Codes - Admin Only */}
        {tab === 'codes' && !isAdmin && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
            <h2>🎫 الأكواد</h2>
            <p>للمسؤولين فقط</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="bnav">
        {navItems
          .filter(item => !item.admin || isAdmin)
          .map(item => (
            <button
              key={item.id}
              className={`bnav-item${tab === item.id ? ' active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              <div className="bnav-icon">{item.icon}</div>
              <div className="bnav-label">{item.label}</div>
            </button>
          ))}
      </nav>
    </div>
  );
}
