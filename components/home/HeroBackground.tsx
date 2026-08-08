const DOTS = [
  { x: 40, y: 30, color: "#22c55e", delay: "0s" },
  { x: 140, y: 60, color: "#ef4444", delay: "0.6s" },
  { x: 60, y: 280, color: "#f97316", delay: "1.2s" },
  { x: 180, y: 300, color: "#eab308", delay: "1.8s" },
  { x: 760, y: 40, color: "#ef4444", delay: "0.3s" },
  { x: 640, y: 30, color: "#22c55e", delay: "0.9s" },
  { x: 750, y: 270, color: "#f97316", delay: "1.5s" },
  { x: 620, y: 300, color: "#eab308", delay: "0.2s" },
];

export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <svg
        viewBox="0 0 800 320"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <defs>
          {/* City-grid pattern */}
          <pattern id="city-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="hsl(245 45% 84%)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width="800" height="320" fill="url(#city-grid)" />

        {/* Faint route lines connecting a few points, evoking a live map */}
        <path
          d="M40,30 Q100,120 140,60 T180,300"
          fill="none"
          stroke="hsl(245 55% 78%)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
        <path
          d="M760,40 Q700,150 750,270 T620,300"
          fill="none"
          stroke="hsl(181 55% 75%)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />

        {DOTS.map((d, i) => (
          <g key={i}>
            <circle cx={d.x} cy={d.y} r="5" fill={d.color} />
            <circle cx={d.x} cy={d.y} r="5" fill={d.color} className="radar-ping" style={{ animationDelay: d.delay }} />
          </g>
        ))}
      </svg>
    </div>
  );
}