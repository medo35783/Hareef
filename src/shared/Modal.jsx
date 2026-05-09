/**
 * shared/Modal.jsx
 * ─────────────────
 * نافذة منبثقة عامة قابلة للاستخدام في أي مكان
 * Props: icon, title, sub, children, onClose
 */
export default function Modal({ icon, title, sub, children, onClose }) {
  return (
    <div className="mbg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {icon  && <div className="micn">{icon}</div>}
        {title && <div className="mtitle">{title}</div>}
        {sub   && <div className="msub">{sub}</div>}
        {children}
      </div>
    </div>
  );
}
