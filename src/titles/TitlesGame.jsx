import { useState, useEffect } from 'react';
import { onGameStateChange, onPlayersChange, onAttacksChange } from './titleFirebase';
import { useCountdown, useNotifications, useSound } from '../shared/hooks';
import { formatTime, getCountdownInfo } from '../shared/utils';
import './titles.css';

/* ══════════════════════════════════════════════════
   TITLES GAME COMPONENT
   - Main game interface
   - Manages game flow
══════════════════════════════════════════════════ */

export default function TitlesGame({ code, role, myId, onExit }) {
  // Game state
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState({});
  const [attacks, setAttacks] = useState({});
  const [gamePhase, setGamePhase] = useState('lobby');

  // UI state
  const [screen, setScreen] = useState('lobby');
  const { notifs, notify } = useNotifications();
  const playSound = useSound();
  const { countdown, isActive: countdownActive, start: startCountdown } = useCountdown();

  // Subscribe to Firebase
  useEffect(() => {
    if (!code) return;

    const unsub1 = onGameStateChange(code, (state) => {
      setGameState(state);
      setGamePhase(state?.phase || 'lobby');
    });

    const unsub2 = onPlayersChange(code, setPlayers);
    const unsub3 = onAttacksChange(code, setAttacks);

    return () => {
      unsub1?.();
      unsub2?.();
      unsub3?.();
    };
  }, [code]);

  // Handle game phases
  useEffect(() => {
    if (gamePhase === 'active') {
      setScreen('playing');
      playSound('suspense');
    } else if (gamePhase === 'revealing') {
      setScreen('results');
      playSound('explosion');
    } else if (gamePhase === 'ended') {
      setScreen('winner');
      playSound('applause');
    }
  }, [gamePhase, playSound]);

  const playersList = Object.values(players || {});
  const activePlayers = playersList.filter(p => p.status === 'active');
  const countdownInfo = getCountdownInfo(countdown);

  return (
    <div className="titles-game">
      {/* Notifications */}
      <div className="notifs-container">
        {notifs.map(notif => (
          <div key={notif.id} className={`notif notif-${notif.type}`}>
            {notif.text}
          </div>
        ))}
      </div>

      {/* Lobby Screen */}
      {screen === 'lobby' && (
        <div className="titles-screen lobby">
          <div className="titles-hero">
            <div className="titles-icon">🎭</div>
            <h1>لعبة الألقاب</h1>
            <p>اختر لقباً سرياً وخمّن ألقاب زملائك!</p>
          </div>

          <div className="titles-info">
            <div className="info-card">
              <div className="info-number">{playersList.length}</div>
              <div className="info-label">لاعب</div>
            </div>
            <div className="info-card">
              <div className="info-number">{activePlayers.length}</div>
              <div className="info-label">نشط</div>
            </div>
          </div>

          <div className="titles-players">
            {playersList.map(p => (
              <div key={p.id} className={`player-card ${p.status}`}>
                <div className="player-avatar">{p.initials}</div>
                <div className="player-info">
                  <div className="player-name">{p.name}</div>
                  <div className="player-status">{p.status === 'active' ? '🟢 نشط' : '⚪ محايد'}</div>
                </div>
              </div>
            ))}
          </div>

          {role === 'admin' && (
            <button className="btn btn-primary" onClick={() => setScreen('admin')}>
              👑 لوحة التحكم
            </button>
          )}

          <button className="btn btn-secondary" onClick={onExit}>
            ← خروج
          </button>
        </div>
      )}

      {/* Playing Screen */}
      {screen === 'playing' && (
        <div className="titles-screen playing">
          <div className="countdown-display">
            <div className={`countdown-number ${countdownInfo.urgent ? 'urgent' : ''}`}>
              {countdownInfo.label}
            </div>
          </div>

          <div className="attack-panel">
            <h2>⚔️ الهجوم</h2>
            <div className="attack-form">
              <input
                type="text"
                placeholder="لقب الخصم"
                className="inp"
              />
              <button className="btn btn-success">🎯 هجوم</button>
            </div>
          </div>

          <div className="players-list">
            {activePlayers.map(p => (
              <div key={p.id} className="player-item">
                <span className="player-nick">{p.nick}</span>
                <span className="player-status">🟢</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Screen */}
      {screen === 'results' && (
        <div className="titles-screen results">
          <div className="results-title">📊 النتائج</div>
          <div className="results-content">
            {/* Results would go here */}
            <p>جارٍ عرض النتائج...</p>
          </div>
        </div>
      )}

      {/* Winner Screen */}
      {screen === 'winner' && (
        <div className="titles-screen winner">
          <div className="winner-crown">👑</div>
          <h2>الفائز!</h2>
          <p>تهانينا!</p>
        </div>
      )}

      {/* Admin Screen */}
      {screen === 'admin' && role === 'admin' && (
        <div className="titles-screen admin">
          <h2>👑 لوحة التحكم</h2>
          <button className="btn btn-primary" onClick={() => setScreen('lobby')}>
            ← رجوع
          </button>
        </div>
      )}
    </div>
  );
}
