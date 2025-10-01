from __future__ import annotations

import copy
import math
from concurrent.futures import Future, TimeoutError
from threading import Lock
from time import monotonic
from typing import Optional, Dict, Tuple
from pathlib import Path
from functools import lru_cache

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from meridian.model.model import load_mmm
from meridian.analysis.analyzer import Analyzer
from meridian.analysis import visualizer

router = APIRouter(prefix="/mmm", tags=["mmm"])

# Model path
MMM_MODEL_PATH = Path(__file__).resolve().parents[1] / "saved_mmm.pkl"


_CHART_CACHE_TTL_SECONDS = 5 * 60
_DEFAULT_SPEND_STEPS_FOR_CHART = 50


ChartCacheKey = Tuple[float, bool, bool]

# In-memory cache for Vega specs to prevent repeated heavy computations
_chart_cache: Dict[ChartCacheKey, Tuple[float, dict[str, object]]] = {}
_chart_promises: Dict[ChartCacheKey, Future] = {}
_chart_cache_lock = Lock()


@lru_cache(maxsize=1)
def _load_mmm_model():
    """Load the MMM model from disk. Cached after first load."""
    if not MMM_MODEL_PATH.exists():
        raise HTTPException(status_code=500, detail="MMM model file not found")
    return load_mmm(str(MMM_MODEL_PATH))


@lru_cache(maxsize=1)
def _get_analyzer():
    """Get cached Analyzer instance."""
    return Analyzer(_load_mmm_model())


def _response_curve_chart_cache_key(
    confidence_level: float,
    plot_separately: bool,
    include_ci: bool,
) -> ChartCacheKey:
    # Round confidence level to avoid floating point precision noise in cache keys
    return (round(confidence_level, 4), bool(plot_separately), bool(include_ci))


def _get_response_curves_chart_spec(
    confidence_level: float,
    plot_separately: bool,
    include_ci: bool,
) -> dict[str, object]:
    key = _response_curve_chart_cache_key(confidence_level, plot_separately, include_ci)

    with _chart_cache_lock:
        cached = _chart_cache.get(key)
        if cached:
            cached_at, spec = cached
            if monotonic() - cached_at < _CHART_CACHE_TTL_SECONDS:
                return copy.deepcopy(spec)
            _chart_cache.pop(key, None)

        promise = _chart_promises.get(key)
        if promise is None:
            promise = Future()
            _chart_promises[key] = promise
            should_compute = True
        else:
            should_compute = False

    if should_compute:
        try:
            spec = _build_response_curves_chart_spec(confidence_level, plot_separately, include_ci)
        except Exception as exc:  # pragma: no cover - propagate downstream
            promise.set_exception(exc)
            with _chart_cache_lock:
                _chart_promises.pop(key, None)
            raise
        else:
            promise.set_result(spec)
            with _chart_cache_lock:
                _chart_cache[key] = (monotonic(), spec)
                _chart_promises.pop(key, None)
            return copy.deepcopy(spec)

    # Wait for the in-flight computation to complete and return a copy of the spec
    try:
        return copy.deepcopy(promise.result(timeout=25))
    except TimeoutError:
        # Fail fast rather than hanging requests indefinitely
        raise HTTPException(status_code=504, detail="Chart computation timed out; please retry")


