"""Offline regression tests for the Firecrawl-retrieved OpenCity crosscheck."""
import csv
import tempfile
import unittest
from pathlib import Path

from ingestion.audit_tn_published_2021_2023 import (
    ORIGINAL, SECONDARY, audit,
)


class PublishedDistrictDataAuditTests(unittest.TestCase):
    def test_every_available_2021_2023_value_matches(self):
        report = audit()
        self.assertEqual(report["compared_rows"], 113)
        self.assertEqual(report["matching_rows"], 113)
        self.assertEqual(report["mismatching_rows"], 0)
        self.assertEqual(report["missing_in_original"], [])
        self.assertEqual(report["missing_in_secondary"], [])
        self.assertTrue(report["source_transcription_consistent"])
        self.assertEqual(
            [(x["year"], x["row_count"], x["accidents"], x["deaths"])
             for x in report["annual_checks"]],
            [(2021, 37, 55682, 15384), (2022, 38, 64105, 17884),
             (2023, 38, 67213, 18347)],
        )
        self.assertFalse(report["geography_crosswalk_verified"])
        self.assertFalse(report["2024_revision_resolved"])
        self.assertFalse(report["district_forecasting_approved"])
        self.assertFalse(report["model_ready"])
        self.assertEqual(report["2024_unallocated_gap"], {"accidents": 343, "deaths": 375})

    def test_one_wrong_district_accident_is_detected_not_accepted(self):
        text = SECONDARY.read_text(encoding="utf-8")
        self.assertIn("2022,CHENGALPATTU,3044,937", text)
        tampered = text.replace("2022,CHENGALPATTU,3044,937",
                                "2022,CHENGALPATTU,3045,937")
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "reference.csv"
            path.write_text(tampered, encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "source year total differs"):
                audit(ORIGINAL, path)

    def test_transcription_mismatch_with_unchanged_year_total_still_detected(self):
        text = SECONDARY.read_text(encoding="utf-8")
        self.assertIn("2022,CHENGALPATTU,3044,937", text)
        self.assertIn("2022,KANCHEEPURAM,1011,303", text)
        tampered = text.replace("2022,CHENGALPATTU,3044,937",
                                "2022,CHENGALPATTU,3045,937")
        tampered = tampered.replace("2022,KANCHEEPURAM,1011,303",
                                    "2022,KANCHEEPURAM,1010,303")
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "reference.csv"
            path.write_text(tampered, encoding="utf-8")
            report = audit(ORIGINAL, path)
        self.assertEqual(report["mismatching_rows"], 2)
        self.assertFalse(report["source_transcription_consistent"])
        self.assertFalse(report["model_ready"])

    def test_missing_area_requires_review(self):
        text = SECONDARY.read_text(encoding="utf-8")
        missing = "\n".join(line for line in text.splitlines()
                            if not line.startswith("2023,THIRUVALLUR,")) + "\n"
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "reference.csv"
            path.write_text(missing, encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "source batch size"):
                audit(ORIGINAL, path)

    def test_source_2016_2024_not_modified_by_audit(self):
        before = ORIGINAL.read_bytes()
        report = audit()
        self.assertEqual(before, ORIGINAL.read_bytes())
        self.assertEqual(len(before) > 60000, True)
        self.assertTrue(report["original_file_sha256"])
        self.assertTrue(report["reference_snapshot_sha256"])


if __name__ == "__main__":
    unittest.main()
