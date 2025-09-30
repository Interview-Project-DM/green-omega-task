"use client"

import { useMemo } from "react"

import type { MMMResponseCurveChannel } from "@/lib/api/mmm"
import { formatCurrency } from "@/lib/format"

interface ResponseCurveGridProps {
  channels: MMMResponseCurveChannel[]
}

const WIDTH = 280
const HEIGHT = 200
const PADDING = { top: 24, right: 18, bottom: 36, left: 48 }

export function MMMResponseCurveGrid({ channels }: ResponseCurveGridProps) {
  if (!channels.length) {
    return (
      <div className="rounded-lg border border-emerald-400/20 bg-emerald-900/40 p-6 text-sm text-emerald-200/80">
        Response curve data is not available for this model.
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {channels.map((channel) => (
        <ResponseCurveCard key={channel.id} channel={channel} />
      ))}
    </div>
  )
}

function ResponseCurveCard({ channel }: { channel: MMMResponseCurveChannel }) {
  const curve = useMemo(() => computeCurve(channel), [channel])

  return (
    <div className="rounded-lg border border-emerald-400/20 bg-emerald-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-50/90">{channel.name}</h3>
        <div className="text-xs text-emerald-200/60">
          Sat. {formatCurrency(channel.saturation_spend)}
        </div>
      </div>
      <svg width={WIDTH} height={HEIGHT} className="overflow-visible">
        <defs>
          <linearGradient id={`${channel.id}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        {curve.areaPath ? (
          <path d={curve.areaPath} fill={`url(#${channel.id}-fill)`} stroke="none" />
        ) : null}
        {curve.linePath ? (
          <path d={curve.linePath} fill="none" stroke="#34d399" strokeWidth={2.5} />
        ) : null}
        <line
          x1={curve.saturationX}
          x2={curve.saturationX}
          y1={PADDING.top}
          y2={HEIGHT - PADDING.bottom}
          stroke="#fbbf24"
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
        <text
          x={curve.saturationX + 4}
          y={PADDING.top + 12}
          className="text-[10px] fill-amber-200/80"
        >
          Saturation
        </text>
        <line
          x1={curve.diminishingX}
          x2={curve.diminishingX}
          y1={PADDING.top}
          y2={HEIGHT - PADDING.bottom}
          stroke="#38bdf8"
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
        <text
          x={curve.diminishingX + 4}
          y={PADDING.top + 26}
          className="text-[10px] fill-sky-200/80"
        >
          Bend point
        </text>
        <text
          x={PADDING.left - 10}
          y={PADDING.top + 8}
          textAnchor="end"
          className="text-[10px] uppercase tracking-[0.3em] fill-emerald-200/60"
          transform={`rotate(-90, ${PADDING.left - 10}, ${PADDING.top + 8})`}
        >
          Conversions
        </text>
        <text
          x={WIDTH / 2}
          y={HEIGHT - 8}
          textAnchor="middle"
          className="text-[10px] uppercase tracking-[0.3em] fill-emerald-200/60"
        >
          Spend
        </text>
      </svg>
      <div className="mt-3 flex items-center justify-between text-xs text-emerald-200/70">
        <div>
          Max spend {formatCurrency(curve.maxSpend)}
        </div>
        <div>
          Max lift {formatCurrency(curve.maxLift)}
        </div>
      </div>
    </div>
  )
}

function computeCurve(channel: MMMResponseCurveChannel) {
  if (!channel.points.length) {
    return {
      areaPath: "",
      linePath: "",
      maxSpend: 0,
      maxLift: 0,
      saturationX: PADDING.left,
      diminishingX: PADDING.left,
    }
  }

  const spends = channel.points.map((point) => point.spend)
  const means = channel.points.map((point) => point.mean)
  const lowers = channel.points.map((point) => point.lower)
  const uppers = channel.points.map((point) => point.upper)

  const maxSpend = Math.max(...spends)
  const maxLift = Math.max(...means)

  const xScale = (value: number) => {
    if (maxSpend === 0) return PADDING.left
    const ratio = value / maxSpend
    return PADDING.left + ratio * (WIDTH - PADDING.left - PADDING.right)
  }

  const yScale = (value: number) => {
    if (maxLift === 0) return HEIGHT - PADDING.bottom
    const ratio = value / maxLift
    return PADDING.top + (1 - ratio) * (HEIGHT - PADDING.top - PADDING.bottom)
  }

  const linePath = means
    .map((value, index) => {
      const command = index === 0 ? "M" : "L"
      return `${command}${xScale(spends[index]!)},${yScale(value)}`
    })
    .join(" ")

  const upperBoundary = uppers
    .map((value, index) => {
      const command = index === 0 ? "M" : "L"
      return `${command}${xScale(spends[index]!)},${yScale(value)}`
    })
    .join(" ")

  const lowerBoundary = lowers
    .slice()
    .reverse()
    .map((value, index) => {
      const spend = spends[lowers.length - 1 - index]!
      return `L${xScale(spend)},${yScale(value)}`
    })
    .join(" ")

  const areaPath = upperBoundary ? `${upperBoundary} ${lowerBoundary} Z`.replace(/\s+/g, " ") : ""

  return {
    areaPath,
    linePath,
    maxSpend,
    maxLift,
    saturationX: xScale(channel.saturation_spend),
    diminishingX: xScale(channel.diminishing_returns_start),
  }
}
