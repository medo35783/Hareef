import { useState, useEffect } from 'react';
import { ref, push, set, get, onValue, update } from 'firebase/database';

/* ══════════════════════════════════════════════════
   ADMIN CODES MANAGEMENT COMPONENT
   - توليد الأكواد
   - عرض الإحصائيات
   - إدارة الأكواد
══════════════════════════════════════════════════ */

export default function AdminCodesPanel({ db, currentUser }) {
  const [codes, setCodes] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Form state
  const [selectedDuration, setSelectedDuration] = useState(3);
  const [codeCount, setCodeCount] = useState(1);
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // الباقات المتاحة
  const packages = [
    { duration: 1, price: 15, label: 'يوم واحد', hours: 24, discount: 0 },
    { duration: 3, price: 35, label: '3 أيام', hours: 72, discount: 22 },
    { duration: 7, price: 50, label: 'أسبوع', hours: 168, discount: 52 }
  ];

  // تحميل الأكواد من Firebase
  useEffect(() => {
    const codesRef = ref(db, 'codes');
    const unsubscribe = onValue(codesRef, (snapshot) => {
      if (snapshot.exists()) {
        setCodes(snapshot.val());
      } else {
        setCodes({});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  // توليد كود عشوائي
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون O,0,I,1 لتجنب الالتباس
    let code = 'CODE-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // توليد أكواد جديدة
  const handleGenerateCodes = async () => {
    if (codeCount < 1 || codeCount > 100) {
      alert('يرجى إدخال عدد بين 1 و 100');
      return;
    }

    setGenerating(true);
    const newCodes = [];
    const selectedPackage = packages.find(p => p.duration === selectedDuration);

    try {
      for (let i = 0; i < codeCount; i++) {
        const code = generateRandomCode();
        const codeRef = push(ref(db, 'codes'));
        
        const codeData = {
          code: code,
          duration: selectedDuration,
          durationHours: selectedPackage.hours,
          price: selectedPackage.price,
          status: 'unused', // unused, active, expired
          type: 'standard', // standard, promotional, trial
          createdAt: Date.now(),
          createdBy: currentUser?.uid || 'admin',
          activatedAt: null,
          expiresAt: null,
          userId: null,
          devices: {},
          usageHistory: []
        };

        await set(codeRef, codeData);
        newCodes.push({ id: codeRef.key, ...codeData });
      }

      setGeneratedCodes(newCodes);
      setShowSuccess(true);
      
      // إخفاء رسالة النجاح بعد 5 ثواني
      setTimeout(() => setShowSuccess(false), 5000);
      
    } catch (error) {
      console.error('خطأ في توليد الأكواد:', error);
      alert('حدث خطأ أثناء توليد الأكواد');
    } finally {
      setGenerating(false);
    }
  };

  // حساب الإحصائيات
  const stats = {
    total: Object.keys(codes).length,
    unused: Object.values(codes).filter(c => c.status === 'unused').length,
    active: Object.values(codes).filter(c => c.status === 'active').length,
    expired: Object.values(codes).filter(c => c.status === 'expired').length
  };

  // تصدير الأكواد لـ CSV
  const exportToCSV = () => {
    const csvContent = [
      ['الكود', 'المدة', 'السعر', 'الحالة', 'تاريخ الإنشاء', 'تاريخ التفعيل'].join(','),
      ...Object.values(codes).map(code => [
        code.code,
        `${code.duration} أيام`,
        `${code.price} ريال`,
        code.status === 'unused' ? 'غير مستخدم' : code.status === 'active' ? 'مُفعّل' : 'منتهي',
        new Date(code.createdAt).toLocaleDateString('ar-SA'),
        code.activatedAt ? new Date(code.activatedAt).toLocaleDateString('ar-SA') : '-'
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `codes_${Date.now()}.csv`;
    link.click();
  };

  // نسخ الأكواد المولدة
  const copyGeneratedCodes = () => {
    const text = generatedCodes.map(c => c.code).join('\n');
    navigator.clipboard.writeText(text);
    alert('تم نسخ الأكواد!');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
        <div>جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="scr">
      {/* Header */}
      <div className="ptitle">👑 إدارة الأكواد</div>
      <div className="psub">توليد وإدارة أكواد الاشتراكات</div>

      {/* Success Message */}
      {showSuccess && (
        <div style={{
          background: 'linear-gradient(135deg, var(--green), #1a8a50)',
          color: '#fff',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '16px',
          animation: 'fi 0.3s ease'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>
            تم توليد {generatedCodes.length} كود بنجاح!
          </div>
          <button 
            className="btn bg bsm" 
            style={{ marginTop: '8px' }}
            onClick={copyGeneratedCodes}
          >
            📋 نسخ الأكواد
          </button>
        </div>
      )}

      {/* إحصائيات سريعة */}
      <div className="card">
        <div className="ctitle">📊 إحصائيات سريعة</div>
        <div className="sg sg4">
          <div className="sbox">
            <div className="snum">{stats.total}</div>
            <div className="slbl">إجمالي الأكواد</div>
          </div>
          <div className="sbox">
            <div className="snum" style={{ color: 'var(--blue)' }}>{stats.unused}</div>
            <div className="slbl">غير مستخدم</div>
          </div>
          <div className="sbox">
            <div className="snum" style={{ color: 'var(--green)' }}>{stats.active}</div>
            <div className="slbl">مُفعّل</div>
          </div>
          <div className="sbox">
            <div className="snum" style={{ color: 'var(--muted)' }}>{stats.expired}</div>
            <div className="slbl">منتهي</div>
          </div>
        </div>
      </div>

      {/* توليد أكواد جديدة */}
      <div className="card">
        <div className="ctitle">🎫 توليد أكواد جديدة</div>
        
        {/* اختيار الباقة */}
        <div className="blbl">اختر نوع الباقة:</div>
        <div className="bgrid" style={{ marginBottom: '16px' }}>
          {packages.map(pkg => (
            <div
              key={pkg.duration}
              className={`nt ${selectedDuration === pkg.duration ? 'nsel' : ''}`}
              onClick={() => setSelectedDuration(pkg.duration)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                {pkg.duration === 1 ? '🌟' : pkg.duration === 3 ? '⭐' : '💎'}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{pkg.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--gold)', marginTop: '4px' }}>
                {pkg.price} ريال
              </div>
              {pkg.discount > 0 && (
                <div style={{ fontSize: '10px', color: 'var(--green)', marginTop: '2px' }}>
                  وفّر {pkg.discount}%
                </div>
              )}
            </div>
          ))}
        </div>

        {/* عدد الأكواد */}
        <div className="ig">
          <label className="lbl">عدد الأكواد المطلوبة:</label>
          <input
            type="number"
            className="inp"
            value={codeCount}
            onChange={(e) => setCodeCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
            min="1"
            max="100"
            placeholder="1-100"
          />
        </div>

        {/* زر التوليد */}
        <button
          className="btn bg"
          onClick={handleGenerateCodes}
          disabled={generating}
        >
          {generating ? '⏳ جاري التوليد...' : '🎫 توليد الأكواد'}
        </button>
      </div>

      {/* الأكواد المولدة حديثاً */}
      {generatedCodes.length > 0 && (
        <div className="card">
          <div className="ctitle">✨ الأكواد المولدة حديثاً ({generatedCodes.length})</div>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto',
            background: 'var(--card2)',
            borderRadius: '8px',
            padding: '8px'
          }}>
            {generatedCodes.map((code, idx) => (
              <div key={idx} style={{
                padding: '8px 12px',
                background: '#09091e',
                borderRadius: '6px',
                marginBottom: '4px',
                fontFamily: 'Cairo, sans-serif',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--gold)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{code.code}</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  {code.duration} يوم - {code.price} ريال
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* قائمة جميع الأكواد */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div className="ctitle">📋 جميع الأكواد ({stats.total})</div>
          <button className="btn bgh bsm" onClick={exportToCSV}>
            📥 تصدير CSV
          </button>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {Object.entries(codes)
            .sort(([, a], [, b]) => b.createdAt - a.createdAt)
            .map(([id, code]) => (
              <CodeItem key={id} code={code} />
            ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   CODE ITEM COMPONENT
══════════════════════════════════════════════════ */
function CodeItem({ code }) {
  const statusColors = {
    unused: { bg: 'rgba(79, 163, 224, 0.1)', border: 'var(--blue)', text: 'var(--blue)', label: '🆕 جديد' },
    active: { bg: 'rgba(46, 204, 113, 0.1)', border: 'var(--green)', text: 'var(--green)', label: '✅ مُفعّل' },
    expired: { bg: 'rgba(122, 116, 160, 0.1)', border: 'var(--muted)', text: 'var(--muted)', label: '⏰ منتهي' }
  };

  const status = statusColors[code.status] || statusColors.unused;

  return (
    <div style={{
      background: status.bg,
      border: `1px solid ${status.border}`,
      borderRadius: '10px',
      padding: '12px',
      marginBottom: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{
          fontFamily: 'Cairo, sans-serif',
          fontSize: '15px',
          fontWeight: 900,
          color: 'var(--gold)',
          letterSpacing: '1px'
        }}>
          {code.code}
        </div>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: status.text,
          background: status.bg,
          padding: '4px 10px',
          borderRadius: '6px',
          border: `1px solid ${status.border}`
        }}>
          {status.label}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--muted)' }}>
        <div>
          ⏰ <strong>{code.duration}</strong> {code.duration === 1 ? 'يوم' : 'أيام'}
        </div>
        <div>
          💰 <strong>{code.price}</strong> ريال
        </div>
        <div>
          📅 <strong>{new Date(code.createdAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</strong>
        </div>
      </div>

      {code.activatedAt && (
        <div style={{ 
          fontSize: '10px', 
          color: 'var(--green)', 
          marginTop: '6px',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255,255,255,0.05)'
        }}>
          ✅ فُعّل في: {new Date(code.activatedAt).toLocaleString('ar-SA')}
          {code.expiresAt && (
            <> | ينتهي: {new Date(code.expiresAt).toLocaleDateString('ar-SA')}</>
          )}
        </div>
      )}
    </div>
  );
}
