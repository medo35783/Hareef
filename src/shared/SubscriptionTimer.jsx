import { useState, useEffect } from 'react';

/* ══════════════════════════════════════════════════
   SUBSCRIPTION TIMER COMPONENT
   - عرض الوقت المتبقي
   - التحديث التلقائي كل دقيقة
   - تنبيهات الانتهاء
══════════════════════════════════════════════════ */

export default function SubscriptionTimer({ activeCode, onExpired }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!activeCode || !activeCode.expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = activeCode.expiresAt - now;

      if (remaining <= 0) {
        setTimeLeft('انتهى');
        if (onExpired) onExpired();
        return;
      }

      // حساب الوقت المتبقي
      const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
      const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

      // تحديد إذا كان الاشتراك ينتهي قريباً (أقل من 3 ساعات)
      setIsExpiringSoon(remaining < 3 * 60 * 60 * 1000);

      // صياغة النص
      if (days > 0) {
        setTimeLeft(`${days} يوم`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} ساعة`);
      } else {
        setTimeLeft(`${minutes} دقيقة`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // تحديث كل دقيقة

    return () => clearInterval(interval);
  }, [activeCode, onExpired]);

  if (!activeCode) return null;

  return (
    <>
      {/* المؤشر في الـ Header */}
      <div
        onClick={() => setShowDetails(!showDetails)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: isExpiringSoon 
            ? 'rgba(230, 57, 80, 0.15)' 
            : 'rgba(46, 204, 113, 0.15)',
          border: `1px solid ${isExpiringSoon ? 'var(--red)' : 'var(--green)'}`,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontSize: '12px',
          fontWeight: 700,
          color: isExpiringSoon ? 'var(--red)' : 'var(--green)'
        }}
      >
        <span>{isExpiringSoon ? '⚠️' : '⏳'}</span>
        <span>{timeLeft}</span>
      </div>

      {/* نافذة التفاصيل */}
      {showDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeInFull 0.3s'
          }}
          onClick={() => setShowDetails(false)}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              animation: 'fi 0.3s'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              textAlign: 'center',
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              {isExpiringSoon ? '⚠️' : '✅'}
            </div>

            <div style={{
              fontFamily: 'Cairo, sans-serif',
              fontSize: '20px',
              fontWeight: 900,
              textAlign: 'center',
              marginBottom: '8px',
              color: isExpiringSoon ? 'var(--red)' : 'var(--green)'
            }}>
              {isExpiringSoon ? 'اشتراكك ينتهي قريباً!' : 'اشتراكك نشط'}
            </div>

            <div style={{
              padding: '16px',
              background: 'var(--card2)',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '13px'
              }}>
                <span style={{ color: 'var(--muted)' }}>🎫 الكود:</span>
                <span style={{ 
                  fontFamily: 'Cairo, sans-serif',
                  fontWeight: 700,
                  color: 'var(--gold)'
                }}>
                  {activeCode.code}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '13px'
              }}>
                <span style={{ color: 'var(--muted)' }}>⏰ المدة:</span>
                <span style={{ fontWeight: 700 }}>
                  {activeCode.duration} {activeCode.duration === 1 ? 'يوم' : 'أيام'}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '13px'
              }}>
                <span style={{ color: 'var(--muted)' }}>📅 ينتهي في:</span>
                <span style={{ fontWeight: 700 }}>
                  {new Date(activeCode.expiresAt).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <span style={{ color: 'var(--muted)' }}>⏳ الوقت المتبقي:</span>
                <span style={{ 
                  fontWeight: 900,
                  fontSize: '16px',
                  color: isExpiringSoon ? 'var(--red)' : 'var(--green)'
                }}>
                  {timeLeft}
                </span>
              </div>
            </div>

            {isExpiringSoon && (
              <button
                className="btn bg"
                onClick={() => window.location.href = '/pricing'}
                style={{ marginBottom: '8px' }}
              >
                🔄 جدّد الاشتراك الآن
              </button>
            )}

            <button
              className="btn bgh"
              onClick={() => setShowDetails(false)}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════
   HELPER: Check if code is still valid
══════════════════════════════════════════════════ */
export function isCodeValid(activeCode) {
  if (!activeCode || !activeCode.expiresAt) return false;
  return Date.now() < activeCode.expiresAt;
}

/* ══════════════════════════════════════════════════
   HELPER: Get active code from localStorage or user data
══════════════════════════════════════════════════ */
export async function getActiveCode(db, userId) {
  // محاولة الحصول على الكود من Firebase
  if (userId) {
    try {
      const { ref, get } = await import('firebase/database');
      const snapshot = await get(ref(db, `users/${userId}/activeCode`));
      if (snapshot.exists()) {
        const codeData = snapshot.val();
        if (isCodeValid(codeData)) {
          return codeData;
        }
      }
    } catch (err) {
      console.error('Error fetching code from Firebase:', err);
    }
  }

  // محاولة الحصول على الكود من localStorage
  try {
    const stored = localStorage.getItem('pfcc_active_code');
    if (stored) {
      const codeData = JSON.parse(stored);
      if (isCodeValid(codeData)) {
        return codeData;
      } else {
        // حذف الكود المنتهي
        localStorage.removeItem('pfcc_active_code');
      }
    }
  } catch (err) {
    console.error('Error reading from localStorage:', err);
  }

  return null;
}
