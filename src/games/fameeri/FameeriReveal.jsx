/** games/fameeri/FameeriReveal.jsx — مؤقت */
export default function FameeriReveal({ goTo, onExit }) {
  return (
    <div className="scr">
      <div className="ptitle">🌳 FameeriReveal</div>
      <div className="psub">🚧 قيد التطوير</div>
      <button className="btn bgh" onClick={() => goTo("home")}>← رجوع</button>
    </div>
  );
}
