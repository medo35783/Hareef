/** games/fameeri/FameeriLobby.jsx — مؤقت */
export default function FameeriLobby({ goTo, onExit }) {
  return (
    <div className="scr">
      <div className="ptitle">🌳 FameeriLobby</div>
      <div className="psub">🚧 قيد التطوير</div>
      <button className="btn bgh" onClick={() => goTo("home")}>← رجوع</button>
    </div>
  );
}
