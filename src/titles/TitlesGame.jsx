import { useState, useEffect } from 'react';
import './titles.css';

/* ══════════════════════════════════════════════════
   TITLES GAME COMPONENT - FIXED
   - Simple version without complex imports
   - Basic functionality
══════════════════════════════════════════════════ */

export default function TitlesGame({ code, role, myId, onExit }) {
  const [screen, setScreen] = useState('lobby');
  const [players, setPlayers] = useState([
    { id: 1, name: 'محمد', nick: 'الملك', status: 'active' },
    { id: 2, name: 'علي', nick: 'الفارس', status: 'active' },
    { id: 3, name: 'فاطمة', nick: 'الملكة', status: 'active' }
  ]);

  return (
    <div className="titles-game">
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
              <div className="info-number">{players.length}</div>
              <div className="info-label">لاعب</div>
            </div>
            <div className="info-card">
              <div className="info-number">{players.filter(p => p.status === 'active').length}</div>
              <div className="info-label">نشط</div>
            </div>
          </div>

          <div className="titles-players">
            {players.map(p => (
              <div key={p.id} className={`player-card ${p.status}`}>
                <div className="player-avatar">{p.name.charAt(0)}</div>
                <div className="player-info">
                  <div className="player-name">{p.name}</div>
                  <div className="player-status">🟢 نشط</div>
                </div>
              </div>
            ))}
          </div>

          <button 
            className="btn btn-primary"
            onClick={() => setScreen('playing')}
            style={{ marginBottom: '10px' }}
          >
            🎮 ابدأ اللعبة
          </button>

          <button 
            className="btn btn-secondary"
            onClick={onExit}
          >
            ← خروج
          </button>
        </div>
      )}

      {/* Playing Screen */}
      {screen === 'playing' && (
        <div className="titles-screen playing">
          <div className="countdown-display">
            <div className="countdown-number">2:45</div>
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
            {players.map(p => (
              <div key={p.id} className="player-item">
                <span className="player-nick">{p.nick}</span>
                <span className="player-status">🟢</span>
              </div>
            ))}
          </div>

          <button 
            className="btn btn-secondary"
            onClick={() => setScreen('lobby')}
            style={{ marginTop: '20px' }}
          >
            ← رجوع
          </button>
        </div>
      )}

      {/* Results Screen */}
      {screen === 'results' && (
        <div className="titles-screen results">
          <div className="results-title">📊 النتائج</div>
          <div className="results-content">
            <p>🏆 الفائز: محمد</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setScreen('lobby')}
            style={{ marginTop: '20px' }}
          >
            ← رجوع
          </button>
        </div>
      )}
    </div>
  );
}
