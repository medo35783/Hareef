/**
 * shared/Notif.jsx
 * ─────────────────
 * الإشعارات المنبثقة (Toast)
 * الأنواع: success | error | info | gold
 */
export default function Notif({ msg }) {
  if (!msg) return null;

  const typeClass = {
    success: "ns",
    error:   "ne",
    info:    "ni",
    gold:    "ng",
  };

  return (
    <div
      key={msg.id}
      className={`notif ${typeClass[msg.type] || "ni"}`}
    >
      {msg.text}
    </div>
  );
}
