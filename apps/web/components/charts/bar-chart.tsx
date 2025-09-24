"use client"

import { useMemo, useState } from "react"

import { useMeasure } from "./use-measure"

export interface BarDatum {
  label: string
  value: number
  secondary?: number
  color?: string
}

interface BarChartProps {
  data: BarDatum[]
  height?: number
  valueFormatter?: (datum: BarDatum) => string
  title?: string
  subtitle?: string
  xLabel?: string
  yLabel?: string
}

const DEFAULT_HEIGHT = 280
const BAR_HEIGHT = 32
const GAP = 14

export function BarChart({
  data,
  height = DEFAULT_HEIGHT,
  valueFormatter = (datum) => datum.value.toLocaleString(),
  title,
  subtitle,
  xLabel = "Channels",
  yLabel = "Value",
}: BarChartProps) {
  const { ref, width } = useMeasure<HTMLDivElement>(height)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const { bars, maxValue } = useMemo(() => {
    if (!data.length) {
      return { bars: [], maxValue: 0 }
    }
    const maxValue = Math.max(...data.map((item) => item.value)) || 1
    const bars = data.map((item, index) => ({
      ...item,
      index,
    }))
    return { bars, maxValue }
  }, [data])

  const chartWidth = Math.max(width, 320)
  const barAreaWidth = chartWidth - 160
  const computedHeight = Math.max(height, bars.length * (BAR_HEIGHT + GAP))

  return (
    <div ref={ref} className="relative w-full" style={{ height: computedHeight }}>
      {title ? (
        <div className="mb-4">
          <p className="text-sm font-medium text-emerald-200/80">{title}</p>
          {subtitle ? (
            <p className="text-xs text-emerald-200/60">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      <div className="relative">
        {/* Y-axis label */}
        <div className="absolute -left-12 top-1/2 -translate-y-1/2">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-200/60"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            {yLabel}
          </div>
        </div>
        {/* X-axis label */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-200/60">
            {xLabel}
          </div>
        </div>
        <div className="space-y-3">
          {bars.map((bar) => {
          const barWidth = (bar.value / maxValue) * barAreaWidth
          const isHover = hoverIndex === bar.index
          return (
            <div
              key={bar.label}
              className="flex items-center gap-4"
              onMouseEnter={() => setHoverIndex(bar.index)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <div className="w-36 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
                {bar.label}
              </div>
              <div className="relative flex-1">
                <div
                  className="rounded-full bg-emerald-900/40"
                  style={{ height: BAR_HEIGHT, width: barAreaWidth }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full shadow-lg"
                  style={{
                    width: Math.max(barWidth, 4),
                    background: bar.color || "linear-gradient(90deg, #22c55e, #16a34a)",
                    height: BAR_HEIGHT,
                    opacity: isHover ? 1 : 0.85,
                    transition: "width 0.2s ease, opacity 0.2s ease",
                  }}
                />
                <div
                  className="absolute inset-y-0 left-0 flex items-center justify-end pr-3 text-[11px] font-medium text-emerald-100"
                  style={{ width: Math.max(barWidth, 4) }}
                >
                  {valueFormatter(bar)}
                </div>
              </div>
            </div>
          )
        })}
        </div>
      </div>
      {!bars.length ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-emerald-200/60">
          No channel data available.
        </div>
      ) : null}
    </div>
  )
}
