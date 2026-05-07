import { useState } from 'react';

/* ══════════════════════════════════════════════════
   END GAME JOIN PROMPT
   - عرض إحصائيات اللاعب
   - دعوة للاشتراك
   - عرض الباقات
══════════════════════════════════════════════════ */

export default function EndGameJoinPrompt({ 
  playerStats, 
  winner, 
  onClose,
  onSubscribe,
  onTryFree 
}) {
  const [showPricing, setShowPricing] = useState(false);

  const packages = [
    { 
      duration: 1, 
      price: 15, 
      label: 'يوم واحد',
      icon: '🌟',
      features: ['إنشاء غرف غير محدودة', 'جميع الألعاب', '24 ساعة كاملة']
    },
    { 
      duration: 3, 
      price: 35, 
      label: '3 أيام',
      icon: '⭐',
      badge: 'الأشهر',
      discount: 22,
      features: ['إنشاء غرف غير محدودة', 'جميع الألعاب', '72 ساعة', 'أولوية الدعم']
    },
    { 
      duration: 7, 
      price: 50, 
      label: 'أسبوع',
      icon: '💎',
      badge: 'الأفضل',
      discount: 52,
      features: ['إنشاء غرف غير محدودة', 'جميع الألعاب', '7 أيام كاملة', 'أولوية الدعم', 'إحصائيات متقدمة']
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 300,
      background: 'linear-gradient(180deg, rgba(7, 7, 26, 0.98), rgba(15, 15, 34, 0.98))',
      overflowY: 'auto',
      padding: '20px',
      animation: 'fadeInFull 0.5s'
    }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        
        {/* Header - انتهت اللعبة */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px', animation: 'exitPop 0.6s ease' }}>
            🎉
          </div>
          <div style={{
            fontFamily: 'Cairo, sans-serif',
            fontSize: '28px',
            fontWeight: 900,
            background: 'linear-gradient(135deg, var(--gold), #ff8c00)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            اللعبة انتهت!
          </div>
          {winner && (
            <div style={{ fontSize: '15px', color: 'var(--muted)' }}>
              🏆 الفائز: <strong style={{ color: 'var(--gold)' }}>{winner}</strong>
            </div>
          )}
        </div>

        {/* إحصائيات اللاعب */}
        {playerStats && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="ctitle">📊 إحصائياتك</div>
            <div className="sg sg4">
              <div className="sbox">
                <div className="snum">{playerStats.rank || '-'}</div>
                <div className="slbl">الترتيب</div>
              </div>
              <div className="sbox">
                <div className="snum" style={{ color: 'var(--green)' }}>
                  {playerStats.hits || 0}
                </div>
                <div className="slbl">إصابات</div>
              </div>
              <div className="sbox">
                <div className="snum" style={{ color: 'var(--gold)' }}>
                  {playerStats.accuracy || 0}%
                </div>
                <div className="slbl">الدقة</div>
              </div>
              <div className="sbox">
                <div className="snum" style={{ color: 'var(--blue)' }}>
                  {playerStats.time || '-'}
                </div>
                <div className="slbl">الوقت</div>
              </div>
            </div>
          </div>
        )}

        {/* الدعوة للاشتراك */}
        {!showPricing ? (
          <>
            <div className="card" style={{ 
              background: 'linear-gradient(135deg, rgba(240, 192, 64, 0.1), rgba(255, 140, 0, 0.05))',
              border: '2px solid var(--gold)',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>💎</div>
              <div style={{
                fontFamily: 'Cairo, sans-serif',
                fontSize: '22px',
                fontWeight: 900,
                color: 'var(--gold)',
                marginBottom: '8px'
              }}>
                هل استمتعت باللعبة؟
              </div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px', lineHeight: '1.7' }}>
                🎮 احصل على اشتراكك الخاص وأنشئ غرفك!
              </div>

              {/* الميزات */}
              <div style={{
                background: 'var(--card2)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
                textAlign: 'right'
              }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: 700, 
                  color: 'var(--gold)',
                  marginBottom: '12px'
                }}>
                  ✨ مميزات الاشتراك:
                </div>
                {[
                  { icon: '✅', text: 'إنشاء غرف غير محدودة' },
                  { icon: '✅', text: 'كن المشرف وتحكم باللعبة' },
                  { icon: '✅', text: 'حفظ إحصائياتك وإنجازاتك' },
                  { icon: '✅', text: 'أولوية في الميزات الجديدة' }
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    marginBottom: '6px',
                    color: 'var(--text)'
                  }}>
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              <button
                className="btn bg"
                onClick={() => setShowPricing(true)}
                style={{ marginBottom: '8px' }}
              >
                💳 شاهد الباقات
              </button>

              <button
                className="btn bv bsm"
                onClick={onTryFree}
              >
                🎁 جرّب مجاناً أولاً
              </button>
            </div>

            {/* أزرار التنقل */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn bgh"
                style={{ flex: 1 }}
                onClick={onClose}
              >
                🏠 الرئيسية
              </button>
              <button
                className="btn bo"
                style={{ flex: 1 }}
                onClick={() => window.location.reload()}
              >
                🔄 لعبة جديدة
              </button>
            </div>
          </>
        ) : (
          /* عرض الباقات */
          <>
            <div style={{
              fontFamily: 'Cairo, sans-serif',
              fontSize: '24px',
              fontWeight: 900,
              textAlign: 'center',
              marginBottom: '20px',
              background: 'linear-gradient(135deg, var(--gold), #ff8c00)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              💎 اختر باقتك المثالية
            </div>

            {packages.map((pkg, idx) => (
              <div
                key={idx}
                className="card"
                style={{
                  background: pkg.badge 
                    ? 'linear-gradient(135deg, rgba(240, 192, 64, 0.12), rgba(255, 140, 0, 0.05))'
                    : 'var(--card)',
                  border: pkg.badge ? '2px solid var(--gold)' : '1px solid var(--border)',
                  marginBottom: '12px',
                  position: 'relative'
                }}
              >
                {pkg.badge && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '12px',
                    background: 'linear-gradient(135deg, var(--gold), #d4920a)',
                    color: '#07070f',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 900
                  }}>
                    🔥 {pkg.badge}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '28px' }}>{pkg.icon}</div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '16px' }}>
                        {pkg.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        ⏰ {pkg.duration} {pkg.duration === 1 ? 'يوم' : 'أيام'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'left' }}>
                    <div style={{
                      fontFamily: 'Cairo, sans-serif',
                      fontSize: '24px',
                      fontWeight: 900,
                      color: 'var(--gold)'
                    }}>
                      {pkg.price} ريال
                    </div>
                    {pkg.discount > 0 && (
                      <div style={{
                        fontSize: '10px',
                        color: 'var(--green)',
                        fontWeight: 700
                      }}>
                        🎁 وفّر {pkg.discount}%
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  background: 'var(--card2)',
                  borderRadius: '8px',
                  padding: '10px',
                  marginBottom: '12px'
                }}>
                  {pkg.features.map((feature, i) => (
                    <div key={i} style={{
                      fontSize: '11px',
                      color: 'var(--muted)',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{ color: 'var(--green)' }}>✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  className="btn bg"
                  onClick={() => onSubscribe(pkg)}
                >
                  🛒 اشترك الآن
                </button>
              </div>
            ))}

            <button
              className="btn bgh"
              onClick={() => setShowPricing(false)}
            >
              ← رجوع
            </button>
          </>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          padding: '16px',
          fontSize: '11px',
          color: 'var(--muted)'
        }}>
          🔒 الدفع آمن ومشفّر عبر MyFatoorah
          <br />
          💳 فيزا | ماستركارد | مدى | Apple Pay
        </div>
      </div>
    </div>
  );
}
