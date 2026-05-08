/**
 * pages/Home.jsx
 * ───────────────
 * الصفحة الرئيسية — اختيار اللعبة
 *
 * تعرض بطاقتين:
 *  🎭 لعبة الألقاب  — إخفاء هوية + تخمين زملاء
 *  🌳 لعبة القميري  — Dashboard مشرف + تنافس جماعي
 */

export default function Home({ onSelectGame, isDomainAdmin = false }) {
  const games = [
    {
      id:    "titles",
      icon:  "🎭",
      name:  "لعبة الألقاب",
      desc:  "اختر لقباً مجهولاً وتحدى زملاءك في كشف هويتك!",
      tags:  ["إخفاء هوية", "تخمين", "أفراد"],
      color: "var(--gold)",
      bg:    "linear-gradient(135deg,rgba(240,192,64,.12),rgba(255,140,0,.06))",
      border:"rgba(240,192,64,.35)",
    },
    {
      id:    "fameeri",
      icon:  "🌳",
      name:  "صيد القميري",
      desc:  "تنافس ثقافي بين المجموعات — المشرف يدير لوحة التحكم!",
      tags:  ["مجموعات", "تنافس", "ثقافي"],
      color: "var(--green)",
      bg:    "linear-gradient(135deg,rgba(46,204,113,.12),rgba(27,177,77,.06))",
      border:"rgba(46,204,113,.35)",
    },
  ];

  return (
    <div className="scr">
      {/* العنوان */}
      <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎮</div>
        <div className="ptitle">ساحة الألعاب</div>
        <div className="psub">اختر لعبتك وابدأ المنافسة!</div>
      </div>

      {/* بطاقات الألعاب */}
      {games.map((game) => (
        <button
          key={game.id}
          onClick={() => onSelectGame(game.id)}
          style={{
            width: "100%",
            background: game.bg,
            border: `2px solid ${game.border}`,
            borderRadius: 16,
            padding: "18px 16px",
            cursor: "pointer",
            marginBottom: 12,
            textAlign: "right",
            transition: "all .2s",
            fontFamily: "'Tajawal', sans-serif",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,.3)`; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = "none"; }}
        >
          {/* أيقونة + الاسم */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 40 }}>{game.icon}</span>
            <div>
              <div style={{
                fontFamily: "'Cairo', sans-serif",
                fontSize: 18, fontWeight: 900,
                color: game.color,
              }}>
                {game.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, lineHeight: 1.6 }}>
                {game.desc}
              </div>
            </div>
          </div>

          {/* التاغات */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {game.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  background: "rgba(255,255,255,.06)",
                  color: "var(--muted)",
                  border: "1px solid rgba(255,255,255,.08)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* سهم الدخول */}
          <div style={{
            display: "flex", justifyContent: "flex-end",
            marginTop: 10, color: game.color, fontSize: 18,
          }}>
            ←
          </div>
        </button>
      ))}

      {/* ملاحظة للزائر */}
      {!isDomainAdmin && (
        <div className="ann ag" style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.8 }}>
            💡 المتسابق يدخل مباشرة برقم الغرفة
            <br />
            المشرف يحتاج كود تفعيل لإنشاء غرفة
          </div>
        </div>
      )}
    </div>
  );
}
