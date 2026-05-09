/** games/fameeri/FameeriJoin.jsx — مؤقت */
export default function FameeriJoin({ goTo, onExit }) {
  return (
    <div className="scr">
      <div className="ptitle">🌳 FameeriJoin</div>
      <div className="psub">🚧 قيد التطوير</div>
      <button className="btn bgh" onClick={() => goTo("home")}>← رجوع</button>
    </div>
  );
}
