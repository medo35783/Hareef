/**
 * shared/Stars.jsx — خلفية النجوم المتلألئة
 */
export function Stars() {
  const stars = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x:   Math.random() * 100,
    y:   Math.random() * 100,
    sz:  Math.random() * 2 + 0.4,
    d:   Math.random() * 3,
    dur: Math.random() * 2 + 2,
  }));

  return (
    <div className="stars">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.x}%`,
            top:  `${s.y}%`,
            width: s.sz,
            height: s.sz,
            animationDelay:    `${s.d}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

export default Stars;
