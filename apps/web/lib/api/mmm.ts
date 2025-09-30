const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export interface MMMContributionInterval {
  id: string
  name: string
  mean: number
  lower: number
  upper: number
  share: number
}

export interface MMMContributionPoint {
  time: string
  total_mean: number
  total_lower: number
  total_upper: number
  channels: MMMContributionInterval[]
}

export interface MMMContributionSeriesResponse {
  start: string
  end: string
  points: MMMContributionPoint[]
}

export interface MMMResponseCurvePoint {
  spend: number
  mean: number
  lower: number
  upper: number
}

export interface MMMResponseCurveChannel {
  id: string
  name: string
  points: MMMResponseCurvePoint[]
  saturation_spend: number
  diminishing_returns_start: number
}

export interface MMMResponseCurvesResponse {
  channels: MMMResponseCurveChannel[]
}

export function getMMMContributions(params?: {
  start?: string
  end?: string
  channels?: string[]
  credibleInterval?: number
}) {
  const query = new URLSearchParams()
  if (params?.start) query.append("start", params.start)
  if (params?.end) query.append("end", params.end)
  params?.channels?.forEach((channel) => query.append("channels", channel))
  if (params?.credibleInterval) {
    query.append("credible_interval", params.credibleInterval.toString())
  }
  const suffix = query.toString() ? `?${query.toString()}` : ""
  return request<MMMContributionSeriesResponse>(`/mmm/contributions${suffix}`)
}

export function getMMMResponseCurves(params?: {
  channels?: string[]
  spendSteps?: number
  credibleInterval?: number
}) {
  const query = new URLSearchParams()
  params?.channels?.forEach((channel) => query.append("channels", channel))
  if (params?.spendSteps) query.append("spend_steps", params.spendSteps.toString())
  if (params?.credibleInterval) {
    query.append("credible_interval", params.credibleInterval.toString())
  }
  const suffix = query.toString() ? `?${query.toString()}` : ""
  return request<MMMResponseCurvesResponse>(`/mmm/response-curves${suffix}`)
}

export function preloadMMMModel() {
  return request<{ status: string; model_loaded: boolean; analyzer_loaded: boolean; channels: string[] }>(
    `/mmm/preload`,
    { method: "POST" }
  )
}

// Preload MMM data with caching
let preloadPromise: Promise<void> | null = null

export function preloadMMMData() {
  // Return existing promise if already preloading
  if (preloadPromise) return preloadPromise

  preloadPromise = (async () => {
    try {
      // First preload the model itself
      await preloadMMMModel()

      // Then fetch response curves for all channels (this will cache them)
      await getMMMResponseCurves({ spendSteps: 50 })

      console.log("MMM data preloaded successfully")
    } catch (error) {
      console.error("Failed to preload MMM data:", error)
      // Reset promise on error so it can be retried
      preloadPromise = null
    }
  })()

  return preloadPromise
}

export interface MMMResponseCurvesVegaChart {
  spec: Record<string, unknown>
  type: "vega-lite"
  version: string
}

export function getMMMResponseCurvesChart(params?: {
  confidenceLevel?: number
  plotSeparately?: boolean
  includeCI?: boolean
}) {
  const query = new URLSearchParams()
  if (params?.confidenceLevel) {
    query.append("confidence_level", params.confidenceLevel.toString())
  }
  if (params?.plotSeparately !== undefined) {
    query.append("plot_separately", params.plotSeparately.toString())
  }
  if (params?.includeCI !== undefined) {
    query.append("include_ci", params.includeCI.toString())
  }
  const suffix = query.toString() ? `?${query.toString()}` : ""
  return request<MMMResponseCurvesVegaChart>(`/mmm/response-curves-chart${suffix}`)
}

export function getMMMContributionChart(params?: {
  timeGranularity?: "weekly" | "monthly" | "quarterly"
}) {
  const query = new URLSearchParams()
  if (params?.timeGranularity) {
    query.append("time_granularity", params.timeGranularity)
  }
  const suffix = query.toString() ? `?${query.toString()}` : ""
  return request<MMMResponseCurvesVegaChart>(`/mmm/contribution-chart${suffix}`)
}
