// src/components/Sparkline.tsx

type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
}

export const Sparkline = ({ values, width = 60, height = 20 }: SparklineProps) => {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1)) * innerWidth;
      const y = padding + innerHeight - ((v - min) / range) * innerHeight;
      return `${x},${y}`;
    })
    .join(' ');

  // Detect regression: last value > 1.5x average
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const lastValue = values[values.length - 1];
  // Defensive: values.length < 2 already early-returned above, but TS can't
  // see that under noUncheckedIndexedAccess.
  if (lastValue === undefined) return null;
  const isRegression = lastValue > avg * 1.5;
  const lastX = padding + innerWidth;
  const lastY =
    padding + innerHeight - ((lastValue - min) / range) * innerHeight;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block align-middle"
      aria-label={`Duration trend: ${values.map((v) => `${Math.round(v)}s`).join(', ')}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-ink-muted)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {isRegression && (
        <circle
          cx={lastX}
          cy={lastY}
          r="2.5"
          fill="var(--color-status-failure)"
          stroke="var(--color-canvas)"
          strokeWidth="1"
        />
      )}
    </svg>
  );
}
