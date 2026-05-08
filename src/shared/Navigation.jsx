/**
 * shared/Navigation.jsx
 * ──────────────────────
 * شريط التنقل السفلي
 * يستقبل: tab, onTabChange, isDomainAdmin, hasNews, isInGame, onExitGame
 */

export default function Navigation({
  tab,
  onTabChange,
  isDomainAdmin = false,
  hasNews = false,
  isInGame = false,
  onExitGame,
}) {
  // داخل لعبة — يظهر زر الخروج فقط
  if (isInGame) {
    return (
      <nav className="bnav">
        <button className="bnav-item" onClick={onExitGame}>
          <span className="bnav-icon">🏠</span>
          <span className="bnav-label">خروج</span>
        </button>
      </nav>
    );
  }

  const items = [
    { id: "game",    icon: "🎮", label: "الألعاب" },
    { id: "news",    icon: "📢", label: "الأخبار", dot: hasNews },
    { id: "plans",   icon: "💎", label: "الباقات" },
    { id: "suggest", icon: "💡", label: "اقتراح" },
  ];

  if (isDomainAdmin) {
    items.push({ id: "admin", icon: "🔑", label: "الأكواد" });
  }

  return (
    <nav className="bnav">
      {items.map((item) => (
        <button
          key={item.id}
          className={`bnav-item ${tab === item.id ? "active" : ""}`}
          onClick={() => onTabChange(item.id)}
        >
          <span className="bnav-icon">{item.icon}</span>
          <span className="bnav-label">{item.label}</span>
          {item.dot && <span className="bnav-dot" />}
        </button>
      ))}
    </nav>
  );
}
