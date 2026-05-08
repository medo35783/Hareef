/**
 * shared/Header.jsx
 * ──────────────────
 * الهيدر العلوي — يظهر في الصفحات فقط (لا يظهر داخل الألعاب)
 */
import { fmtMs } from "../core/helpers";

export default function Header({ isDomainAdmin = false, activeCode = null }) {
  return (
    <header className="hdr">
      <div className="logo">🎮 PFCC</div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isDomainAdmin && (
          <span className="badge ba">👑 Admin</span>
        )}

        {!isDomainAdmin && activeCode && (
          <span className="badge bvd" style={{ fontSize: 10 }}>
            ✅ {fmtMs(activeCode.expiresAt - Date.now())}
          </span>
        )}

        {!isDomainAdmin && !activeCode && (
          <span className="badge brd" style={{ fontSize: 10 }}>
            🔒 غير مفعّل
          </span>
        )}
      </div>
    </header>
  );
}
