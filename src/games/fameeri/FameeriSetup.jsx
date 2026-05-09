/** games/fameeri/FameeriSetup.jsx — مؤقت */
export default function FameeriSetup({ goTo, onExit }) {
  return (
    <div className="scr">
      <div className="ptitle">🌳 FameeriSetup</div>
      <div className="psub">🚧 قيد التطوير</div>
      <button className="btn bgh" onClick={() => goTo("home")}>← رجوع</button>
    </div>
  );
}
