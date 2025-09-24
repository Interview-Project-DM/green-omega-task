"use client"

import { useMemo, useState } from "react"

import { useMeasure } from "./use-measure"

export interface TimeSeriesDatum {
  time: string
  value: number
}

interface TimeSeriesChartProps {
  data: TimeSeriesDatum[]
  height?: number
  color?: string
  showArea?: boolean
  valueFormatter?: (value: number) => string
  labelFormatter?: (date: Date) => string
  title?: string
  subtitle?: string
  xLabel?: string
  yLabel?: string
}

const DEFAULT_HEIGHT = 260
const PADDING = { top: 24, right: 24, bottom: 36, left: 48 }

export function TimeSeriesChart({
  data,
  height = DEFAULT_HEIGHT,
  color = "#34d399",
  showArea = false,
  valueFormatter = (value) => value.toLocaleString(),
  labelFormatter = (date) => date.toLocaleDateString(),
  title,
  subtitle,
  xLabel = "Time",
  yLabel = "Value",
}: TimeSeriesChartProps) {
  const { ref, width } = useMeasure<HTMLDivElement>(height)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const { points, areaPath, linePath, minY, maxY, minX, maxX } = useMemo(() => {
    if (!data.length) {
      return {
        points: [],
        areaPath: "",
        linePath: "",
        minY: 0,
        maxY: 0,
        minX: 0,
        maxX: 0,
      }
    }

    const parsed = data.map((item) => ({
      time: new Date(item.time),
      value: item.value,
    }))

    const minY = Math.min(...parsed.map((p) => p.value))
    const maxY = Math.max(...parsed.map((p) => p.value))
    const minX = Math.min(...parsed.map((p) => p.time.getTime()))
    const maxX = Math.max(...parsed.map((p) => p.time.getTime()))

    const chartWidth = Math.max(width, 320)
    const innerWidth = Math.max(chartWidth - PADDING.left - PADDING.right, 1)
    const innerHeight = Math.max(height - PADDING.top - PADDING.bottom, 1)

    const xScale = (timestamp: number) => {
      if (maxX === minX) {
        return PADDING.left + innerWidth / 2
      }
      const ratio = (timestamp - minX) / (maxX - minX)
      return PADDING.left + ratio * innerWidth
    }

    const yScale = (value: number) => {
      if (maxY === minY) {
        return PADDING.top + innerHeight / 2
      }
      const ratio = (value - minY) / (maxY - minY)
      return PADDING.top + innerHeight - ratio * innerHeight
    }

    const points = parsed.map((point) => ({
      x: xScale(point.time.getTime()),
      y: yScale(point.value),
      date: point.time,
      value: point.value,
    }))

    const firstPoint = points[0]
    const lastPoint = points[points.length - 1]

    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
      .join(" ")

    const areaPath = showArea && firstPoint && lastPoint
      ? `${points
          .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
          .join(" ")}
        L${lastPoint.x},${PADDING.top + innerHeight}
        L${firstPoint.x},${PADDING.top + innerHeight}
        Z`
          .replace(/\s+/g, " ")
      : ""

    return { points, areaPath, linePath, minY, maxY, minX, maxX }
  }, [data, height, showArea, width])

  const handleMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
    if (!points.length) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - bounds.left

    let closestIndex = 0
    let smallestDistance = Number.POSITIVE_INFINITY
    for (let index = 0; index < points.length; index += 1) {
      const distance = Math.abs(points[index]!.x - x)
      if (distance < smallestDistance) {
        smallestDistance = distance
        closestIndex = index
      }
    }
    setHoverIndex(closestIndex)
  }

  const hasData = points.length > 0
  const hoveredPoint =
    hoverIndex !== null && hoverIndex >= 0 && hoverIndex < points.length
      ? points[hoverIndex]
      : undefined

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
      <svg width={Math.max(width, 320)} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="timeseries-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        {showArea && areaPath ? (
          <path d={areaPath} fill="url(#timeseries-fill)" stroke="none" />
        ) : null}
        {linePath ? <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} /> : null}
        {points.map((point, index) => (
          <circle
            key={point.x}
            cx={point.x}
            cy={point.y}
            r={hoverIndex === index ? 4 : 3}
            fill={hoverIndex === index ? "#fff" : color}
            stroke={color}
            strokeWidth={hoverIndex === index ? 2 : 1}
          />
        ))}
        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={Math.max(width - PADDING.left - PADDING.right, 1)}
          height={Math.max(height - PADDING.top - PADDING.bottom, 1)}
          fill="transparent"
          pointerEvents="all"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
        {/* Y-axis label */}
        <text
          x={PADDING.left - 8}
          y={PADDING.top + 8}
          textAnchor="end"
          className="text-[10px] fill-emerald-200/60 uppercase tracking-[0.3em]"
          transform={`rotate(-90, ${PADDING.left - 8}, ${PADDING.top + 8})`}
        >
          {yLabel}
        </text>
        {/* X-axis label */}
        <text
          x={Math.max(width, 320) / 2}
          y={height - 8}
          textAnchor="middle"
          className="text-[10px] fill-emerald-200/60 uppercase tracking-[0.3em]"
        >
          {xLabel}
        </text>
      </svg>
      {hoveredPoint ? (
        <div
          className="pointer-events-none absolute rounded-md border border-emerald-400/40 bg-emerald-950/80 px-3 py-2 text-xs text-emerald-100 shadow-lg backdrop-blur"
          style={{
            left: Math.min(
              Math.max(hoveredPoint.x - 60, PADDING.left),
              Math.max(width, 320) - PADDING.right - 120,
            ),
            top: PADDING.top,
          }}
        >
          <div className="font-semibold text-emerald-200">
            {labelFormatter(hoveredPoint.date)}
          </div>
          <div>{valueFormatter(hoveredPoint.value)}</div>
        </div>
      ) : null}
      {hasData ? (
        <div className="absolute bottom-2 left-12 flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-[0.3em] text-emerald-200/50">
          <span>
            Min {valueFormatter(minY)} · Max {valueFormatter(maxY)}
          </span>
          <span>
            Range {labelFormatter(new Date(minX))} – {labelFormatter(new Date(maxX))}
          </span>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-emerald-200/60">
          No data available for the selected filters.
        </div>
      )}
    </div>
  )
}
