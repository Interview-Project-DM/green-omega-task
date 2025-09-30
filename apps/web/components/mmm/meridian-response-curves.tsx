"use client"

import { useEffect, useRef, useState } from "react"
import type { Result as VegaEmbedResult } from "vega-embed"
import { getMMMResponseCurvesChart, MMMResponseCurvesVegaChart } from "@/lib/api/mmm"

interface MeridianResponseCurvesProps {
  confidenceLevel?: number
  plotSeparately?: boolean
  includeCI?: boolean
}

interface ResponseCacheEntry {
  promise: Promise<MMMResponseCurvesVegaChart>
  data?: MMMResponseCurvesVegaChart
  expiresAt?: number
}

const CACHE_TTL_MS = 5 * 60 * 1000

// Cache for API responses to prevent duplicate requests and share in-flight calls
const responseCache = new Map<string, ResponseCacheEntry>()

function getCacheKey(params: { confidenceLevel: number; plotSeparately: boolean; includeCI: boolean }): string {
  const confidenceKey = params.confidenceLevel.toFixed(4)
  return `${confidenceKey}_${Number(params.plotSeparately)}_${Number(params.includeCI)}`
}

function removeInteractiveSelections(spec: Record<string, unknown>) {
  // Remove params to avoid signal conflicts when multiple charts are on the same page
  delete (spec as { params?: unknown }).params

  // Remove opacity encodings that depend on selection params
  const visited = new WeakSet<object>()
  const removeSelectionRefs = (node: unknown) => {
    if (!node || typeof node !== "object") return
    if (visited.has(node as object)) return
    visited.add(node as object)

    if (Array.isArray(node)) {
      for (const item of node) removeSelectionRefs(item)
      return
    }

    const obj = node as Record<string, unknown>

    // Remove opacity encodings that reference params (selection-based interactivity)
    if (obj.encoding && typeof obj.encoding === "object") {
      const encoding = obj.encoding as Record<string, unknown>
      if (encoding.opacity && typeof encoding.opacity === "object") {
        const opacityEnc = encoding.opacity as Record<string, unknown>
        // If opacity uses a condition with a param, remove it (it's selection-based)
        if (opacityEnc.condition && typeof opacityEnc.condition === "object") {
          const condition = opacityEnc.condition as Record<string, unknown>
          if (condition.param) {
            delete encoding.opacity
          }
        }
      }
    }

    for (const value of Object.values(obj)) {
      removeSelectionRefs(value)
    }
  }

  removeSelectionRefs(spec)
}

export function MeridianResponseCurves({
  confidenceLevel = 0.9,
  plotSeparately = false,
  includeCI = true,
}: MeridianResponseCurvesProps) {
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<VegaEmbedResult | null>(null)
  const instanceIdRef = useRef(`inst_${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    let cancelled = false
    const cacheKey = getCacheKey({ confidenceLevel, plotSeparately, includeCI })
    const now = Date.now()
    const cachedEntry = responseCache.get(cacheKey)
    const hasFreshData = Boolean(cachedEntry?.data && cachedEntry.expiresAt && cachedEntry.expiresAt > now)

    if (hasFreshData && cachedEntry?.data) {
      setSpec(cachedEntry.data.spec)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    let entry = cachedEntry
    const isExpired = Boolean(entry?.expiresAt && entry.expiresAt <= now)

    if (!entry || isExpired) {
      if (isExpired && entry) {
        responseCache.delete(cacheKey)
      }

      const requestPromise = getMMMResponseCurvesChart({
        confidenceLevel,
        plotSeparately,
        includeCI,
      })

      const newEntry: ResponseCacheEntry = {
        promise: requestPromise,
      }

      newEntry.promise = requestPromise
        .then((data) => {
          newEntry.data = data
          newEntry.expiresAt = Date.now() + CACHE_TTL_MS
          return data
        })
        .catch((err) => {
          responseCache.delete(cacheKey)
          throw err
        })

      responseCache.set(cacheKey, newEntry)
      entry = newEntry
    }

    entry.promise
      .then((data) => {
        if (cancelled) return
        setSpec(data.spec)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load chart")
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [confidenceLevel, plotSeparately, includeCI])

  useEffect(() => {
    let disposed = false

    async function renderChart() {
      if (!spec || typeof window === "undefined" || !containerRef.current) {
        return
      }

      const vegaEmbedModule = await import("vega-embed")
      if (disposed || !containerRef.current) {
        return
      }

      // Finalize any existing view before rendering again
      if (viewRef.current) {
        viewRef.current.finalize()
        viewRef.current = null
      }

      containerRef.current.innerHTML = ""

      try {
        const specClone = typeof structuredClone === "function" ? structuredClone(spec) : JSON.parse(JSON.stringify(spec))

        // Remove interactive selections to avoid signal conflicts between multiple chart instances
        removeInteractiveSelections(specClone as Record<string, unknown>)

        const result = await vegaEmbedModule.default(containerRef.current, specClone, {
          actions: {
            export: true,
            source: false,
            compiled: false,
            editor: false,
          },
        })

        if (!disposed) {
          viewRef.current = result
        } else {
          result.finalize()
        }
      } catch (err) {
        console.error("Failed to render response curves chart", err)
      }
    }

    renderChart()

    return () => {
      disposed = true
      if (viewRef.current) {
        viewRef.current.finalize()
      }
      viewRef.current = null
    }
  }, [spec])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="mb-2 text-sm text-muted-foreground">Loading response curves...</div>
          <div className="text-xs text-muted-foreground">This may take 5-30 seconds on first load</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <h3 className="font-semibold text-destructive">Failed to load chart</h3>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div ref={containerRef} className="w-full" />
    </div>
  )
}
