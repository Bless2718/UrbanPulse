"""Offline regression tests for quarantined Tamil Nadu district research staging."""
import contextlib
import csv
from io import StringIO
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

from ingestion import import_tn_district_research as loader


class DistrictResearchStagingTests(unittest.TestCase):
    def test_reviewed_extract_has_all_331_rows_and_nine_balanced_years(self):
        rows, checks, meta = loader.validate_extract()
        self.assertEqual(len(rows), 331)
        self.assertEqual(len(checks), 9)
        self.assertEqual(meta["review_state"], "quarantined")
        self.assertFalse(meta["model_ready"])
        self.assertEqual(checks[0]["accident_sum"], 71431)
        self.assertEqual(checks[-1]["accident_sum"], 67183)
        self.assertEqual(checks[-1]["death_sum"], 18074)
        self.assertTrue(checks[-1]["source_revision_review_required"])
        self.assertTrue(all(c["boundary_review_required"] for c in checks))
        self.assertTrue(all(r["is_ml_prediction"] is False for r in rows))

    def write_mutated(self, mutate):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        path = Path(directory.name) / "research.csv"
        with loader.DATA_PATH.open(encoding="utf-8-sig", newline="") as source:
            reader = csv.DictReader(source)
            rows = list(reader)
            fields = reader.fieldnames
        mutate(rows)
        with path.open("w", encoding="utf-8", newline="") as dest:
            writer = csv.DictWriter(dest, fieldnames=fields, lineterminator="\n")
            writer.writeheader()
            writer.writerows(rows)
        return path, rows

    def test_changed_source_fails_digest_before_db_write(self):
        def mutate(rows):
            rows[0]["total_accidents"] = "999"
        file, _ = self.write_mutated(mutate)
        with self.assertRaisesRegex(ValueError, "differs from the reviewed"):
            loader.validate_extract(file)

    def test_duplicate_reporting_area_rejected(self):
        def mutate(rows):
            rows.append(rows[0].copy())
        file, rows = self.write_mutated(mutate)
        with patch.object(loader, "DATA_DIGEST", loader.canonical_digest(rows)):
            with self.assertRaisesRegex(ValueError, "Duplicate district-year"):
                loader.validate_extract(file)

    def test_correct_digest_but_wrong_published_total_rejected(self):
        def mutate(rows):
            row = next(r for r in rows if r["year"] == "2024")
            row["total_accidents"] = str(int(row["total_accidents"]) + 1)
        file, rows = self.write_mutated(mutate)
        with patch.object(loader, "DATA_DIGEST", loader.canonical_digest(rows)):
            with self.assertRaisesRegex(ValueError, "totals or provenance mismatch for 2024"):
                loader.validate_extract(file)

    def test_changed_source_url_rejected_even_with_updated_digest(self):
        def mutate(rows):
            rows[0]["source_url"] = "https://example.com/unverified.pdf"
        file, rows = self.write_mutated(mutate)
        with patch.object(loader, "DATA_DIGEST", loader.canonical_digest(rows)):
            with self.assertRaisesRegex(ValueError, "Source URL or document page"):
                loader.validate_extract(file)

    def test_validation_manifest_must_be_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "validation.csv"
            text = loader.VALIDATION_PATH.read_text(encoding="utf-8")
            path.write_text(text.replace("67183,67183,0", "67184,67184,0"), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Annual checks CSV differs"):
                loader.validate_extract(validation_path=path)

    def test_default_cli_dry_run_makes_no_database_connection(self):
        output = StringIO()
        with patch.object(sys, "argv", ["import_tn_district_research.py"]), \
             patch.object(loader, "postgres_connection") as connection, \
             contextlib.redirect_stdout(output):
            loader.main()
        self.assertIn("database unchanged", output.getvalue())
        connection.assert_not_called()

    def test_apply_requires_explicit_database_url(self):
        with patch.object(sys, "argv", ["import_tn_district_research.py", "--apply"]), \
             patch.dict(os.environ, {"DATABASE_URL": ""}), \
             contextlib.redirect_stderr(StringIO()), \
             self.assertRaises(SystemExit) as raised:
            loader.main()
        self.assertEqual(raised.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
