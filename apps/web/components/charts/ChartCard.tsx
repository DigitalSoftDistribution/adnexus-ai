'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ChartType = 'area' | 'line' | 'bar' | 'donut';

export interface ChartSeries {
  key: string;
  label: string;
  /** CSS color (defaults to a rotating chart token). */
  color?: string;
}

interface ChartCardProps {
  title?: string;
  description?: string;
  type: ChartType;
  data: Array<Record<string, string | number>>;
  series: ChartSeries[];
  /** Key used for the category axis (x axis or donut name). */
  xKey?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
  actions?: React.ReactNode;
  className?: string;
  bare?: boolean;
}

const CHART_TOKENS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function colorFor(series: ChartSeries, index: number): string {
  return series.color ?? CHART_TOKENS[index % CHART_TOKENS.length];
}

const axisProps = {
  stroke: 'hsl(var(--muted-foreground))',
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip(formatter?: (value: number) => string) {
  return (
    <Tooltip
      cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
      contentStyle={{
        background: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '0.75rem',
        fontSize: '12px',
        color: 'hsl(var(--popover-foreground))',
      }}
      formatter={(value) => (formatter ? formatter(Number(value)) : value)}
    />
  );
}

function renderChart(props: ChartCardProps) {
  const { type, data, series, xKey = 'name', valueFormatter } = props;

  if (type === 'donut') {
    const s = series[0];
    return (
      <PieChart>
        {ChartTooltip(valueFormatter)}
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
        />
        <Pie
          data={data}
          dataKey={s.key}
          nameKey={xKey}
          innerRadius="58%"
          outerRadius="80%"
          paddingAngle={2}
          stroke="hsl(var(--card))"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={CHART_TOKENS[index % CHART_TOKENS.length]} />
          ))}
        </Pie>
      </PieChart>
    );
  }

  if (type === 'bar') {
    return (
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={48} />
        {ChartTooltip(valueFormatter)}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={colorFor(s, i)} radius={[6, 6, 0, 0]} />
        ))}
      </BarChart>
    );
  }

  if (type === 'line') {
    return (
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={48} />
        {ChartTooltip(valueFormatter)}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={colorFor(s, i)}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    );
  }

  // area (default)
  return (
    <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorFor(s, i)} stopOpacity={0.3} />
            <stop offset="100%" stopColor={colorFor(s, i)} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
      <XAxis dataKey={xKey} {...axisProps} />
      <YAxis {...axisProps} width={48} />
      {ChartTooltip(valueFormatter)}
      {series.map((s, i) => (
        <Area
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={s.label}
          stroke={colorFor(s, i)}
          strokeWidth={2}
          fill={`url(#area-${s.key})`}
        />
      ))}
    </AreaChart>
  );
}

/**
 * Themed recharts wrapper. Renders area/line/bar/donut from a generic data
 * array + series config, styled with the app's chart tokens. Pass `bare` to
 * render just the chart without the card chrome.
 */
export function ChartCard(props: ChartCardProps) {
  const { title, description, height = 300, actions, className, bare } = props;

  const chart = (
    <ResponsiveContainer width="100%" height={height}>
      {renderChart(props)}
    </ResponsiveContainer>
  );

  if (bare) {
    return <div className={className}>{chart}</div>;
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      {(title || actions) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions}
        </CardHeader>
      )}
      <CardContent className="pt-4">{chart}</CardContent>
    </Card>
  );
}
