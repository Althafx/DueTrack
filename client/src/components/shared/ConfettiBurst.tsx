const COLORS = ["#22c55e", "#16a34a", "#4ade80", "#facc15", "#38bdf8"];

function randomPiece(index: number) {
  const angle = (index / 14) * Math.PI * 2 + Math.random() * 0.5;
  const distance = 40 + Math.random() * 40;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance - 10;
  const rotation = Math.random() * 360 - 180;
  const color = COLORS[index % COLORS.length];
  const delay = Math.random() * 0.05;

  return {
    key: index,
    style: {
      "--confetti-x": `${x}px`,
      "--confetti-y": `${y}px`,
      "--confetti-r": `${rotation}deg`,
      backgroundColor: color,
      animationDelay: `${delay}s`,
    } as React.CSSProperties,
  };
}

export function ConfettiBurst() {
  const pieces = Array.from({ length: 14 }, (_, i) => randomPiece(i));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {pieces.map((piece) => (
        <span key={piece.key} className="confetti-piece" style={piece.style} />
      ))}
    </div>
  );
}
