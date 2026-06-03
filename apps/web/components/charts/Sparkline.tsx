'use client';

import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  /** Tailwind/HSL color reference; defaults to the primary token. */
  color?: string;
  height?: number;
}

/**
 * Minimal inline area sparkline for StatCards. Renders a single smoothed area
 * with a faint gradient fill, no axes or tooltips.
 */
export function Sparkline({ data, color = 'hsl(var(--primary))', height = 40 }: SparklineProps) {
  const series = data.map((value, index) => ({ index, value }));
  const gradientId = `spark-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={series} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
