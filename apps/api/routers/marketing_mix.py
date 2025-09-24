from __future__ import annotations

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from schemas.marketing_mix import (
    ChannelAggregate,
    ChannelPoint,
    GeoListItem,
    GeoMetricPoint,
    GeoSeriesResponse,
    NationalMetricPoint,
    NationalSeriesResponse,
    ScenarioChannelProjection,
    ScenarioRequest,
    ScenarioResponse,
    SummaryMetric,
    SummaryResponse,
)
from services.marketing_mix_service import MarketingMixService, get_marketing_mix_service

router = APIRouter(prefix="/marketing-mix", tags=["marketing-mix"])


@router.get("/geos", response_model=List[GeoListItem])
def list_geos(service: MarketingMixService = Depends(get_marketing_mix_service)) -> List[GeoListItem]:
    items = []
    for meta in service.geo_metadata():
        items.append(
            GeoListItem(
                geo=meta["geo"],
                start=meta["start"],
                end=meta["end"],
                sample_size=meta["sample_size"],
            )
        )
    return items


@router.get("/geos/{geo}", response_model=GeoSeriesResponse)
def get_geo_timeseries(
    geo: str,
    start: Optional[date] = Query(None, description="Inclusive start date"),
    end: Optional[date] = Query(None, description="Inclusive end date"),
    channels: Optional[List[str]] = Query(None, description="Filter to specific channel IDs"),
    service: MarketingMixService = Depends(get_marketing_mix_service),
) -> GeoSeriesResponse:
    series = service.get_geo_series(geo, start=start, end=end, channels=channels)
    channel_totals = service.get_channel_totals()

    points: List[GeoMetricPoint] = []
    prev_conversions: Optional[float] = None
    for record in series:
        total_spend = sum(channel.spend for channel in record.channels)
        conversions = record.conversions or 0.0
        efficiency = (conversions / total_spend) if total_spend and conversions else None
        lift = None
        if prev_conversions not in (None, 0):
            lift = (conversions - prev_conversions) / prev_conversions
        if conversions:
            prev_conversions = conversions

        points.append(
            GeoMetricPoint(
                time=record.time,
                conversions=record.conversions,
                revenue_per_conversion=record.revenue_per_conversion,
                competitor_sales_control=record.competitor_sales_control,
                sentiment_score_control=record.sentiment_score_control,
                promo=record.promo,
                population=record.population,
                channels=[
                    ChannelPoint(
                        id=channel.id,
                        name=channel_totals.get(channel.id, {}).get("name", channel.id.title()),
                        spend=channel.spend,
                        impressions=channel.impressions,
                        organic_impressions=channel.organic_impressions,
                    )
                    for channel in record.channels
                ],
                total_spend=total_spend,
                spend_efficiency=efficiency,
                lift_vs_prev=lift,
            )
        )

    start_date, end_date = service.get_geo_bounds(geo)
    if start:
        start_date = max(start_date, start)
    if end:
        end_date = min(end_date, end)

    return GeoSeriesResponse(geo=geo, start=start_date, end=end_date, points=points)


@router.get("/national", response_model=NationalSeriesResponse)
def get_national_timeseries(
    start: Optional[date] = Query(None, description="Inclusive start date"),
    end: Optional[date] = Query(None, description="Inclusive end date"),
    channels: Optional[List[str]] = Query(None, description="Filter to specific channel IDs"),
    service: MarketingMixService = Depends(get_marketing_mix_service),
) -> NationalSeriesResponse:
    series = service.get_national_series(start=start, end=end, channels=channels)
    channel_totals = service.get_channel_totals()

    points: List[NationalMetricPoint] = []
    prev_conversions: Optional[float] = None
    for record in series:
        total_spend = sum(channel.spend for channel in record.channels)
        conversions = record.conversions or 0.0
        efficiency = (conversions / total_spend) if total_spend and conversions else None
        lift = None
        if prev_conversions not in (None, 0):
            lift = (conversions - prev_conversions) / prev_conversions
        if conversions:
            prev_conversions = conversions

        points.append(
            NationalMetricPoint(
                time=record.time,
                conversions=record.conversions,
                revenue_per_conversion=record.revenue_per_conversion,
                competitor_sales_control=record.competitor_sales_control,
                sentiment_score_control=record.sentiment_score_control,
                promo=record.promo,
                channels=[
                    ChannelPoint(
                        id=channel.id,
                        name=channel_totals.get(channel.id, {}).get("name", channel.id.title()),
                        spend=channel.spend,
                        impressions=channel.impressions,
                        organic_impressions=channel.organic_impressions,
                    )
                    for channel in record.channels
                ],
                total_spend=total_spend,
                spend_efficiency=efficiency,
                lift_vs_prev=lift,
            )
        )

    start_date, end_date = service.get_national_bounds()
    if start:
        start_date = max(start_date, start)
    if end:
        end_date = min(end_date, end)

    return NationalSeriesResponse(start=start_date, end=end_date, points=points)


