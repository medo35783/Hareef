/** games/fameeri/FameeriPlay.jsx — مؤقت */
export default function FameeriPlay({ goTo, onExit }) {
  return (
    <div className="scr">
      <div className="ptitle">🌳 FameeriPlay</div>
      <div className="psub">🚧 قيد التطوير</div>
      <button className="btn bgh" onClick={() => goTo("home")}>← رجوع</button>
    </div>
  );
}