def _build_response_curves_chart_spec(
    confidence_level: float,
    plot_separately: bool,
    include_ci: bool,
) -> dict[str, object]:
    analyzer = _get_analyzer()
    # Use a fixed, modest grid to keep compute bounded in production
    spend_multipliers_array = np.linspace(0, 2, _DEFAULT_SPEND_STEPS_FOR_CHART)
    response_curves_ds = analyzer.response_curves(
        spend_multipliers=spend_multipliers_array.tolist(),
        confidence_level=confidence_level,
    )

    raw_channels = response_curves_ds.coords["channel"].values
    if raw_channels.size == 0:
        raise HTTPException(status_code=500, detail="No MMM channels available for response curves")

    values: list[dict[str, float | str]] = []
    channels: list[str] = []
    for raw_channel in raw_channels:
        channel_key = raw_channel.item() if hasattr(raw_channel, "item") else raw_channel
        channel_label = str(channel_key)
        channels.append(channel_label)

        channel_data = response_curves_ds.sel(channel=channel_key)
        spend_array = channel_data["spend"].values
        incremental_outcome = channel_data["incremental_outcome"]
        mean_response = incremental_outcome.sel(metric="mean").values
        lower_response = incremental_outcome.sel(metric="ci_lo").values
        upper_response = incremental_outcome.sel(metric="ci_hi").values

        for idx in range(len(spend_array)):
            values.append(
                {
                    "channel": channel_label,
                    "spend": float(spend_array[idx]),
                    "mean": float(mean_response[idx]),
                    "lower": float(lower_response[idx]),
                    "upper": float(upper_response[idx]),
                }
            )

    x_encoding = {
        "field": "spend",
        "type": "quantitative",
        "title": "Spend",
    }
    y_encoding = {
        "field": "mean",
        "type": "quantitative",
        "title": "Incremental outcome",
    }
    tooltip_fields = [
        {"field": "channel", "type": "nominal", "title": "Channel"},
        {"field": "spend", "type": "quantitative", "title": "Spend", "format": ".2f"},
        {"field": "mean", "type": "quantitative", "title": "Mean", "format": ".2f"},
    ]
    if include_ci:
        tooltip_fields.extend(
            [
                {"field": "lower", "type": "quantitative", "title": "Lower", "format": ".2f"},
                {"field": "upper", "type": "quantitative", "title": "Upper", "format": ".2f"},
            ]
        )

    selection_name = "channelSelection"
    selection_name_suffix = "sep" if plot_separately else "combined"
    selection_conf = f"{round(confidence_level, 4):.4f}".replace(".", "p")
    selection_name = f"channelSelection_{selection_conf}_{selection_name_suffix}_{'ci' if include_ci else 'raw'}"

    legend_config: dict[str, object] | None = None
    if not plot_separately:
        legend_config = {"title": "Channel", "orient": "bottom"}

    if plot_separately:
        color_line: dict[str, object] = {"value": "#0ea5e9"}
        color_area: dict[str, object] = {"value": "#0ea5e9"}
    else:
        color_line = {"field": "channel", "type": "nominal"}
        if legend_config:
            color_line["legend"] = legend_config
            color_line["title"] = legend_config.get("title", "Channel")
        else:
            color_line["title"] = "Channel"

        color_area = {"field": "channel", "type": "nominal", "legend": None}

    line_layer = {
        "mark": {"type": "line", "interpolate": "monotone", "strokeWidth": 2},
        "encoding": {
            "x": copy.deepcopy(x_encoding),
            "y": copy.deepcopy(y_encoding),
            "tooltip": tooltip_fields,
            "color": color_line,
        },
    }

    if not plot_separately:
        line_layer["encoding"]["opacity"] = {
            "condition": {"param": selection_name, "empty": True, "value": 1},
            "value": 0,
        }

    layers: list[dict[str, object]] = []
    if include_ci:
        layers.append(
            {
                "mark": {"type": "area", "opacity": 0.18},
                "encoding": {
                    "x": copy.deepcopy(x_encoding),
                    "y": {"field": "lower", "type": "quantitative"},
                    "y2": {"field": "upper"},
                    "color": color_area,
                },
            }
        )
        if not plot_separately:
            layers[-1]["encoding"]["opacity"] = {
                "condition": {"param": selection_name, "empty": True, "value": 0.2},
                "value": 0,
            }
    layers.append(line_layer)

    base_spec: dict[str, object] = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "data": {"values": values},
    }

    if not plot_separately:
        base_spec["params"] = [
            {
                "name": selection_name,
                "select": {
                    "type": "point",
                    "fields": ["channel"],
                    "on": "click",
                    "toggle": "event.shiftKey",
                    "clear": "dblclick",
                },
                "bind": "legend",
            }
        ]

    if plot_separately:
        columns = max(1, min(3, int(math.ceil(math.sqrt(len(channels))))))
        base_spec.update(
            {
                "facet": {
                    "field": "channel",
                    "type": "nominal",
                    "columns": columns,
                    "title": "Channel",
                },
                "spec": {
                    "layer": layers,
                    "width": "container",
                    "height": 220,
                },
                "resolve": {"scale": {"y": "independent"}},
            }
        )
    else:
        base_spec.update(
            {
                "layer": layers,
                "width": "container",
                "height": 360,
            }
        )

    return base_spec


@router.get("/healthz")
def healthz() -> dict[str, object]:
    """Health check endpoint."""
    mmm = _load_mmm_model()
    channels = list(mmm.input_data.media_channel.values)
    return {
        "status": "ok",
        "model_version": 1,
        "channels": channels,
    }


def warm_response_curves_chart_cache() -> None:
    """Compute and cache common response-curve chart specs to avoid first-request stalls."""
    # Ensure analyzer is initialized
    _ = _get_analyzer()
    # Warm a couple of typical combinations; ignore errors during warmup
    try:
        _get_response_curves_chart_spec(0.9, False, True)
    except Exception:
        pass
    try:
        _get_response_curves_chart_spec(0.9, True, True)
    except Exception:
        pass

