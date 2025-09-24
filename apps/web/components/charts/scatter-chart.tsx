"use client"

import { useMemo } from "react"

import { useMeasure } from "./use-measure"

export interface ScatterDatum {
  label: string
  x: number
  y: number
}

interface ScatterChartProps {
  data: ScatterDatum[]
  xLabel?: string
  yLabel?: string
  height?: number
  pointColor?: string
  title?: string
  subtitle?: string
  xFormatter?: (value: number) => string
  yFormatter?: (value: number) => string
}

const DEFAULT_HEIGHT = 280
const PADDING = { top: 32, right: 32, bottom: 48, left: 56 }

export function ScatterChart({
  data,
  xLabel = "Spend",
  yLabel = "Conversions",
  height = DEFAULT_HEIGHT,
  pointColor = "#34d399",
  title,
  subtitle,
  xFormatter = (value) => value.toLocaleString(),
  yFormatter = (value) => value.toLocaleString(),
}: ScatterChartProps) {
  const { ref, width } = useMeasure<HTMLDivElement>(height)

  const { points, minX, maxX, minY, maxY } = useMemo(() => {
    if (!data.length) {
      return { points: [], minX: 0, maxX: 0, minY: 0, maxY: 0 }
    }

    const minX = Math.min(...data.map((datum) => datum.x))
    const maxX = Math.max(...data.map((datum) => datum.x))
    const minY = Math.min(...data.map((datum) => datum.y))
    const maxY = Math.max(...data.map((datum) => datum.y))

    const chartWidth = Math.max(width, 320)
    const innerWidth = Math.max(chartWidth - PADDING.left - PADDING.right, 1)
    const innerHeight = Math.max(height - PADDING.top - PADDING.bottom, 1)

    const scaleX = (value: number) => {
      if (maxX === minX) return PADDING.left + innerWidth / 2
      return PADDING.left + ((value - minX) / (maxX - minX)) * innerWidth
    }

    const scaleY = (value: number) => {
      if (maxY === minY) return PADDING.top + innerHeight / 2
      return PADDING.top + innerHeight - ((value - minY) / (maxY - minY)) * innerHeight
    }

    const points = data.map((datum) => ({
      ...datum,
      cx: scaleX(datum.x),
      cy: scaleY(datum.y),
    }))
    return { points, minX, maxX, minY, maxY }
  }, [data, height, width])

  const chartWidth = Math.max(width, 320)

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {title ? (
        <div className="mb-4">
          <p className="text-sm font-medium text-emerald-200/80">{title}</p>
          {subtitle ? (
            <p className="text-xs text-emerald-200/60">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      <svg width={chartWidth} height={height} className="overflow-visible">
        <line
          x1={PADDING.left}
          y1={height - PADDING.bottom}
          x2={chartWidth - PADDING.right}
          y2={height - PADDING.bottom}
          stroke="#1f2937"
          strokeWidth={1}
          opacity={0.4}
        />
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={height - PADDING.bottom}
          stroke="#1f2937"
          strokeWidth={1}
          opacity={0.4}
        />
        {points.map((point) => (
          <g key={`${point.label}-${point.cx}-${point.cy}`}>
            <circle cx={point.cx} cy={point.cy} r={6} fill={pointColor} opacity={0.8} />
            <text
              x={point.cx + 8}
              y={point.cy - 8}
              className="text-[10px] fill-emerald-100"
            >
              {point.label}
            </text>
          </g>
        ))}
        <text
          x={PADDING.left}
          y={PADDING.top - 10}
          className="text-[10px] fill-emerald-200/60 uppercase tracking-[0.3em]"
        >
          {yLabel}
        </text>
        <text
          x={chartWidth - PADDING.right}
          y={height - PADDING.bottom + 24}
          textAnchor="end"
          className="text-[10px] fill-emerald-200/60 uppercase tracking-[0.3em]"
        >
          {xLabel}
        </text>
      </svg>
      {!points.length ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-emerald-200/60">
          Not enough data to chart efficiency.
        </div>
      ) : null}
      {points.length ? (
        <div className="absolute bottom-2 left-12 flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-[0.3em] text-emerald-200/50">
          <span>
            X {xFormatter(minX)} – {xFormatter(maxX)}
          </span>
          <span>
            Y {yFormatter(minY)} – {yFormatter(maxY)}
          </span>
        </div>
      ) : null}
    </div>
  )
}
