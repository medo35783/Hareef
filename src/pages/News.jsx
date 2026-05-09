/**
 * pages/News.jsx
 * ───────────────
 * صفحة الأخبار والتحديثات
 */
const NEWS = [
  {
    id: 1,
    date: "مايو 2025",
    badge: "🆕 جديد",
    badgeColor: "tv",
    title: "إطلاق لعبة صيد القميري!",
    body: "تنافس ثقافي بين المجموعات — المشرف يدير لوحة التحكم والفرق تتنافس على الطيور.",
  },
  {
    id: 2,
    date: "أبريل 2025",
    badge: "⚡ تحديث",
    badgeColor: "tg",
    title: "لعبة الألقاب v2",
    body: "تم إضافة وضع اللقبين، الجولة الصامتة، وجولة الطعن — تجربة أكثر تشويقاً!",
  },
  {
    id: 3,
    date: "مارس 2025",
    badge: "🎉 إطلاق",
    badgeColor: "tb",
    title: "انطلاق PFCC Playground",
    body: "أول نسخة رسمية من ساحة الألعاب الجماعية — شكراً لكل من دعم المشروع.",
  },
];

export default function News() {
  return (
    <div className="scr">
      <div className="ptitle">📢 الأخبار</div>
      <div className="psub">آخر التحديثات والمستجدات</div>

      {NEWS.map((item) => (
        <div key={item.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span className={`tag ${item.badgeColor}`}>{item.badge}</span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{item.date}</span>
          </div>
          <div style={{ fontFamily: "'Cairo', sans-serif", fontSize: 15, fontWeight: 900, marginBottom: 6 }}>
            {item.title}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.8 }}>
            {item.body}
          </div>
        </div>
      ))}

      <div className="ann ag">
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          💡 تابع آخر الأخبار عبر القناة الرسمية
        </div>
      </div>
    </div>
  );
}
