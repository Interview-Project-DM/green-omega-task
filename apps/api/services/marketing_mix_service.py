from __future__ import annotations

import csv
import copy
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from fastapi import HTTPException

CHANNEL_COUNT = 5
CHANNEL_NAMES = {f"channel{i}": f"Channel {i}" for i in range(CHANNEL_COUNT)}
DATA_FILENAMES = {
    "geo": "geo_all_channels.csv",
    "national": "national_all_channels.csv",
}


@dataclass(slots=True)
class ChannelRecord:
    id: str
    spend: float
    impressions: float
    organic_impressions: Optional[float]


@dataclass(slots=True)
class GeoRecord:
    geo: str
    time: date
    conversions: Optional[float]
    revenue_per_conversion: Optional[float]
    competitor_sales_control: Optional[float]
    sentiment_score_control: Optional[float]
    promo: Optional[float]
    population: Optional[float]
    channels: List[ChannelRecord]


@dataclass(slots=True)
class NationalRecord:
    time: date
    conversions: Optional[float]
    revenue_per_conversion: Optional[float]
    competitor_sales_control: Optional[float]
    sentiment_score_control: Optional[float]
    promo: Optional[float]
    channels: List[ChannelRecord]


class MarketingMixService:
    """Service responsible for loading and serving marketing-mix data sets."""

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        self._data_dir = data_dir or Path(__file__).resolve().parent.parent / "data"
        self._geo_records: Dict[str, List[GeoRecord]] = {}
        self._national_records: List[NationalRecord] = []
        self._channel_totals: Dict[str, Dict[str, float]] = {}
        self._summary_cache: Dict[str, float] = {}
        self._insights: List[str] = []
        self._load_all()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def list_geos(self) -> List[str]:
        return list(self._geo_records.keys())

    def geo_metadata(self) -> List[dict]:
        metadata: List[dict] = []
        for geo, records in self._geo_records.items():
            if not records:
                continue
            metadata.append(
                {
                    "geo": geo,
                    "start": records[0].time,
                    "end": records[-1].time,
                    "sample_size": len(records),
                }
            )
        metadata.sort(key=lambda item: item["geo"])
        return metadata

    def get_geo_series(
        self,
        geo: str,
        start: Optional[date] = None,
        end: Optional[date] = None,
        channels: Optional[Iterable[str]] = None,
    ) -> List[GeoRecord]:
        if geo not in self._geo_records:
            raise HTTPException(status_code=404, detail=f"Geo '{geo}' not found")

        channel_filter = {c.lower() for c in channels} if channels else None
        series = self._geo_records[geo]

        filtered: List[GeoRecord] = []
        for record in series:
            if start and record.time < start:
                continue
            if end and record.time > end:
                continue
            filtered.append(self._filter_channels(record, channel_filter))
        return filtered

    def get_geo_bounds(self, geo: str) -> tuple[date, date]:
        if geo not in self._geo_records or not self._geo_records[geo]:
            raise HTTPException(status_code=404, detail=f"Geo '{geo}' not found")
        records = self._geo_records[geo]
        return records[0].time, records[-1].time

    def get_geo_sample_size(self, geo: str) -> int:
        return len(self._geo_records.get(geo, []))

    def get_national_series(
        self,
        start: Optional[date] = None,
        end: Optional[date] = None,
        channels: Optional[Iterable[str]] = None,
    ) -> List[NationalRecord]:
        channel_filter = {c.lower() for c in channels} if channels else None
        filtered: List[NationalRecord] = []
        for record in self._national_records:
            if start and record.time < start:
                continue
            if end and record.time > end:
                continue
            filtered.append(self._filter_channels(record, channel_filter))
        return filtered

    def get_national_bounds(self) -> tuple[date, date]:
        if not self._national_records:
            raise HTTPException(status_code=404, detail="No national data available")
        return self._national_records[0].time, self._national_records[-1].time

    def get_channel_totals(self) -> Dict[str, Dict[str, float]]:
        return self._channel_totals

    def get_summary_metrics(self) -> Dict[str, float]:
        cache = dict(self._summary_cache)
        cache["insights"] = list(self._insights)
        return cache

    def simulate_budget_shift(
        self, source_channel: str, target_channel: str, shift_ratio: float
    ) -> Dict[str, Dict[str, float]]:
        if source_channel == target_channel:
            raise HTTPException(status_code=400, detail="Source and target must differ")
        if not 0 <= shift_ratio <= 0.5:
            raise HTTPException(status_code=400, detail="Shift ratio must be between 0 and 0.5")

        totals = copy.deepcopy(self._channel_totals)
        if source_channel not in totals or target_channel not in totals:
            raise HTTPException(status_code=404, detail="Unknown channel supplied")

        source_spend = totals[source_channel]["spend"]
        if source_spend <= 0:
            raise HTTPException(status_code=400, detail="Source channel has no spend to shift")

        amount = source_spend * shift_ratio
        totals[source_channel]["spend"] -= amount
        totals[target_channel]["spend"] += amount

        total_spend = sum(channel["spend"] for channel in totals.values()) or 1.0
        total_conversions = self._summary_cache.get("total_conversions", 0.0)
        total_revenue = self._summary_cache.get("total_revenue", 0.0)

        for channel_id, metrics in totals.items():
            metrics["spend_share"] = metrics["spend"] / total_spend
            metrics["estimated_conversions"] = total_conversions * metrics["spend_share"]
            metrics["estimated_revenue"] = total_revenue * metrics["spend_share"]
            metrics["roas"] = (
                metrics["estimated_revenue"] / metrics["spend"]
                if metrics["spend"]
                else 0.0
            )
            metrics["cac"] = (
                metrics["spend"] / metrics["estimated_conversions"]
                if metrics["estimated_conversions"]
                else None
            )

        return totals

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _load_all(self) -> None:
        self._load_geo_data()
        self._load_national_data()
        self._compute_summary()
        self._compute_channel_totals()
        self._build_insights()

    def _load_geo_data(self) -> None:
        geo_path = self._data_dir / DATA_FILENAMES["geo"]
        if not geo_path.exists():
            raise RuntimeError(f"Geo data file missing: {geo_path}")

        by_geo: Dict[str, List[GeoRecord]] = defaultdict(list)
        with geo_path.open("r", newline="") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                geo = row.get("geo") or row.get("Geo")
                if not geo:
                    continue

                record = GeoRecord(
                    geo=geo,
                    time=self._parse_date(row.get("time")),
                    conversions=self._parse_float(row.get("conversions")),
                    revenue_per_conversion=self._parse_float(row.get("revenue_per_conversion")),
                    competitor_sales_control=self._parse_float(
                        row.get("competitor_sales_control")
                    ),
                    sentiment_score_control=self._parse_float(
                        row.get("sentiment_score_control")
                    ),
                    promo=self._parse_float(row.get("Promo")),
                    population=self._parse_float(row.get("population")),
                    channels=self._build_channels(row),
                )
                by_geo[geo].append(record)

        for geo, records in by_geo.items():
            records.sort(key=lambda r: r.time)
        self._geo_records = dict(by_geo)

    def _load_national_data(self) -> None:
        nat_path = self._data_dir / DATA_FILENAMES["national"]
        if not nat_path.exists():
            raise RuntimeError(f"National data file missing: {nat_path}")

        records: List[NationalRecord] = []
        with nat_path.open("r", newline="") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                record = NationalRecord(
                    time=self._parse_date(row.get("time")),
                    conversions=self._parse_float(row.get("conversions")),
                    revenue_per_conversion=self._parse_float(row.get("revenue_per_conversion")),
                    competitor_sales_control=self._parse_float(
                        row.get("competitor_sales_control")
                    ),
                    sentiment_score_control=self._parse_float(
                        row.get("sentiment_score_control")
                    ),
                    promo=self._parse_float(row.get("Promo")),
                    channels=self._build_channels(row),
                )
                records.append(record)
        records.sort(key=lambda r: r.time)
        self._national_records = records

    def _build_channels(self, row: Dict[str, str]) -> List[ChannelRecord]:
        channels: List[ChannelRecord] = []
        organics = {
            "channel0": self._parse_float(row.get("Organic_channel0_impression")),
        }
        for idx in range(CHANNEL_COUNT):
            channel_id = f"channel{idx}"
            spend_key = f"Channel{idx}_spend"
            impression_key = f"Channel{idx}_impression"
            record = ChannelRecord(
                id=channel_id,
                spend=self._parse_float(row.get(spend_key)) or 0.0,
                impressions=self._parse_float(row.get(impression_key)) or 0.0,
                organic_impressions=organics.get(channel_id),
            )
            channels.append(record)
        return channels

    def _filter_channels(self, record, channel_filter: Optional[Iterable[str]]):
        if not channel_filter:
            return record
        allowed = {self._normalise_channel_id(c) for c in channel_filter}
        channels = [c for c in record.channels if c.id in allowed]
        if isinstance(record, GeoRecord):
            return GeoRecord(
                geo=record.geo,
                time=record.time,
                conversions=record.conversions,
                revenue_per_conversion=record.revenue_per_conversion,
                competitor_sales_control=record.competitor_sales_control,
                sentiment_score_control=record.sentiment_score_control,
                promo=record.promo,
                population=record.population,
                channels=channels,
            )
        return NationalRecord(
            time=record.time,
            conversions=record.conversions,
            revenue_per_conversion=record.revenue_per_conversion,
            competitor_sales_control=record.competitor_sales_control,
            sentiment_score_control=record.sentiment_score_control,
            promo=record.promo,
            channels=channels,
        )

    def _compute_channel_totals(self) -> None:
        totals: Dict[str, Dict[str, float]] = {
            cid: {"spend": 0.0, "impressions": 0.0, "name": CHANNEL_NAMES[cid]}
            for cid in CHANNEL_NAMES
        }
        for record in self._national_records:
            for channel in record.channels:
                metrics = totals[channel.id]
                metrics["spend"] += channel.spend
                metrics["impressions"] += channel.impressions

        total_spend = sum(val["spend"] for val in totals.values()) or 1.0
        weeks = max(len(self._national_records), 1)
        total_conversions = self._summary_cache.get("total_conversions", 0.0)
        total_revenue = self._summary_cache.get("total_revenue", 0.0)

        for channel_id, metrics in totals.items():
            metrics["spend_share"] = metrics["spend"] / total_spend
            metrics["average_weekly_spend"] = metrics["spend"] / weeks
            metrics["estimated_conversions"] = total_conversions * metrics["spend_share"]
            metrics["estimated_revenue"] = total_revenue * metrics["spend_share"]
            metrics["roas"] = (
                metrics["estimated_revenue"] / metrics["spend"]
                if metrics["spend"]
                else 0.0
            )
            metrics["cac"] = (
                metrics["spend"] / metrics["estimated_conversions"]
                if metrics["estimated_conversions"]
                else None
            )
        self._channel_totals = totals

    def _compute_summary(self) -> None:
        total_spend = 0.0
        total_conversions = 0.0
        total_revenue = 0.0
        total_promo_weeks = 0
        previous_conversions: Optional[float] = None
        previous_spend: Optional[float] = None
        recent_conversion_lift: float = 0.0
        recent_spend_lift: float = 0.0

        for record in self._national_records:
            week_spend = sum(channel.spend for channel in record.channels)
            total_spend += week_spend
            if record.conversions:
                total_conversions += record.conversions
                if record.revenue_per_conversion:
                    total_revenue += record.conversions * record.revenue_per_conversion
            if record.promo and record.promo > 0:
                total_promo_weeks += 1

            if (
                record.conversions is not None
                and previous_conversions not in (None, 0)
            ):
                recent_conversion_lift = (
                    record.conversions - previous_conversions
                ) / previous_conversions
            previous_conversions = record.conversions or previous_conversions

            if previous_spend not in (None, 0):
                recent_spend_lift = (week_spend - previous_spend) / previous_spend
            previous_spend = week_spend or previous_spend

        roas = total_revenue / total_spend if total_spend else 0.0
        avg_cac = (total_spend / total_conversions) if total_conversions else 0.0
        promo_ratio = total_promo_weeks / max(len(self._national_records), 1)

        self._summary_cache = {
            "total_spend": total_spend,
            "total_conversions": total_conversions,
            "total_revenue": total_revenue,
            "roas": roas,
            "cac": avg_cac,
            "promo_rate": promo_ratio,
            "recent_conversion_lift": recent_conversion_lift,
            "recent_spend_lift": recent_spend_lift,
        }

    def _build_insights(self) -> None:
        if not self._channel_totals:
            self._insights = []
            return

        top_channel_id, top_metrics = max(
            self._channel_totals.items(), key=lambda item: item[1]["spend_share"]
        )
        fastest_roi_id, fastest_roi_metrics = max(
            self._channel_totals.items(), key=lambda item: item[1]["roas"]
        )

        conversion_lift = self._summary_cache.get("recent_conversion_lift", 0.0)
        conversion_phrase = (
            f"Conversions increased {conversion_lift:.1%} WoW"
            if conversion_lift >= 0
            else f"Conversions decreased {abs(conversion_lift):.1%} WoW"
        )

        self._insights = [
            f"{top_metrics['name']} represents {top_metrics['spend_share']:.0%} of media spend.",
            f"{fastest_roi_metrics['name']} currently delivers ROAS {fastest_roi_metrics['roas']:.2f}×.",
            conversion_phrase,
        ]

    # ------------------------------------------------------------------
    @staticmethod
    def _parse_float(raw: Optional[str]) -> Optional[float]:
        if raw is None or raw == "":
            return None
        try:
            return float(raw)
        except ValueError:
            return None

    @staticmethod
    def _parse_date(raw: Optional[str]) -> date:
        if not raw:
            raise ValueError("Missing date value in marketing mix dataset")
        return date.fromisoformat(raw)

    @staticmethod
    def _normalise_channel_id(channel: str) -> str:
        channel = channel.lower().strip()
        if channel.startswith("channel"):
            return channel
        if channel in CHANNEL_NAMES:
            return channel
        if channel.isdigit():
            return f"channel{channel}"
        raise ValueError(f"Unknown channel identifier '{channel}'")


marketing_mix_service = MarketingMixService()


def get_marketing_mix_service() -> MarketingMixService:
    return marketing_mix_service