@router.post("/preload")
def preload_model() -> dict[str, object]:
    """Preload the MMM model and analyzer to warm up the cache."""
    try:
        mmm = _load_mmm_model()
        analyzer = _get_analyzer()
        channels = list(mmm.input_data.media_channel.values)

        # Also warm the response-curves chart cache so the first request is fast
        try:
            warm_response_curves_chart_cache()
        except Exception:
            pass

        return {
            "status": "preloaded",
            "model_loaded": True,
            "analyzer_loaded": True,
            "channels": channels,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to preload: {exc}") from exc


@router.get("/contributions")
def get_contributions(
    start: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    credible_interval: float = Query(0.9, ge=0.5, le=0.99, description="Credible interval"),
) -> dict[str, object]:
    """Get time-series contribution data for all channels."""
    try:
        mmm = _load_mmm_model()
        analyzer = _get_analyzer()

        # Get incremental outcome (contributions) without time aggregation
        incr_outcome = analyzer.incremental_outcome(
            aggregate_times=False,
            aggregate_geos=True,
            include_non_paid_channels=False
        )

        # Convert to numpy
        incr_np = np.array(incr_outcome)  # Shape: (n_chains, n_draws, n_times, n_channels)

        # Get time and channel info
        times = pd.to_datetime(mmm.input_data.time.values)
        channels = list(mmm.input_data.media_channel.values)

        # Filter by date range if provided
        if start or end:
            mask = np.ones(len(times), dtype=bool)
            if start:
                mask &= times >= pd.to_datetime(start)
            if end:
                mask &= times <= pd.to_datetime(end)
            times = times[mask]
            incr_np = incr_np[:, :, mask, :]

        # Compute statistics across chains and draws
        mean_contrib = incr_np.mean(axis=(0, 1))  # (n_times, n_channels)
        lower_q = (1 - credible_interval) / 2
        upper_q = 1 - lower_q
        lower_contrib = np.quantile(incr_np, lower_q, axis=(0, 1))
        upper_contrib = np.quantile(incr_np, upper_q, axis=(0, 1))

        # Build response
        points = []
        for t in range(len(times)):
            total_mean = float(mean_contrib[t, :].sum())
            total_lower = float(lower_contrib[t, :].sum())
            total_upper = float(upper_contrib[t, :].sum())

            channel_data = []
            for c, channel in enumerate(channels):
                contrib_mean = float(mean_contrib[t, c])
                share = contrib_mean / total_mean if total_mean > 0 else 0.0
                channel_data.append({
                    "id": channel,
                    "name": channel,
                    "mean": contrib_mean,
                    "lower": float(lower_contrib[t, c]),
                    "upper": float(upper_contrib[t, c]),
                    "share": share
                })

            points.append({
                "time": times[t].date().isoformat(),
                "total_mean": total_mean,
                "total_lower": total_lower,
                "total_upper": total_upper,
                "channels": channel_data
            })

        return {
            "start": times[0].date().isoformat(),
            "end": times[-1].date().isoformat(),
            "points": points
        }
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=f"Meridian not available: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _build_response_curve(
    channel: Optional[str],
    points: int,
    spend_max: Optional[float],
    credible_interval: float,
) -> dict[str, object]:
    try:
        mmm = _load_mmm_model()
        analyzer = _get_analyzer()

        # Get available channels
        channels = list(mmm.input_data.media_channel.values)
        selected_channel = channel or (channels[0] if channels else None)
        if not selected_channel:
            raise HTTPException(status_code=400, detail="No channels available")

        if selected_channel not in channels:
            raise HTTPException(status_code=400, detail=f"Channel '{selected_channel}' not found")

        # Get response curves from Meridian
        spend_multipliers_array = np.linspace(0, 2, points) if points else None
        response_curves_ds = analyzer.response_curves(
            spend_multipliers=spend_multipliers_array.tolist() if spend_multipliers_array is not None else None,
            confidence_level=credible_interval
        )

        # Extract data for the selected channel
        channel_data = response_curves_ds.sel(channel=selected_channel)

        # Get spend and incremental outcome
        spend_array = channel_data["spend"].values
        incremental_outcome = channel_data["incremental_outcome"]

        # Extract mean and confidence intervals from the metric dimension
        mean_response = incremental_outcome.sel(metric="mean").values
        lower_response = incremental_outcome.sel(metric="ci_lo").values
        upper_response = incremental_outcome.sel(metric="ci_hi").values

        return {
            "channel": selected_channel,
            "spend": spend_array.tolist(),
            "mean": mean_response.tolist(),
            "lower": lower_response.tolist(),
            "upper": upper_response.tolist(),
            "credible_interval": credible_interval,
            "model_version": 1,
        }
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=f"Meridian not available: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/response-curve")
def get_response_curve(
    channel: Optional[str] = Query(None, description="Channel name"),
    points: int = Query(50, ge=10, le=400, description="Number of points in spend grid"),
    spend_max: Optional[float] = Query(None, ge=0, description="Max spend to evaluate"),
    credible_interval: float = Query(0.8, ge=0.5, le=0.99, description="Posterior credible interval"),
) -> dict[str, object]:
    return _build_response_curve(channel, points, spend_max, credible_interval)


