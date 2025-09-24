import unittest
import sys
import os
from datetime import date
from math import isclose

# Add the parent directory to the Python path so we can import the api module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.marketing_mix_service import MarketingMixService


class MarketingMixServiceTests(unittest.TestCase):
    def setUp(self) -> None:  # simple object setup for each test
        self.service = MarketingMixService()

    def test_geo_metadata_loaded(self) -> None:
        metadata = self.service.geo_metadata()
        self.assertTrue(metadata, "expected at least one geo record")

        sample = metadata[0]
        self.assertIn("geo", sample)
        self.assertIn("start", sample)
        self.assertIsInstance(sample["start"], date)
        self.assertGreater(sample["sample_size"], 0)

    def test_national_series_alignment(self) -> None:
        series = self.service.get_national_series()
        self.assertTrue(series, "expected national series to be populated")

        first, last = series[0], series[-1]
        self.assertLessEqual(first.time, last.time)

        total_spend = sum(
            sum(channel.spend for channel in point.channels)
            for point in series
        )
        summary = self.service.get_summary_metrics()
        self.assertTrue(isclose(total_spend, summary["total_spend"], rel_tol=1e-6))

    def test_channel_totals_share_sum(self) -> None:
        totals = self.service.get_channel_totals()
        share_sum = sum(channel["spend_share"] for channel in totals.values())

        self.assertGreaterEqual(share_sum, 0.99)
        self.assertLessEqual(share_sum, 1.01)

        for metrics in totals.values():
            self.assertGreaterEqual(metrics["spend"], 0)
            self.assertGreaterEqual(metrics["impressions"], 0)
            self.assertIn("estimated_conversions", metrics)
            self.assertIn("roas", metrics)

    def test_simulate_budget_shift_respects_total_spend(self) -> None:
        summary = self.service.get_summary_metrics()
        base_totals = self.service.get_channel_totals()
        updated = self.service.simulate_budget_shift("channel0", "channel1", 0.1)

        new_total_spend = sum(metric["spend"] for metric in updated.values())
        self.assertAlmostEqual(new_total_spend, summary["total_spend"], places=4)

        self.assertLess(updated["channel0"]["spend"], base_totals["channel0"]["spend"])
        self.assertGreater(updated["channel1"]["spend"], base_totals["channel1"]["spend"])


if __name__ == "__main__":
    unittest.main()