@router.get("/channels", response_model=List[ChannelAggregate])
def get_channel_totals(
    service: MarketingMixService = Depends(get_marketing_mix_service),
) -> List[ChannelAggregate]:
    totals = service.get_channel_totals()
    aggregated = [
        ChannelAggregate(
            id=channel_id,
            name=metrics["name"],
            total_spend=metrics["spend"],
            total_impressions=metrics["impressions"],
            spend_share=metrics["spend_share"],
            average_weekly_spend=metrics["average_weekly_spend"],
            estimated_conversions=metrics["estimated_conversions"],
            estimated_revenue=metrics["estimated_revenue"],
            roas=metrics["roas"],
            cac=metrics["cac"],
        )
        for channel_id, metrics in totals.items()
    ]
    aggregated.sort(key=lambda item: item.total_spend, reverse=True)
    return aggregated


@router.get("/summary", response_model=SummaryResponse)
def get_summary(service: MarketingMixService = Depends(get_marketing_mix_service)) -> SummaryResponse:
    metrics = service.get_summary_metrics()
    mapped = [
        SummaryMetric(label="Total Spend", value=metrics["total_spend"], unit="USD"),
        SummaryMetric(
            label="Total Conversions", value=metrics["total_conversions"], unit="units"
        ),
        SummaryMetric(label="Total Revenue", value=metrics["total_revenue"], unit="USD"),
        SummaryMetric(label="Return on Ad Spend", value=metrics["roas"], unit="ratio"),
        SummaryMetric(label="Average CAC", value=metrics["cac"], unit="USD"),
        SummaryMetric(
            label="Weekly Conversion Lift", value=metrics["recent_conversion_lift"], unit="ratio"
        ),
        SummaryMetric(label="Promo Weeks", value=metrics["promo_rate"], unit="ratio"),
    ]
    insights = metrics.get("insights", [])
    return SummaryResponse(metrics=mapped, insights=insights)


@router.post("/scenarios/shift", response_model=ScenarioResponse)
def simulate_shift(
    payload: ScenarioRequest,
    service: MarketingMixService = Depends(get_marketing_mix_service),
) -> ScenarioResponse:
    summary = service.get_summary_metrics()
    base_conversions = summary.get("total_conversions", 0.0)
    base_revenue = summary.get("total_revenue", 0.0)
    totals = service.simulate_budget_shift(
        payload.source_channel, payload.target_channel, payload.shift_ratio
    )

    channels: List[ScenarioChannelProjection] = []
    projected_conversions = 0.0
    projected_revenue = 0.0
    for channel_id, metrics in totals.items():
        projected_conversions += metrics["estimated_conversions"]
        projected_revenue += metrics["estimated_revenue"]
        channels.append(
            ScenarioChannelProjection(
                id=channel_id,
                name=metrics["name"],
                spend=metrics["spend"],
                estimated_conversions=metrics["estimated_conversions"],
                estimated_revenue=metrics["estimated_revenue"],
                roas=metrics["roas"],
                cac=metrics["cac"],
            )
        )

    total_spend = sum(metric["spend"] for metric in totals.values())
    delta_conversions = projected_conversions - base_conversions
    delta_revenue = projected_revenue - base_revenue

    return ScenarioResponse(
        total_spend=total_spend,
        projected_conversions=projected_conversions,
        projected_revenue=projected_revenue,
        delta_conversions=delta_conversions,
        delta_revenue=delta_revenue,
        channels=channels,
    )
