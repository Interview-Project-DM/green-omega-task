from __future__ import annotations

from typing import Optional
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from meridian.model.model import load_mmm
from meridian.analysis.analyzer import Analyzer

router = APIRouter(prefix="/mmm", tags=["mmm"])

# Model path
MMM_MODEL_PATH = Path(__file__).resolve().parents[1] / "saved_mmm.pkl"


def _load_mmm_model():
    """Load the MMM model from disk."""
    if not MMM_MODEL_PATH.exists():
        raise HTTPException(status_code=500, detail="MMM model file not found")
    return load_mmm(str(MMM_MODEL_PATH))


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


@router.get("/contributions")
def get_contributions(
    start: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    credible_interval: float = Query(0.9, ge=0.5, le=0.99, description="Credible interval"),
) -> dict[str, object]:
    """Get time-series contribution data for all channels."""
    try:
        mmm = _load_mmm_model()
        analyzer = Analyzer(mmm)

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
        analyzer = Analyzer(mmm)

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
        analyzer = Analyzer(mmm)

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
