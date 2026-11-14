# UrbanPulse UI refresh — visual alignment with Forecast Evaluation reference

The supplied screenshot of the existing Forecast Evaluation page establishes the visual direction. The homepage adopts its deep navy background, compact title, cyan section labels, thin outlined cards, amber research caveats, dark graph canvas, readable source table and side-by-side analytics/provenance layout.

**This is a frontend-only UI change. No API, database, forecasts or source measurements were altered.**

## Visible improvements

1. Compact Dashboard heading and shortcuts to evaluation and map.
2. Clear amber notice distinguishing historical observations from unvalidated road-level accident probabilities.
3. Four summary cards all derived from the **same latest statewide source record**: reporting year, accidents, persons killed, provisional/reporting status.
4. New StatewideHistoryChart shows up to seven recorded years with zero-origin Y axis, cyan line, amber provisional segments, tooltips and an accessible recent-year source table.
5. A focused Data context panel explains source coverage, revision limits and lack of model certification.
6. Four route cards to District Lab, Forecast Evaluation, Live Conditions, and the geographic map.
7. Existing statewide forecast panel, district comparison, severity/baseline summary and pipeline descriptions preserved below.
8. Shared SiteNav uses labelled links, aria-current for the active page, keyboard focus treatment and a horizontally scrollable mobile navigation row.

## Safeguards

- Live API values are consumed from the existing Tamil Nadu annual route. No mock figures or inferred rates appear.
- Missing API responses display unavailable values and an honest chart empty state.
- Historical data, provisional data and experimental forecasts stay visually distinct.
- 2024 statewide/district source discrepancy and historical boundary limitations remain visible.
- The graph is for published totals only; it is neither a crash point map nor an hourly risk score.
- Existing production risk model gates and data science code are unchanged.

## Run locally after reviewing and merging the UI PR

~~~powershell
git status --short
git switch feature/city-hourly-risk-api
git pull --ff-only origin feature/city-hourly-risk-api
docker compose up -d --build --force-recreate web
~~~

Open http://localhost:3000/ and verify the existing routes at /forecast/evaluation, /forecast/districts, /conditions and /map.

If the Git pull is blocked by local docker-compose.yml edits, keep a backup or targeted stash before pulling. Never discard uncommitted user changes.

## Visual QA checklist

- [ ] Desktop: consistent compact dashboard, chart, source table and sidebar.
- [ ] Mobile: navigation and tables scroll without horizontal page overflow.
- [ ] No backend: cards and chart show unavailable, not fabricated records.
- [ ] Provisional observations and source status clearly identified.
- [ ] Keyboard access: visible focus for links and selected navigation route.
- [ ] Preserved statewide forecast and district data exploration modules.
- [ ] No claims of validated road-level or hourly prediction accuracy.

CI checks lint and the Next.js production build. Actual pixel comparison requires opening the updated page in a browser.
