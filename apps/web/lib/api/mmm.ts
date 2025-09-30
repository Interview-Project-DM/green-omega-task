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
