import { useState } from 'react';
import { ref, get, update } from 'firebase/database';

/* ══════════════════════════════════════════════════
   CODE ACTIVATION COMPONENT
   - إدخال الكود
   - التحقق من الصلاحية
   - التفعيل وبدء الاشتراك
══════════════════════════════════════════════════ */

export default function CodeActivation({ db, onActivationSuccess, currentUser }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // الحصول على Device Fingerprint (بسيط)
  const getDeviceFingerprint = () => {
    const ua = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return btoa(`${ua}_${screen}_${tz}`).slice(0, 32);
  };

  // الحصول على IP Address (تقريبي - من الكلاينت)
  const [deviceInfo] = useState({
    fingerprint: getDeviceFingerprint(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    timestamp: Date.now()
  });

  // التحقق من الكود وتفعيله
  const handleActivateCode = async () => {
    const cleanCode = code.trim().toUpperCase();
    
    if (!cleanCode) {
      setError('يرجى إدخال الكود');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // البحث عن الكود في Firebase
      const codesRef = ref(db, 'codes');
      const snapshot = await get(codesRef);

      if (!snapshot.exists()) {
        setError('الكود غير موجود');
        setLoading(false);
        return;
      }

      // البحث عن الكود المطابق
      let foundCodeId = null;
      let foundCodeData = null;

      snapshot.forEach((child) => {
        if (child.val().code === cleanCode) {
          foundCodeId = child.key;
          foundCodeData = child.val();
        }
      });

      if (!foundCodeId) {
        setError('❌ الكود غير صحيح');
        setLoading(false);
        return;
      }

      // التحقق من حالة الكود
      if (foundCodeData.status === 'expired') {
        setError('⏰ هذا الكود منتهي الصلاحية');
        setLoading(false);
        return;
      }

      if (foundCodeData.status === 'active') {
        // التحقق من الأجهزة المفعلة
        const devices = foundCodeData.devices || {};
        const deviceCount = Object.keys(devices).length;

        // هل هذا الجهاز مفعّل مسبقاً؟
        const isCurrentDevice = Object.values(devices).some(
          d => d.fingerprint === deviceInfo.fingerprint
        );

        if (isCurrentDevice) {
          // نفس الجهاز - السماح بالدخول
          await saveActivationToUser(foundCodeId, foundCodeData);
          onActivationSuccess(foundCodeData);
          return;
        }

        if (deviceCount >= 2) {
          setError('⚠️ هذا الكود مستخدم على جهازين بالفعل!\nإذا كنت المالك الأصلي، تواصل مع الدعم لإزالة جهاز قديم.');
          setLoading(false);
          return;
        }
      }

      // تفعيل الكود
      const now = Date.now();
      const expiresAt = now + (foundCodeData.duration * 24 * 60 * 60 * 1000);

      const updates = {
        [`codes/${foundCodeId}/status`]: 'active',
        [`codes/${foundCodeId}/activatedAt`]: now,
        [`codes/${foundCodeId}/expiresAt`]: expiresAt,
        [`codes/${foundCodeId}/userId`]: currentUser?.uid || 'anonymous',
        [`codes/${foundCodeId}/devices/${deviceInfo.fingerprint}`]: {
          fingerprint: deviceInfo.fingerprint,
          userAgent: deviceInfo.userAgent,
          platform: deviceInfo.platform,
          activatedAt: now,
          lastUsed: now
        }
      };

      await update(ref(db), updates);

      // حفظ الكود في بيانات المستخدم
      await saveActivationToUser(foundCodeId, {
        ...foundCodeData,
        status: 'active',
        activatedAt: now,
        expiresAt: expiresAt
      });

      // نجح التفعيل!
      onActivationSuccess({
        ...foundCodeData,
        status: 'active',
        activatedAt: now,
        expiresAt: expiresAt
      });

    } catch (err) {
      console.error('خطأ في تفعيل الكود:', err);
      setError('حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  // حفظ معلومات التفعيل في ملف المستخدم
  const saveActivationToUser = async (codeId, codeData) => {
    if (currentUser?.uid) {
      const userCodeRef = ref(db, `users/${currentUser.uid}/activeCode`);
      await update(userCodeRef, {
        codeId: codeId,
        code: codeData.code,
        activatedAt: codeData.activatedAt,
        expiresAt: codeData.expiresAt,
        duration: codeData.duration
      });
    } else {
      // حفظ في localStorage للمستخدمين غير المسجلين
      localStorage.setItem('pfcc_active_code', JSON.stringify({
        codeId: codeId,
        code: codeData.code,
        activatedAt: codeData.activatedAt,
        expiresAt: codeData.expiresAt,
        duration: codeData.duration
      }));
    }
  };

  return (
    <div className="scr">
      <div className="ptitle">🎮 مرحباً بك في PFCC!</div>
      <div className="psub">لبدء اللعب، يرجى تفعيل كود الاشتراك</div>

      <div className="card">
        <div className="ctitle">🎫 تفعيل الكود</div>
        
        <div className="ig">
          <label className="lbl">أدخل كود الاشتراك:</label>
          <input
            type="text"
            className={`inp big ${error ? 'err-b' : ''}`}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
            placeholder="CODE-XXXXXX"
            maxLength={12}
            style={{ textAlign: 'center' }}
          />
          {error && <div className="err-msg">{error}</div>}
        </div>

        <button
          className="btn bg"
          onClick={handleActivateCode}
          disabled={loading || !code.trim()}
        >
          {loading ? '⏳ جاري التحقق...' : '✅ تفعيل الكود'}
        </button>

        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(79, 163, 224, 0.07)',
          border: '1px solid rgba(79, 163, 224, 0.2)',
          borderRadius: '10px',
          fontSize: '12px',
          color: 'var(--muted)',
          lineHeight: '1.8'
        }}>
          <div style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: '6px' }}>
            💡 ملاحظات هامة:
          </div>
          <div>• الكود يعمل على جهازين كحد أقصى</div>
          <div>• صالح لحين التفعيل (لا ينتهي قبل الاستخدام)</div>
          <div>• يبدأ العداد من لحظة التفعيل</div>
          <div>• احتفظ بالكود في مكان آمن</div>
        </div>
      </div>

      <div style={{
        textAlign: 'center',
        margin: '20px 0',
        color: 'var(--muted)',
        fontSize: '13px'
      }}>
        ──────── أو ────────
      </div>

      <button
        className="btn bo"
        onClick={() => window.location.href = '/pricing'}
      >
        💳 شراء اشتراك جديد
      </button>

      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'var(--card2)',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎁</div>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
          ليس لديك كود؟
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
          جرّب اللعبة مجاناً لمدة ساعة!
        </div>
        <button className="btn bv bsm">
          🆓 تجربة مجانية
        </button>
      </div>
    </div>
  );
}
