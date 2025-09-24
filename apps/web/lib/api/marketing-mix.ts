export interface ChannelPoint {
  id: string
  name: string
  spend: number
  impressions: number
  organic_impressions?: number | null
}

export interface GeoMetricPoint {
  time: string
  conversions?: number | null
  revenue_per_conversion?: number | null
  competitor_sales_control?: number | null
  sentiment_score_control?: number | null
  promo?: number | null
  population?: number | null
  channels: ChannelPoint[]
  total_spend: number
  spend_efficiency?: number | null
  lift_vs_prev?: number | null
}

export interface GeoSeriesResponse {
  geo: string
  start: string
  end: string
  points: GeoMetricPoint[]
}

export interface GeoListItem {
  geo: string
  start: string
  end: string
  sample_size: number
}

export interface NationalMetricPoint {
  time: string
  conversions?: number | null
  revenue_per_conversion?: number | null
  competitor_sales_control?: number | null
  sentiment_score_control?: number | null
  promo?: number | null
  channels: ChannelPoint[]
  total_spend: number
  spend_efficiency?: number | null
  lift_vs_prev?: number | null
}

export interface NationalSeriesResponse {
  start: string
  end: string
  points: NationalMetricPoint[]
}

export interface ChannelAggregate {
  id: string
  name: string
  total_spend: number
  total_impressions: number
  spend_share: number
  average_weekly_spend: number
  estimated_conversions: number
  estimated_revenue: number
  roas: number
  cac?: number | null
}

export interface SummaryMetric {
  label: string
  value: number
  unit: string
}

export interface SummaryResponse {
  metrics: SummaryMetric[]
  insights: string[]
}

export interface ScenarioRequest {
  source_channel: string
  target_channel: string
  shift_ratio: number
}

export interface ScenarioChannelProjection {
  id: string
  name: string
  spend: number
  estimated_conversions: number
  estimated_revenue: number
  roas: number
  cac?: number | null
}

export interface ScenarioResponse {
  total_spend: number
  projected_conversions: number
  projected_revenue: number
  delta_conversions: number
  delta_revenue: number
  channels: ScenarioChannelProjection[]
}

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

export function getGeoIndex() {
  return request<GeoListItem[]>("/marketing-mix/geos")
}

export function getGeoSeries(
  geo: string,
  params?: { start?: string; end?: string; channels?: string[] },
) {
  const query = new URLSearchParams()
  if (params?.start) query.append("start", params.start)
  if (params?.end) query.append("end", params.end)
  params?.channels?.forEach((channel) => query.append("channels", channel))
  const suffix = query.toString() ? `?${query.toString()}` : ""
  return request<GeoSeriesResponse>(`/marketing-mix/geos/${geo}${suffix}`)
}

export function getNationalSeries(params?: { start?: string; end?: string; channels?: string[] }) {
  const query = new URLSearchParams()
  if (params?.start) query.append("start", params.start)
  if (params?.end) query.append("end", params.end)
  params?.channels?.forEach((channel) => query.append("channels", channel))
  const suffix = query.toString() ? `?${query.toString()}` : ""
  return request<NationalSeriesResponse>(`/marketing-mix/national${suffix}`)
}

export function getChannelAggregates() {
  return request<ChannelAggregate[]>("/marketing-mix/channels")
}

export function getSummary() {
  return request<SummaryResponse>("/marketing-mix/summary")
}

export function runScenarioShift(payload: ScenarioRequest) {
  return request<ScenarioResponse>("/marketing-mix/scenarios/shift", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}
