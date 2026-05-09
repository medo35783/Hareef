/**
 * games/fameeri/FameeriHome.jsx — مؤقت
 */
export default function FameeriHome({ goTo, isDomainAdmin, activeCode, onNeedCode }) {
  const canCreate = isDomainAdmin || (activeCode && activeCode.expiresAt > Date.now());
  return (
    <div className="scr">
      <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🌳</div>
        <div className="ptitle">صيد القميري</div>
        <div className="psub">تنافس ثقافي بين المجموعات</div>
      </div>
      <button className="btn bg" onClick={() => canCreate ? goTo("setup") : onNeedCode()} style={{ marginBottom: 10 }}>
        🎮 إنشاء غرفة {!canCreate && "(يحتاج كود)"}
      </button>
      <button className="btn bo" onClick={() => goTo("join")}>
        🚪 الانضمام لغرفة
      </button>
      <div className="ann ag" style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>🚧 قيد التطوير — قريباً!</div>
      </div>
    </div>
  );
}
