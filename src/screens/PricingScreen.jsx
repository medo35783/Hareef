import { useState } from 'react';

/* ══════════════════════════════════════════════════
   PRICING SCREEN
   - Display subscription packages
   - Show features and prices
══════════════════════════════════════════════════ */

const PACKAGES = [
  {
    id: 1,
    name: 'تجربة مجانية',
    duration: 'لمرة واحدة',
    price: 0,
    sar: '0 ر.س',
    features: [
      '✓ 1 لعبة مجانية',
      '✓ 5 جولات',
      '✓ إحصائيات أساسية'
    ],
    badge: null,
    color: 'silver',
    popular: false
  },
  {
    id: 2,
    name: 'يوم واحد',
    duration: '24 ساعة',
    price: 15,
    sar: '15 ر.س',
    features: [
      '✓ لعب غير محدود',
      '✓ جميع الألعاب',
      '✓ إحصائيات مفصلة',
      '✓ رموز تخصيص'
    ],
    badge: 'الأفضل للتجربة',
    color: 'gold',
    popular: false
  },
  {
    id: 3,
    name: '3 أيام',
    duration: '72 ساعة',
    price: 35,
    sar: '35 ر.س',
    discount: '22%',
    features: [
      '✓ لعب غير محدود',
      '✓ جميع الألعاب',
      '✓ إحصائيات متقدمة',
      '✓ رموز تخصيص',
      '✓ بدون إعلانات',
      '✓ أولوية في الدعم'
    ],
    badge: 'الأكثر شهرة',
    color: 'purple',
    popular: true
  },
  {
    id: 4,
    name: 'أسبوع',
    duration: '7 أيام',
    price: 50,
    sar: '50 ر.س',
    discount: '52%',
    features: [
      '✓ لعب غير محدود',
      '✓ جميع الألعاب',
      '✓ إحصائيات متقدمة',
      '✓ رموز تخصيص',
      '✓ بدون إعلانات',
      '✓ أولوية في الدعم',
      '✓ شارات حصرية'
    ],
    badge: 'أفضل قيمة',
    color: 'green',
    popular: false
  }
];

export default function PricingScreen() {
  const [selectedPackage, setSelectedPackage] = useState(null);

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '24px',
        padding: '20px 0'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 900,
          background: 'linear-gradient(135deg, var(--gold), #ff8c00)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px'
        }}>
          💎 الباقات والأسعار
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          اختر الباقة المناسبة لك واستمتع بميزات إضافية
        </p>
      </div>

      {/* Packages Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '14px'
      }}>
        {PACKAGES.map(pkg => (
          <div
            key={pkg.id}
            onClick={() => setSelectedPackage(pkg.id)}
            style={{
              position: 'relative',
              background: pkg.popular
                ? 'linear-gradient(135deg, rgba(155,89,182,.15), rgba(100,50,150,.08))'
                : 'linear-gradient(135deg, rgba(240,192,64,.08), rgba(255,140,0,.04))',
              border: pkg.popular
                ? '2px solid var(--purple)'
                : '1.5px solid var(--border)',
              borderRadius: '14px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all .2s',
              transform: selectedPackage === pkg.id ? 'scale(1.02)' : 'scale(1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.borderColor = pkg.popular ? 'var(--purple)' : 'var(--gold)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = selectedPackage === pkg.id ? 'scale(1.02)' : 'scale(1)';
            }}
          >
            {/* Badge */}
            {pkg.badge && (
              <div style={{
                position: 'absolute',
                top: '-10px',
                right: '16px',
                background: pkg.color === 'gold' ? 'var(--gold)' : pkg.color === 'purple' ? 'var(--purple)' : 'var(--green)',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '10px',
                fontWeight: 700
              }}>
                {pkg.badge}
              </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 900,
                color: 'var(--text)',
                margin: '0 0 4px 0'
              }}>
                {pkg.name}
              </h3>
              <p style={{
                fontSize: '11px',
                color: 'var(--muted)',
                margin: '0'
              }}>
                {pkg.duration}
              </p>
            </div>

            {/* Price */}
            <div style={{
              marginBottom: '14px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,.06)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px'
              }}>
                <span style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  color: pkg.color === 'gold' ? 'var(--gold)' : pkg.color === 'purple' ? 'var(--purple)' : 'var(--green)',
                  fontFamily: "'Cairo', sans-serif"
                }}>
                  {pkg.price}
                </span>
                <span style={{
                  fontSize: '12px',
                  color: 'var(--muted)',
                  fontFamily: "'Cairo', sans-serif"
                }}>
                  {pkg.sar}
                </span>
              </div>
              {pkg.discount && (
                <span style={{
                  fontSize: '11px',
                  color: 'var(--green)',
                  fontWeight: 700,
                  marginTop: '4px',
                  display: 'inline-block'
                }}>
                  ✓ توفير {pkg.discount}
                </span>
              )}
            </div>

            {/* Features */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '14px'
            }}>
              {pkg.features.map((feature, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '11px',
                    color: 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ color: 'var(--green)' }}>✓</span>
                  {feature.replace('✓ ', '')}
                </div>
              ))}
            </div>

            {/* Button */}
            <button
              style={{
                width: '100%',
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all .2s',
                background: pkg.color === 'gold'
                  ? 'linear-gradient(135deg, var(--gold), #d4920a)'
                  : pkg.color === 'purple'
                  ? 'linear-gradient(135deg, var(--purple), #6c3480)'
                  : 'linear-gradient(135deg, var(--green), #1a8a50)',
                color: '#fff'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              {pkg.price === 0 ? 'ابدأ مجاناً' : 'اشترك الآن'}
            </button>
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{
        marginTop: '24px',
        padding: '14px',
        background: 'rgba(240,192,64,.06)',
        border: '1px solid rgba(240,192,64,.2)',
        borderRadius: '10px',
        fontSize: '11px',
        color: 'var(--muted)',
        lineHeight: '1.6',
        textAlign: 'center'
      }}>
        💡 جميع الباقات تشمل الوصول الكامل إلى جميع الألعاب المتاحة
        <br/>
        يمكنك إلغاء الاشتراك في أي وقت بدون رسوم إضافية
      </div>
    </div>
  );
}
