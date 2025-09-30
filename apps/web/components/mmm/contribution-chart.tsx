"use client"

import { useMemo, useState } from "react";

import type { MMMContributionPoint } from "@/lib/api/mmm";
import { formatCurrency, formatPercent } from "@/lib/format";

import { useMeasure } from "../charts/use-measure";

interface MMMContributionChartProps {
  data: MMMContributionPoint[]
  height?: number
}

interface StackedLayer {
  id: string
  name: string
  color: string
  upper: number
  lower: number
  value: number
  share: number
}

const DEFAULT_HEIGHT = 320
const PADDING = { top: 32, right: 24, bottom: 36, left: 64 }
const COLORS = [
  "#22d3ee",
  "#a855f7",
  "#f97316",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#60a5fa",
  "#c084fc",
]

export function MMMContributionChart({ data, height = DEFAULT_HEIGHT }: MMMContributionChartProps) {
  const { ref, width } = useMeasure<HTMLDivElement>(height)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const { stacked, totalMax, seriesOrder, times } = useMemo(() => {
    if (!data.length) {
      return { stacked: [] as StackedLayer[][], totalMax: 0, seriesOrder: [] as string[], times: [] as Date[] }
    }

    const channelOrder = data[0]!.channels.map((channel) => channel.id)
    const colorMap = new Map<string, string>()
    channelOrder.forEach((id, index) => {
      colorMap.set(id, COLORS[index % COLORS.length]!)
    })

    const stackedLayers: StackedLayer[][] = []
    let maxTotal = 0
    const timestamps: Date[] = []

    data.forEach((point) => {
      let baseline = 0
      const timestamp = new Date(point.time)
      timestamps.push(timestamp)
      const layers: StackedLayer[] = []
      channelOrder.forEach((id) => {
        const channel = point.channels.find((entry) => entry.id === id)
        const value = channel?.mean ?? 0
        const layer: StackedLayer = {
          id,
          name: channel?.name ?? id,
          color: colorMap.get(id) ?? "#10b981",
          lower: baseline,
          upper: baseline + value,
          value,
          share: channel?.share ?? 0,
        }
        layers.push(layer)
        baseline += value
      })
      maxTotal = Math.max(maxTotal, baseline)
      stackedLayers.push(layers)
    })

    return { stacked: stackedLayers, totalMax: maxTotal, seriesOrder: channelOrder, times: timestamps }
  }, [data])

  const chartWidth = Math.max(width, 320)
  const innerWidth = Math.max(chartWidth - PADDING.left - PADDING.right, 1)
  const innerHeight = Math.max(height - PADDING.top - PADDING.bottom, 1)

  const minTime = times.length ? times[0]!.getTime() : 0
  const maxTime = times.length ? times[times.length - 1]!.getTime() : 0

  const xScale = (timestamp: number) => {
    if (!times.length || maxTime === minTime) {
      return PADDING.left + innerWidth / 2
    }
    const ratio = (timestamp - minTime) / (maxTime - minTime)
    return PADDING.left + ratio * innerWidth
  }

  const yScale = (value: number) => {
    if (totalMax === 0) return PADDING.top + innerHeight
    const ratio = value / totalMax
    return PADDING.top + innerHeight - ratio * innerHeight
  }

  const paths = useMemo(() => {
    return seriesOrder.map((seriesId, seriesIndex) => {
      const upperPoints: string[] = []
      const lowerPoints: string[] = []

      stacked.forEach((layers, pointIndex) => {
        const layer = layers[seriesIndex]
        const time = times[pointIndex]
        if (!layer || !time) return
        const x = xScale(time.getTime())
        const upper = yScale(layer.upper)
        upperPoints.push(`${pointIndex === 0 ? "M" : "L"}${x},${upper}`)
      })

      for (let index = stacked.length - 1; index >= 0; index -= 1) {
        const layers = stacked[index]
        if (!layers) continue
        const layer = layers[seriesIndex]
        const time = times[index]
        if (!layer || !time) continue
        const x = xScale(time.getTime())
        const lower = yScale(layer.lower)
        lowerPoints.push(`L${x},${lower}`)
      }

      const color = stacked[0]?.[seriesIndex]?.color ?? COLORS[seriesIndex % COLORS.length] ?? "#10b981"
      const path = `${upperPoints.join(" ")} ${lowerPoints.join(" ")} Z`
      return { id: seriesId, color, path }
    })
  }, [seriesOrder, stacked, times, xScale, yScale])

  const handleMouseMove = (event: React.MouseEvent<SVGRectElement>) => {
    if (!stacked.length) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - bounds.left

    let closestIndex = 0
    let smallestDistance = Number.POSITIVE_INFINITY
    stacked.forEach((_, index) => {
      const time = times[index]
      if (!time) return
      const scaled = xScale(time.getTime())
      const distance = Math.abs(scaled - (event.clientX - bounds.left))
      if (distance < smallestDistance) {
        smallestDistance = distance
        closestIndex = index
      }
    })
    setHoverIndex(closestIndex)
  }

  const hoveredLayers =
    hoverIndex !== null && hoverIndex >= 0 && hoverIndex < stacked.length ? stacked[hoverIndex] : null
  const hoveredTime = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < times.length ? times[hoverIndex] : null

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      <svg width={chartWidth} height={height} className="overflow-visible">
        {paths.map((layer) => (
          <path key={layer.id} d={layer.path} fill={layer.color} fillOpacity={0.65} stroke="none" />
        ))}
        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          pointerEvents="all"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
        <text
          x={PADDING.left - 10}
          y={PADDING.top + 8}
          textAnchor="end"
          className="text-[10px] uppercase tracking-[0.3em] fill-emerald-200/60"
          transform={`rotate(-90, ${PADDING.left - 10}, ${PADDING.top + 8})`}
        >
          Contribution
        </text>
        <text
          x={chartWidth / 2}
          y={height - 8}
          textAnchor="middle"
          className="text-[10px] uppercase tracking-[0.3em] fill-emerald-200/60"
        >
          Time
        </text>
      </svg>
      {hoveredLayers && hoveredTime ? (
        <div className="pointer-events-none absolute left-1/2 top-6 w-72 -translate-x-1/2 rounded-md border border-emerald-400/40 bg-emerald-950/85 p-4 text-xs text-emerald-100 shadow-lg backdrop-blur">
          <p className="text-sm font-semibold text-emerald-50">
            {hoveredTime.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </p>
          <dl className="mt-3 space-y-2">
            {hoveredLayers.map((layer) => (
              <div key={layer.id} className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: layer.color }} />
                  <span>{layer.name}</span>
                </dt>
                <dd className="text-right">
                  <div>{formatCurrency(layer.value)}</div>
                  <div className="text-[10px] text-emerald-200/70">{formatPercent(layer.share)}</div>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-emerald-200/80 sm:grid-cols-3 lg:grid-cols-4">
        {seriesOrder.map((id, index) => {
          const layer = stacked[stacked.length - 1]?.[index]
          const color = layer?.color ?? COLORS[index % COLORS.length] ?? "#10b981"
          const name = layer?.name ?? id
          const latestValue = data[data.length - 1]?.channels.find((channel) => channel.id === id)
          return (
            <div key={id} className="flex items-center justify-between gap-2 rounded-md border border-emerald-400/20 bg-emerald-900/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                <span className="font-medium text-emerald-50/90">{name}</span>
              </div>
              <div className="text-right text-[11px] leading-tight">
                <div>{formatCurrency(latestValue?.mean ?? 0)}</div>
                <div className="text-emerald-200/60">{formatPercent(latestValue?.share ?? 0)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
