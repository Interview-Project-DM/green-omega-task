"""Pydantic models for MMM endpoints."""

from __future__ import annotations

from datetime import date
from typing import List

from pydantic import BaseModel, Field


class ContributionInterval(BaseModel):
    id: str = Field(..., description="Channel identifier")
    name: str = Field(..., description="Channel display label")
    mean: float = Field(..., description="Mean contribution for the period")
    lower: float = Field(..., description="Lower bound of the credible interval")
    upper: float = Field(..., description="Upper bound of the credible interval")
    share: float = Field(..., ge=0, description="Share of total contribution")


class ContributionPoint(BaseModel):
    time: date
    total_mean: float
    total_lower: float
    total_upper: float
    channels: List[ContributionInterval]


class ContributionSeriesResponse(BaseModel):
    start: date
    end: date
    points: List[ContributionPoint]


class ResponseCurvePoint(BaseModel):
    spend: float = Field(..., ge=0)
    mean: float = Field(..., ge=0)
    lower: float = Field(..., ge=0)
    upper: float = Field(..., ge=0)


class ResponseCurveChannel(BaseModel):
    id: str
    name: str
    points: List[ResponseCurvePoint]
    saturation_spend: float = Field(..., ge=0)
    diminishing_returns_start: float = Field(..., ge=0)


class ResponseCurvesResponse(BaseModel):
    channels: List[ResponseCurveChannel]

