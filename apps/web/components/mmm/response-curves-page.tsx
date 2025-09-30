"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { MMMResponseCurveChannel, getMMMResponseCurves } from "@/lib/api/mmm"
import { formatCurrency } from "@/lib/format"

import { MMMResponseCurveGrid } from "./response-curve-grid"

export function MMMResponseCurvesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [channels, setChannels] = useState<MMMResponseCurveChannel[]>([])
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [spendSteps, setSpendSteps] = useState(60)

  useEffect(() => {
    setSelectedChannels((current) => current.filter((id) => channels.some((channel) => channel.id === id)))
  }, [channels])

  useEffect(() => {
    let cancelled = false

    async function loadCurves() {
      try {
        setLoading(true)
        const response = await getMMMResponseCurves({ spendSteps })
        if (cancelled) return
        setChannels(response.channels)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to fetch response curves")
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadCurves()

    return () => {
      cancelled = true
    }
  }, [spendSteps])

  const activeChannels = useMemo(() => {
    if (!selectedChannels.length) return channels
    const active = new Set(selectedChannels)
    const filtered = channels.filter((channel) => active.has(channel.id))
    return filtered.length ? filtered : channels
  }, [channels, selectedChannels])

  const toggleChannel = (id: string) => {
    setSelectedChannels((current) =>
      current.includes(id) ? current.filter((channel) => channel !== id) : [...current, id],
    )
  }

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-white/10 bg-emerald-950/70 p-6 shadow-2xl backdrop-blur">
        <header className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">Response elasticity</p>
            <h1 className="mt-2 text-3xl font-semibold text-emerald-50">Channel response curves</h1>
            <p className="mt-2 max-w-3xl text-sm text-emerald-200/70">
              Visualise how incremental conversions scale with spend for each channel. Use the spend resolution slider to
              sample the curve more finely and focus on high priority investments by toggling channels below.
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-900/40 p-4 text-sm text-emerald-100 sm:min-w-[220px]">
            <div className="flex items-center justify-between">
              <span className="text-emerald-200/70">Spend resolution</span>
              <span className="font-semibold text-emerald-50">{spendSteps} pts</span>
            </div>
            <input
              type="range"
              min={20}
              max={120}
              step={10}
              value={spendSteps}
              onChange={(event) => setSpendSteps(Number(event.target.value))}
              className="accent-emerald-400"
            />
            <p className="text-xs text-emerald-200/60">
              Higher values create smoother curves at the cost of additional compute on the API.
            </p>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 pb-4 text-xs text-emerald-200/70">
          {channels.map((channel) => {
            const active = selectedChannels.includes(channel.id)
            const latestPoint = channel.points[channel.points.length - 1]
            return (
              <Button
                key={channel.id}
                variant="ghost"
                size="sm"
                onClick={() => toggleChannel(channel.id)}
                className={`border px-3 py-1 transition ${
                  active
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                    : "border-white/10 bg-emerald-900/40 text-emerald-200/70 hover:bg-emerald-900/60"
                }`}
              >
                <span className="font-semibold text-emerald-50/90">{channel.name}</span>
                {latestPoint ? (
                  <span className="ml-2 text-emerald-200/60">
                    Max {formatCurrency(latestPoint.mean)}
                  </span>
                ) : null}
              </Button>
            )
          })}
          {!channels.length && !loading ? (
            <span className="text-sm text-emerald-200/60">MMM response curves are not available for this model.</span>
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            {error}
          </div>
        ) : (
          <MMMResponseCurveGrid channels={activeChannels} />
        )}
      </section>
    </div>
  )
}
