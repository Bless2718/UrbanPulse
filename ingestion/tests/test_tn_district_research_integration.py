"""Opt-in real PostgreSQL smoke test for the isolated research import.

Set TN_RESEARCH_DB_TEST=1 only against an ephemeral test database and after
running the importer twice with --apply. Never run against production.
"""
from hashlib import sha256
import os
import unittest

from ingestion.import_tn_district_research import DATA_PATH, postgres_connection


@unittest.skipUnless(
    os.getenv("TN_RESEARCH_DB_TEST") == "1",
    "Requires an explicitly enabled disposable PostgreSQL CI database",
)
class ResearchImportPostgresTests(unittest.TestCase):
    def test_research_batch_has_exactly_331_quarantined_rows_and_balanced_years(self):
        source_hash = sha256(DATA_PATH.read_bytes()).hexdigest()
        database_url = os.environ["DATABASE_URL"]
        connection = postgres_connection(database_url)
        cursor = connection.cursor()
        try:
            cursor.execute(
                """SELECT row_count, review_state, model_ready
                   FROM staging.tn_district_research_imports
                   WHERE source_sha256=%s""", (source_hash,)
            )
            self.assertEqual(tuple(cursor.fetchone()), (331, "quarantined", False))

            cursor.execute(
                """SELECT year, COUNT(*), SUM(total_accidents), SUM(total_deaths),
                          BOOL_AND(NOT model_ready AND NOT is_ml_prediction)
                   FROM staging.tn_district_research_rows
                   WHERE source_sha256=%s GROUP BY year ORDER BY year""",
                (source_hash,),
            )
            expected = [
                (2016, 32, 71431, 17218, True),
                (2017, 37, 66763, 17918, True),
                (2018, 37, 67279, 18392, True),
                (2019, 37, 62685, 18129, True),
                (2020, 37, 49844, 14527, True),
                (2021, 37, 55682, 15384, True),
                (2022, 38, 64105, 17884, True),
                (2023, 38, 67213, 18347, True),
                (2024, 38, 67183, 18074, True),
            ]
            self.assertEqual([tuple(r) for r in cursor.fetchall()], expected)

            cursor.execute(
                """SELECT COUNT(*), BOOL_AND(boundary_review_required),
                          SUM(CASE WHEN source_revision_review_required THEN 1 ELSE 0 END)
                   FROM staging.tn_district_research_checks
                   WHERE source_sha256=%s""", (source_hash,),
            )
            self.assertEqual(tuple(cursor.fetchone()), (9, True, 1))

            # The disposable database has no production analytics schema, and
            # staging import must not have created or populated one.
            cursor.execute(
                """SELECT to_regclass('analytics.tn_district_accidents'),
                          to_regclass('analytics.tn_annual_accidents'),
                          to_regclass('analytics.tn_statewide_forecasts')"""
            )
            self.assertEqual(tuple(cursor.fetchone()), (None, None, None))
        finally:
            cursor.close()
            connection.close()


if __name__ == "__main__":
    unittest.main()
