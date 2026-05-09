/**
 * games/titles/TitlesHome.jsx
 * ────────────────────────────
 * شاشة البداية — اختيار الدور
 * مشرف: ينشئ غرفة | متسابق: يدخل برقم الغرفة
 */
export default function TitlesHome({
  isDomainAdmin, activeCode, onNeedCode, goTo,
}) {
  const canCreate = isDomainAdmin || (activeCode && activeCode.expiresAt > Date.now());

  const handleCreate = () => {
    if (!canCreate) { onNeedCode(); return; }
    goTo("setup");
  };

  return (
    <div className="scr">
      {/* عنوان */}
      <div style={{ textAlign: "center", padding: "20px 0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎭</div>
        <div className="ptitle">لعبة الألقاب</div>
        <div className="psub">أخفِ هويتك وتحدى زملاءك في كشف لقبك!</div>
      </div>

      {/* كيف تلعب */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="ctitle">🎯 كيف تلعب؟</div>
        {[
          { icon: "1️⃣", text: "المشرف ينشئ غرفة ويختار الإعدادات" },
          { icon: "2️⃣", text: "كل لاعب يختار لقباً سرياً مجهول الهوية" },
          { icon: "3️⃣", text: "الكل يخمّن أصحاب الألقاب — من يكشف أكثر يفوز!" },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 13 }}>
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            <span style={{ color: "var(--muted)", lineHeight: 1.6 }}>{s.text}</span>
          </div>
        ))}
      </div>

      {/* زر إنشاء غرفة */}
      <button className="btn bg" onClick={handleCreate} style={{ marginBottom: 10 }}>
        🎮 إنشاء غرفة جديدة
        {!canCreate && <span style={{ fontSize: 10, marginRight: 6, opacity: .7 }}>(يحتاج كود)</span>}
      </button>

      {/* زر الانضمام */}
      <button className="btn bo" onClick={() => goTo("join")}>
        🚪 الانضمام لغرفة موجودة
      </button>

      {!canCreate && (
        <div className="ann ag" style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            💡 لإنشاء غرفة تحتاج كود تفعيل — الانضمام مجاني للجميع
          </div>
        </div>
      )}
    </div>
  );
}
