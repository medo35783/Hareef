/**
 * pages/Packages.jsx
 * ───────────────────
 * صفحة الباقات والأسعار
 */
const PACKAGES = [
  {
    id: "day",
    icon: "🌟",
    name: "يوم واحد",
    price: 15,
    hours: 24,
    features: ["إنشاء غرف غير محدودة", "جميع الألعاب", "24 ساعة كاملة"],
    style: "plan-silver",
    badgeStyle: null,
  },
  {
    id: "three",
    icon: "⭐",
    name: "3 أيام",
    price: 35,
    hours: 72,
    discount: 22,
    features: ["إنشاء غرف غير محدودة", "جميع الألعاب", "72 ساعة", "أولوية الدعم"],
    style: "plan-gold",
    badge: "🔥 الأشهر",
    badgeColor: "#d4920a",
  },
  {
    id: "week",
    icon: "💎",
    name: "أسبوع",
    price: 50,
    hours: 168,
    discount: 52,
    features: ["إنشاء غرف غير محدودة", "جميع الألعاب", "7 أيام كاملة", "أولوية الدعم", "إحصائيات متقدمة"],
    style: "plan-super",
    badge: "💎 الأفضل",
    badgeColor: "#9b59b6",
  },
];

export default function Packages({ onNeedCode }) {
  return (
    <div className="scr">
      <div className="ptitle">💎 الباقات</div>
      <div className="psub">اختر الباقة المناسبة لك وابدأ الآن</div>

      {/* تفعيل كود */}
      <button className="btn bo" onClick={onNeedCode} style={{ marginBottom: 16 }}>
        🎫 لدي كود — تفعيل الآن
      </button>

      <div className="div">أو اشترِ اشتراكاً جديداً</div>

      {PACKAGES.map((pkg) => (
        <div key={pkg.id} className={`plan-card ${pkg.style}`} style={{ position: "relative" }}>
          {pkg.badge && (
            <div className="plan-badge" style={{ background: pkg.badgeColor, color: "#fff" }}>
              {pkg.badge}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 32 }}>{pkg.icon}</span>
              <div>
                <div className="plan-name">{pkg.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>⏰ {pkg.hours} ساعة</div>
              </div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontFamily: "'Cairo',sans-serif", fontSize: 26, fontWeight: 900, color: "var(--gold)" }}>
                {pkg.price} <span style={{ fontSize: 13 }}>ريال</span>
              </div>
              {pkg.discount && (
                <div style={{ fontSize: 10, color: "var(--green)", fontWeight: 700 }}>
                  وفّر {pkg.discount}%
                </div>
              )}
            </div>
          </div>

          <div className="plan-feat">
            {pkg.features.map((f, i) => (
              <div key={i}>✓ {f}</div>
            ))}
          </div>

          <button className="btn bg" style={{ marginTop: 12 }}>
            🛒 اشترك الآن
          </button>
        </div>
      ))}

      <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "var(--muted)", lineHeight: 2 }}>
        🔒 الدفع آمن عبر MyFatoorah
        <br />
        💳 فيزا | ماستركارد | مدى | Apple Pay
      </div>
    </div>
  );
}