@router.get("/response-curves")
def get_response_curves_multiple(
    channels: Optional[list[str]] = Query(None, description="Channel names (if empty, returns all)"),
    spend_steps: int = Query(50, ge=10, le=400, description="Number of points in spend grid"),
    credible_interval: float = Query(0.9, ge=0.5, le=0.99, description="Credible interval"),
) -> dict[str, object]:
    """Get response curves for multiple channels."""
    try:
        mmm = _load_mmm_model()
        analyzer = _get_analyzer()

        # Get available channels
        all_channels = list(mmm.input_data.media_channel.values)
        selected_channels = channels if channels else all_channels

        # Validate channels
        for ch in selected_channels:
            if ch not in all_channels:
                raise HTTPException(status_code=400, detail=f"Channel '{ch}' not found")

        # Get response curves from Meridian
        spend_multipliers_array = np.linspace(0, 2, spend_steps)
        response_curves_ds = analyzer.response_curves(
            spend_multipliers=spend_multipliers_array.tolist(),
            confidence_level=credible_interval
        )

        # Build response for each channel
        result_channels = []
        for channel in selected_channels:
            channel_data = response_curves_ds.sel(channel=channel)

            # Get spend and incremental outcome
            spend_array = channel_data["spend"].values
            incremental_outcome = channel_data["incremental_outcome"]

            # Extract mean and confidence intervals
            mean_response = incremental_outcome.sel(metric="mean").values
            lower_response = incremental_outcome.sel(metric="ci_lo").values
            upper_response = incremental_outcome.sel(metric="ci_hi").values

            # Build points array
            points_list = []
            for i in range(len(spend_array)):
                points_list.append({
                    "spend": float(spend_array[i]),
                    "mean": float(mean_response[i]),
                    "lower": float(lower_response[i]),
                    "upper": float(upper_response[i])
                })

            # Calculate saturation point (where ROI drops to 50% of initial)
            roi = mean_response / (spend_array + 1e-10)  # Avoid division by zero
            initial_roi = roi[1] if len(roi) > 1 else roi[0]
            saturation_idx = np.where(roi <= initial_roi * 0.5)[0]
            saturation_spend = float(spend_array[saturation_idx[0]]) if len(saturation_idx) > 0 else float(spend_array[-1])

            # Calculate diminishing returns start (where second derivative turns negative)
            if len(mean_response) > 2:
                second_deriv = np.diff(mean_response, n=2)
                dim_returns_idx = np.where(second_deriv < 0)[0]
                diminishing_returns_start = float(spend_array[dim_returns_idx[0]]) if len(dim_returns_idx) > 0 else float(spend_array[0])
            else:
                diminishing_returns_start = float(spend_array[0])

            result_channels.append({
                "id": channel,
                "name": channel,
                "points": points_list,
                "saturation_spend": saturation_spend,
                "diminishing_returns_start": diminishing_returns_start
            })

        return {"channels": result_channels}

    except ImportError as exc:
        raise HTTPException(status_code=500, detail=f"Meridian not available: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/response-curves-chart")
def get_response_curves_chart(
    confidence_level: float = Query(0.9, ge=0.5, le=0.99, description="Confidence level"),
    plot_separately: bool = Query(False, description="Plot each channel separately"),
    include_ci: bool = Query(True, description="Include confidence intervals"),
) -> dict[str, object]:
    """Get response curves as Vega-Lite chart specification using Meridian's visualizer."""
    try:
        vega_spec = _get_response_curves_chart_spec(confidence_level, plot_separately, include_ci)

        return {
            "spec": vega_spec,
            "type": "vega-lite",
            "version": "5",
        }
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=f"Meridian visualizer not available: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/contribution-chart")
def get_contribution_chart(
    time_granularity: str = Query("quarterly", description="Time granularity: weekly, monthly, quarterly"),
) -> dict[str, object]:
    """Get contribution area chart as Vega-Lite specification using Meridian's visualizer."""
    try:
        mmm = _load_mmm_model()
        media_summary = visualizer.MediaSummary(mmm)

        # Generate the chart using Meridian's built-in visualizer
        chart = media_summary.plot_channel_contribution_area_chart(
            time_granularity=time_granularity
        )

        # Convert to Vega-Lite spec
        vega_spec = chart.to_dict()

        return {
            "spec": vega_spec,
            "type": "vega-lite",
            "version": "5",
        }
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=f"Meridian visualizer not available: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
