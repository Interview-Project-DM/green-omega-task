"use client"

import { useEffect, useMemo, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";

import {
  ChannelAggregate,
  GeoListItem,
  GeoSeriesResponse,
  NationalSeriesResponse,
  SummaryMetric,
  getChannelAggregates,
  getGeoIndex,
  getGeoSeries,
  getNationalSeries,
  getSummary,
} from "@/lib/api/marketing-mix";
import { formatCompactNumber, formatCurrency, formatPercent } from "@/lib/format";
import { ChannelContributionTable } from "./channel-contribution-table";
import { BarChart } from "./charts/bar-chart";
import { ScatterChart } from "./charts/scatter-chart";
import { TimeSeriesChart } from "./charts/time-series-chart";

interface GeoTotals {
  spend: number
  conversions: number
  revenue: number
  roas: number
  cac: number
  promoRate: number
  avgEfficiency: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const DATE_RANGE_OPTIONS = [
  { id: "8w", label: "Last 8 weeks" },
  { id: "12w", label: "Last 12 weeks" },
  { id: "all", label: "All time" },
] as const

type DateRangeKey = (typeof DATE_RANGE_OPTIONS)[number]["id"]

export function MarketingMixDashboard() {
  const [initialized, setInitialized] = useState(false)
  const [loadingGeo, setLoadingGeo] = useState(false)
  const [geoItems, setGeoItems] = useState<GeoListItem[]>([])
  const [selectedGeo, setSelectedGeo] = useState<string>("")
  const [geoSeries, setGeoSeries] = useState<GeoSeriesResponse | null>(null)
  const [nationalSeries, setNationalSeries] = useState<NationalSeriesResponse | null>(null)
  const [channelAggregates, setChannelAggregates] = useState<ChannelAggregate[]>([])
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetric[]>([])

  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeKey>("12w")
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])


  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const [geos, summary, channels, national] = await Promise.all([
          getGeoIndex(),
          getSummary(),
          getChannelAggregates(),
          getNationalSeries(),
        ])
        if (cancelled) return
        setGeoItems(geos)
        setSummaryMetrics(summary.metrics)

        setChannelAggregates(channels)
        setNationalSeries(national)
        const firstGeo = geos[0]
        if (firstGeo) {
          setSelectedGeo(firstGeo.geo)
        }

        setInitialized(true)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load marketing mix data")
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedGeo) return
    let cancelled = false
    async function loadGeo() {
      try {
        setLoadingGeo(true)
        const series = await getGeoSeries(selectedGeo)
        if (cancelled) return
        setGeoSeries(series)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load geo data")
      } finally {
        if (!cancelled) {
          setLoadingGeo(false)
        }
      }
    }
    loadGeo()
    return () => {
      cancelled = true
    }
  }, [selectedGeo])

  const filteredGeoPoints = useMemo(() => filterPointsByRange(geoSeries?.points, dateRange), [
    geoSeries,
    dateRange,
  ])
  const filteredNationalPoints = useMemo(
    () => filterPointsByRange(nationalSeries?.points, dateRange),
    [nationalSeries, dateRange],
  )

  const activeChannelIds = useMemo(() => {
    if (!channelAggregates.length) return [] as string[]
    return selectedChannels.length ? selectedChannels : channelAggregates.map((channel) => channel.id)
  }, [channelAggregates, selectedChannels])

  const geoTotals = useMemo<GeoTotals | null>(() => {
    if (!filteredGeoPoints.length) return null
    let spend = 0
    let conversions = 0
    let revenue = 0
    let promoWeeks = 0
    let efficiencySum = 0
    let efficiencyCount = 0

    for (const point of filteredGeoPoints) {
      const channelSpend = point.channels
        .filter((channel) => activeChannelIds.includes(channel.id))
        .reduce((sum, channel) => sum + channel.spend, 0)
      spend += channelSpend
      conversions += point.conversions ?? 0
      if (point.conversions && point.revenue_per_conversion) {
        revenue += point.conversions * point.revenue_per_conversion
      }
      if (point.promo && point.promo > 0) {
        promoWeeks += 1
      }
      if (point.spend_efficiency) {
        efficiencySum += point.spend_efficiency
        efficiencyCount += 1
      }
    }

    const roas = spend ? revenue / spend : 0
    const cac = conversions ? spend / conversions : 0
    const promoRate = filteredGeoPoints.length ? promoWeeks / filteredGeoPoints.length : 0
    const avgEfficiency = efficiencyCount ? efficiencySum / efficiencyCount : 0

    return { spend, conversions, revenue, roas, cac, promoRate, avgEfficiency }
  }, [filteredGeoPoints, activeChannelIds])

  const geoSpendSeries = useMemo(
    () =>
      filteredGeoPoints.map((point) => ({
        time: point.time,
        value: point.channels
          .filter((channel) => activeChannelIds.includes(channel.id))
          .reduce((sum, channel) => sum + channel.spend, 0),
      })),
    [filteredGeoPoints, activeChannelIds],
  )

  const geoConversionSeries = useMemo(
    () =>
      filteredGeoPoints.map((point) => ({
        time: point.time,
        value: point.conversions ?? 0,
      })),
    [filteredGeoPoints],
  )

  const nationalSpendSeries = useMemo(
    () =>
      filteredNationalPoints.map((point) => ({
        time: point.time,
        value: point.total_spend,
      })),
    [filteredNationalPoints],
  )

  const nationalConversionSeries = useMemo(
    () =>
      filteredNationalPoints.map((point) => ({
        time: point.time,
        value: point.conversions ?? 0,
      })),
    [filteredNationalPoints],
  )

  const efficiencyScatter = useMemo(
    () =>
      filteredNationalPoints.map((point) => ({
        label: new Date(point.time).toLocaleDateString(),
        x: point.total_spend,
        y: point.conversions ?? 0,
      })),
    [filteredNationalPoints],
  )

  const summaryCards = useMemo(() => {
    return summaryMetrics.map((metric) => {
      if (metric.label.toLowerCase().includes("lift")) {
        return {
          label: metric.label,
          value: `${(metric.value * 100).toFixed(1)}%`,
        }
      }

      if (metric.unit === "USD") {
        return {
          label: metric.label,
          value: formatCurrency(metric.value, metric.value < 10 ? 2 : 0),
        }
      }

      if (metric.unit === "ratio") {
        if (metric.label.toLowerCase().includes("ad spend")) {
          return {
            label: metric.label,
            value: `${metric.value.toFixed(2)}×`,
          }
        }
        return {
          label: metric.label,
          value: formatPercent(metric.value),
        }
      }

      return {
        label: metric.label,
        value: formatCompactNumber(metric.value),
      }
    })
  }, [summaryMetrics])

  const channelBarData = useMemo(
    () =>
      channelAggregates.map((channel, index) => ({
        label: channel.name,
        value: channel.total_spend,
        secondary: channel.roas,
        color: gradientByIndex(index),
      })),
    [channelAggregates],
  )

  const geoOptions = geoItems
    .map((item) => ({ label: item.geo, value: item.geo }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }))

  const channelOptions = useMemo(
    () =>
      channelAggregates
        .map((channel) => ({
          id: channel.id,
          name: channel.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })),
    [channelAggregates],
  )

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-100">
        {error}
      </div>
    )
  }

  if (!initialized) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }



  return (
    <div className="space-y-12">
      <section className="grid gap-4 rounded-3xl border border-white/10 bg-emerald-950/80 p-6 shadow-2xl backdrop-blur sm:grid-cols-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-emerald-400/30 bg-emerald-900/40 p-4 shadow">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
              {card.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-emerald-50">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-emerald-950/70 p-6 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
              Geospatial performance
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-emerald-50">
              {selectedGeo ? `Geo performance · ${selectedGeo}` : "Select a geo"}
            </h2>
            {geoTotals ? (
              <p className="mt-2 text-sm text-emerald-200/70">
                ROAS {geoTotals.roas.toFixed(2)}× · CAC {formatCurrency(geoTotals.cac, 2)} · Promo
                presence {formatPercent(geoTotals.promoRate)} · Avg. efficiency {geoTotals.avgEfficiency.toFixed(4)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="flex gap-2 rounded-full border border-white/10 bg-emerald-900/40 p-1 text-xs">
              {DATE_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDateRange(option.id)}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    dateRange === option.id
                      ? "bg-emerald-500 text-emerald-950"
                      : "text-emerald-200 hover:bg-emerald-900/60"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <select
              value={selectedGeo}
              onChange={(event) => setSelectedGeo(event.target.value)}
              className="rounded-lg border border-white/10 bg-emerald-900/50 px-4 py-2 text-sm text-emerald-100 focus:border-emerald-400 focus:outline-none"
            >
              {geoOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="sm"
              className="border border-white/10 bg-emerald-900/40 text-emerald-100 hover:bg-emerald-900/60"
              onClick={() => window.open(`${API_BASE}/marketing-mix/geos/${selectedGeo}`, "_blank")}
            >
              View raw JSON
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pb-4 text-xs text-emerald-200/70">
          {channelOptions.map((channel) => {
            const active = activeChannelIds.includes(channel.id)
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => toggleChannel(channel.id, setSelectedChannels)}
                className={`rounded-full border px-3 py-1 font-semibold transition ${
                  active
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                    : "border-white/10 bg-emerald-900/30 text-emerald-200/70 hover:bg-emerald-900/60"
                }`}
              >
                {channel.name}
              </button>
            )
          })}
        </div>

        {loadingGeo ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <TimeSeriesChart
              data={geoSpendSeries}
              title="Weekly spend"
              subtitle="Sum across selected paid channels"
              showArea
              color="#34d399"
              valueFormatter={(value) => formatCurrency(value, value < 1000 ? 2 : 0)}
              xLabel="Time"
              yLabel="Spend ($)"
            />
            <TimeSeriesChart
              data={geoConversionSeries}
              title="Weekly conversions"
              subtitle="Attributed conversions across the geo"
              color="#22d3ee"
              valueFormatter={(value) => formatCompactNumber(value)}
              xLabel="Time"
              yLabel="Conversions"
            />
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-emerald-950/70 p-6 shadow-2xl backdrop-blur">
        <div className="pb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
            National pulse
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-emerald-50">
            National marketing mix performance
          </h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <TimeSeriesChart
            data={nationalSpendSeries}
            title="Spend across the portfolio"
            showArea
            color="#4ade80"
            valueFormatter={(value) => formatCurrency(value, value < 1000 ? 2 : 0)}
            xLabel="Time"
            yLabel="Spend ($)"
          />
          <TimeSeriesChart
            data={nationalConversionSeries}
            title="Conversions delivered"
            color="#818cf8"
            valueFormatter={(value) => formatCompactNumber(value)}
            xLabel="Time"
            yLabel="Conversions"
          />
        </div>
        <div className="mt-8">
          <ScatterChart
            data={efficiencyScatter}
            title="Spend vs. conversions efficiency"
            subtitle="Each point represents a week"
            pointColor="#facc15"
            xLabel="Weekly spend"
            yLabel="Conversions"
            xFormatter={(value) => formatCurrency(value, value < 1000 ? 2 : 0)}
            yFormatter={(value) => formatCompactNumber(value)}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-emerald-950/70 p-6 shadow-2xl backdrop-blur">
        <div className="pb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
            Channel mix intelligence
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-emerald-50">
            Where your media dollars work hardest
          </h2>
        </div>
        <BarChart
          data={channelBarData}
          valueFormatter={(datum) =>
            `${formatCurrency(datum.value, datum.value < 1000 ? 2 : 0)} · ROAS ${(datum.secondary ?? 0).toFixed(2)}×`
          }
          xLabel="Channels"
          yLabel="Spend ($)"
        />
        <div className="mt-8">
          <ChannelContributionTable channels={channelAggregates} />
        </div>
      </section>


    </div>
  )
}

function gradientByIndex(index: number) {
  const palette = [
    "linear-gradient(90deg, #22c55e, #16a34a)",
    "linear-gradient(90deg, #34d399, #10b981)",
    "linear-gradient(90deg, #2dd4bf, #14b8a6)",
    "linear-gradient(90deg, #60a5fa, #4f46e5)",
    "linear-gradient(90deg, #facc15, #eab308)",
  ]
  return palette[index % palette.length]
}

function toggleChannel(channelId: string, setSelectedChannels: (updater: (current: string[]) => string[]) => void) {
  setSelectedChannels((current) => {
    if (current.includes(channelId)) {
      return current.filter((id) => id !== channelId)
    }
    return [...current, channelId]
  })
}

function filterPointsByRange<T extends { time: string }>(points: T[] | undefined, range: DateRangeKey): T[] {
  if (!points?.length || range === "all") {
    return points ?? []
  }

  const sorted = [...points].sort((a, b) => new Date(a.time).valueOf() - new Date(b.time).valueOf())
  const weeks = range === "8w" ? 8 : 12
  return sorted.slice(-weeks)
}
