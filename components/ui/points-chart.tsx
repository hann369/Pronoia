"use client"

import * as React from "react"
import { Star } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"

// Pronoia design tokens (the shadcn-style vars don't exist in globals.css)
const TOKENS = {
  border: "var(--border, rgba(100,130,180,0.15))",
  accent: "var(--theme-accent, #1A6AFF)",
  mutedText: "var(--text3, #6a7890)",
  popoverBg: "var(--bg2, #0f1118)",
}

interface PointsChartDataPoint {
  date: string
  total: number
  change: number
}

interface PointsChartLevel {
  value: number
  color: string
  label?: string
}

interface PointsChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: PointsChartDataPoint[]
  height?: number
  title?: string
  headerRight?: React.ReactNode
  yAxisLabel?: string
  levels?: PointsChartLevel[]
  /** Unit suffix in the tooltip, e.g. "€" */
  unit?: string
}

function formatValue(value: number) {
  return Math.round(value).toLocaleString("de-DE")
}

function LevelReferenceStarLabel({
  viewBox,
  color,
}: {
  viewBox?: { x?: number; y?: number } | null
  color: string
}) {
  const x = viewBox?.x
  const y = viewBox?.y

  if (typeof x !== "number" || typeof y !== "number") {
    return null
  }

  return (
    <g transform={`translate(${x - 14},${y})`}>
      <Star
        x={-5}
        y={-5}
        width={10}
        height={10}
        fill={color}
        stroke={color}
        strokeWidth={1.75}
      />
    </g>
  )
}

function PointsChart({
  data,
  height = 260,
  title = "Verlauf",
  headerRight,
  yAxisLabel,
  levels,
  unit = "",
  className,
  ...props
}: PointsChartProps) {
  const yDomain = React.useMemo<[number, number]>(() => {
    const values = [
      ...data.map((item) => item.total),
      ...(levels?.map((level) => level.value) ?? []),
    ]

    if (values.length === 0) return [0, 100]

    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const range = maxValue - minValue

    if (range === 0) {
      const padding = Math.max(Math.abs(maxValue) * 0.15, 10)
      return [minValue - padding, maxValue + padding]
    }

    const padding = Math.max(range * 0.12, 10)
    return [minValue - padding, maxValue + padding]
  }, [data, levels])

  return (
    <div className={cn("bg-card rounded-2xl border border-border p-4", className)} {...props}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-md text-foreground font-semibold">{title}</p>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
          >
            <CartesianGrid stroke={TOKENS.border} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fill: TOKENS.mutedText, fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              domain={yDomain}
              tick={{ fill: TOKENS.mutedText, fontSize: 12 }}
              tickFormatter={formatValue}
              width={64}
              label={
                yAxisLabel
                  ? {
                      value: yAxisLabel,
                      angle: -90,
                      position: "insideLeft",
                      fill: TOKENS.mutedText,
                      fontSize: 12,
                      dx: -18,
                    }
                  : undefined
              }
            />
            {levels?.map((level) => (
              <ReferenceLine
                key={level.value}
                y={level.value}
                stroke={level.color}
                strokeDasharray="6 6"
                strokeWidth={2}
                label={{
                  position: "left",
                  content: (labelProps: { viewBox?: unknown }) => (
                    <LevelReferenceStarLabel
                      viewBox={
                        (labelProps.viewBox as {
                          x?: number
                          y?: number
                        } | null) ?? null
                      }
                      color={level.color}
                    />
                  ),
                }}
              />
            ))}
            <Tooltip
              cursor={{ stroke: TOKENS.accent, strokeDasharray: "4 4" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const row = payload[0].payload as PointsChartDataPoint
                const changePrefix = row.change > 0 ? "+" : ""
                return (
                  <div
                    className="text-foreground rounded-lg border px-3 py-2 text-sm shadow-md"
                    style={{
                      borderColor: TOKENS.border,
                      backgroundColor: TOKENS.popoverBg,
                    }}
                  >
                    <p className="mb-1" style={{ color: TOKENS.mutedText }}>{label}</p>
                    <p className="font-medium tabular-nums">
                      {formatValue(row.total)} {unit}
                    </p>
                    <p className="text-xs tabular-nums" style={{ color: TOKENS.mutedText }}>
                      {changePrefix}
                      {formatValue(row.change)} {unit}
                    </p>
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke={TOKENS.accent}
              strokeWidth={2}
              connectNulls
              dot={{ r: 3, fill: TOKENS.accent }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export { PointsChart }
export type { PointsChartDataPoint, PointsChartProps }
