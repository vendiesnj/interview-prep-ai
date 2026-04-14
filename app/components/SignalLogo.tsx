// Signal waveform logo - SVG component
// Renders a stylized audio waveform (7 bars, tallest in center)
// inside a rounded rectangle with a blue gradient.

let _idCounter = 0;

export interface SignalLogoProps {
  size?: number;
  /** Border radius as a fraction of size (default 0.26) */
  radiusFraction?: number;
}

export function SignalLogoIcon({ size = 28, radiusFraction = 0.26 }: SignalLogoProps) {
  // Use a stable per-render ID to avoid gradient conflicts when rendered multiple times
  const id = `slg-${size}`;
  const r = Math.round(size * radiusFraction);

  // 7 bars, symmetric. Heights as fractions of icon size.
  // Bars are centered vertically inside the icon.
  const BAR_HEIGHTS = [0.22, 0.42, 0.62, 0.78, 0.62, 0.42, 0.22];
  const BAR_OPACITIES = [0.55, 0.70, 0.85, 1.0, 0.85, 0.70, 0.55];

  const barW   = size * 0.094;
  const barGap = size * 0.038;
  const totalW = BAR_HEIGHTS.length * barW + (BAR_HEIGHTS.length - 1) * barGap;
  const startX = (size - totalW) / 2;
  const barRx  = barW / 2; // fully pill-shaped

  const bars = BAR_HEIGHTS.map((hFrac, i) => {
    const h = size * hFrac;
    const x = startX + i * (barW + barGap);
    const y = (size - h) / 2;
    return { x, y, w: barW, h, rx: barRx, opacity: BAR_OPACITIES[i] };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Signal"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2={size} y2={size} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width={size} height={size} rx={r} fill={`url(#${id})`} />

      {/* Waveform bars */}
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={bar.y}
          width={bar.w}
          height={bar.h}
          rx={bar.rx}
          fill="white"
          fillOpacity={bar.opacity}
        />
      ))}
    </svg>
  );
}

// Wordmark: "Signal" rendered as styled SVG text for crisp rendering at all sizes
export function SignalWordmark({ height = 18 }: { height?: number }) {
  return (
    <span
      style={{
        fontSize: height,
        fontWeight: 800,
        letterSpacing: -0.4,
        background: "linear-gradient(135deg, #2563EB, #0EA5E9)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      Signal
    </span>
  );
}

// Combined lockup: icon + wordmark
export function SignalLockup({ iconSize = 28 }: { iconSize?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: iconSize * 0.28 }}>
      <SignalLogoIcon size={iconSize} />
      <SignalWordmark height={iconSize * 0.56} />
    </span>
  );
}
