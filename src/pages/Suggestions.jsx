/**
 * pages/Suggestions.jsx
 * ──────────────────────
 * صفحة المقترحات
 */
import { useState } from "react";
import { db } from "../core/firebase";
import { ref, push } from "firebase/database";

export default function Suggestions({ notify }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("feature");
  const [sending, setSending] = useState(false);

  const TYPES = [
    { id: "feature", label: "✨ فكرة جديدة" },
    { id: "bug",     label: "🐛 بلاغ خطأ"   },
    { id: "other",   label: "💬 تعليق عام"  },
  ];

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await push(ref(db, "suggestions"), {
        text: text.trim(),
        type,
        ts: Date.now(),
      });
      setText("");
      notify("✅ شكراً! تم إرسال مقترحك", "success");
    } catch {
      notify("❌ حدث خطأ، حاول مرة ثانية", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="scr">
      <div className="ptitle">💡 مقترحاتك</div>
      <div className="psub">رأيك يهمنا — شاركنا أفكارك لتطوير المنصة</div>

      <div className="card">
        {/* نوع المقترح */}
        <div className="blbl">نوع المقترح:</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {TYPES.map((t) => (
            <button
              key={t.id}
              className={`tab ${type === t.id ? "on" : ""}`}
              onClick={() => setType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* النص */}
        <div className="ig">
          <label className="lbl">اكتب مقترحك:</label>
          <textarea
            className="inp"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="مثال: أريد إضافة ميزة..."
            maxLength={500}
          />
          <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "left", marginTop: 3 }}>
            {text.length}/500
          </div>
        </div>

        <button className="btn bg" onClick={handleSend} disabled={sending || !text.trim()}>
          {sending ? "⏳ جاري الإرسال..." : "📤 إرسال المقترح"}
        </button>
      </div>
    </div>
  );
}
