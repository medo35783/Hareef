import { useState } from 'react';

/* ══════════════════════════════════════════════════
   NEWS SCREEN
   - Display game news and updates
   - Simple list of announcements
══════════════════════════════════════════════════ */

const NEWS_DATA = [
  {
    id: 1,
    date: '2025-05-08',
    title: '🎉 إطلاق لعبة الألقاب الجديدة',
    body: 'تم إطلاق النسخة الجديدة من لعبة الألقاب مع تصميم محسّن وأداء أفضل!',
    isNew: true,
    category: 'game'
  },
  {
    id: 2,
    date: '2025-05-07',
    title: '🦅 قريباً: لعبة صيد القميري',
    body: 'نعمل على إطلاق لعبة صيد القميري الجديدة قريباً جداً. ترقبوا الإعلان!',
    isNew: true,
    category: 'game'
  },
  {
    id: 3,
    date: '2025-05-05',
    title: '🐛 إصلاح الأخطاء والتحسينات',
    body: 'تم إصلاح عدة أخطاء بسيطة وتحسين أداء التطبيق العام.',
    isNew: false,
    category: 'update'
  },
  {
    id: 4,
    date: '2025-05-01',
    title: '📱 تطبيق جديد على جميع الأجهزة',
    body: 'الآن يمكنك تشغيل التطبيق على جميع الأجهزة بسهولة!',
    isNew: false,
    category: 'announcement'
  }
];

export default function NewsScreen() {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const filteredNews = selectedCategory
    ? NEWS_DATA.filter(n => n.category === selectedCategory)
    : NEWS_DATA;

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
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
          🔔 الأخبار والتحديثات
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          ابق على اطلاع بأحدث التطورات
        </p>
      </div>

      {/* Categories */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        <button
          onClick={() => setSelectedCategory(null)}
          style={{
            padding: '8px 14px',
            border: selectedCategory === null ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,.1)',
            background: selectedCategory === null ? 'rgba(240,192,64,.1)' : 'transparent',
            color: selectedCategory === null ? 'var(--gold)' : 'var(--muted)',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            transition: 'all .2s'
          }}
        >
          كل الأخبار
        </button>
        {['game', 'update', 'announcement'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 14px',
              border: selectedCategory === cat ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,.1)',
              background: selectedCategory === cat ? 'rgba(240,192,64,.1)' : 'transparent',
              color: selectedCategory === cat ? 'var(--gold)' : 'var(--muted)',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              transition: 'all .2s'
            }}
          >
            {cat === 'game' && '🎮 ألعاب'}
            {cat === 'update' && '⚡ تحديثات'}
            {cat === 'announcement' && '📢 إعلانات'}
          </button>
        ))}
      </div>

      {/* News List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredNews.length > 0 ? (
          filteredNews.map(news => (
            <div
              key={news.id}
              style={{
                background: 'var(--card2)',
                border: '1px solid rgba(255,255,255,.06)',
                borderRadius: '11px',
                padding: '14px',
                transition: 'all .2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--gold)';
                e.currentTarget.style.background = 'rgba(240,192,64,.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)';
                e.currentTarget.style.background = 'var(--card2)';
              }}
            >
              {/* Date and Badge */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '10px',
                  color: 'var(--muted)',
                  fontWeight: 600
                }}>
                  📅 {new Date(news.date).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                {news.isNew && (
                  <span style={{
                    display: 'inline-block',
                    background: 'var(--red)',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    جديد
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '6px',
                margin: '0 0 6px 0'
              }}>
                {news.title}
              </h3>

              {/* Body */}
              <p style={{
                fontSize: '12px',
                color: 'var(--muted)',
                lineHeight: '1.6',
                margin: '0'
              }}>
                {news.body}
              </p>
            </div>
          ))
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--muted)'
          }}>
            <p>لا توجد أخبار في هذه الفئة</p>
          </div>
        )}
      </div>
    </div>
  );
}
