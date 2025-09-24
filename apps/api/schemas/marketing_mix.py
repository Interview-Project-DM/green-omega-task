from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


class ChannelPoint(BaseModel):
    id: str = Field(..., description="Stable identifier for the channel")
    name: str = Field(..., description="Human readable channel label")
    spend: float = Field(..., ge=0)
    impressions: float = Field(..., ge=0)
    organic_impressions: Optional[float] = Field(
        None, ge=0, description="Organic impressions for the channel when available"
    )


class GeoMetricPoint(BaseModel):
    time: date
    conversions: Optional[float] = Field(None, ge=0)
    revenue_per_conversion: Optional[float] = Field(None, ge=0)
    competitor_sales_control: Optional[float]
    sentiment_score_control: Optional[float]
    promo: Optional[float]
    population: Optional[float]
    channels: List[ChannelPoint]
    total_spend: float = Field(..., ge=0)
    spend_efficiency: Optional[float] = Field(
        None, description="Conversions per unit spend for the period"
    )
    lift_vs_prev: Optional[float] = Field(
        None, description="Week-over-week conversion lift as a ratio"
    )


class GeoSeriesResponse(BaseModel):
    geo: str
    start: date
    end: date
    points: List[GeoMetricPoint]


class GeoListItem(BaseModel):
    geo: str
    start: date
    end: date
    sample_size: int = Field(..., ge=0)


class NationalMetricPoint(BaseModel):
    time: date
    conversions: Optional[float] = Field(None, ge=0)
    revenue_per_conversion: Optional[float] = Field(None, ge=0)
    competitor_sales_control: Optional[float]
    sentiment_score_control: Optional[float]
    promo: Optional[float]
    channels: List[ChannelPoint]
    total_spend: float = Field(..., ge=0)
    spend_efficiency: Optional[float] = Field(None)
    lift_vs_prev: Optional[float] = Field(None)


class NationalSeriesResponse(BaseModel):
    start: date
    end: date
    points: List[NationalMetricPoint]


class ChannelAggregate(BaseModel):
    id: str
    name: str
    total_spend: float = Field(..., ge=0)
    total_impressions: float = Field(..., ge=0)
    spend_share: float = Field(..., ge=0, le=1)
    average_weekly_spend: float = Field(..., ge=0)
    estimated_conversions: float = Field(0, ge=0)
    estimated_revenue: float = Field(0, ge=0)
    roas: float = Field(0, ge=0)
    cac: Optional[float] = Field(None, ge=0)


class SummaryMetric(BaseModel):
    label: str
    value: float
    unit: str


class SummaryResponse(BaseModel):
    metrics: List[SummaryMetric]
    insights: List[str] = Field(default_factory=list)


class ScenarioRequest(BaseModel):
    source_channel: str = Field(..., description="Channel to decrease", pattern=r"^channel\d+")
    target_channel: str = Field(..., description="Channel to increase", pattern=r"^channel\d+")
    shift_ratio: float = Field(
        ..., ge=0, le=0.5, description="Fraction of source spend to reallocate (0-0.5)"
    )


class ScenarioChannelProjection(BaseModel):
    id: str
    name: str
    spend: float
    estimated_conversions: float
    estimated_revenue: float
    roas: float
    cac: Optional[float]


class ScenarioResponse(BaseModel):
    total_spend: float
    projected_conversions: float
    projected_revenue: float
    delta_conversions: float
    delta_revenue: float
    channels: List[ScenarioChannelProjection]
