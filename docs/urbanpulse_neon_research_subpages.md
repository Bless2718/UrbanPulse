# UrbanPulse neon UI across research and map pages

## Scope

This change extends the visual system of the **merged full neon dashboard PR #15** across the four existing routes:

- `/forecast/districts` — District Lab
- `/forecast/evaluation` — Forecast Evaluation
- `/conditions` — Live Conditions
- `/map` — Geospatial Map

The UI follows the existing futuristic dark-navy/cyan reference, with glow-bordered glass panels, pill controls, radar-like decorative headers, softly illuminated KPI cards, chart surfaces, hover/focus feedback, and consistent navigation. The common `NeonPageHero` component provides a clear title, source/quality context and a radar graphic that is **pure decoration**, never real incident locations.

## Page-specific changes

### District Lab

- Matching two-column hero and evaluation spotlight; shortcuts to Evaluation, Live Conditions and Map.
- Glowing KPI panels, preserved user-controlled district/year/metric selectors and annual-change slider.
- Brighter historical line chart surface and proportional comparison bars.
- Historical reporting-boundary warnings and arithmetic-only scenario disclosure unchanged.

### Forecast Evaluation

- Neon hero with an explicit data provenance spotlight and other workspace links.
- Source validation result, reporting-area selectors, experimental holdout chart and method comparison restyled in matching glass panels.
- Missing-report command and malformed-report rejection remain fully available.
- The **0/42 model-ready** prohibition, 2024 exclusion and provenance SHA remain visible. No production prediction is introduced.

### Live Conditions

- Neon hero spotlight shows the selected city and the actual Open-Meteo model-time when available.
- Styled city selector, primary submit control, luminous weather KPI cards and hourly outlook panel.
- Existing freshness checks, provider error state, city allowlist, and missing incident/congestion indicators preserved.
- Weather remains contextual only; no calibrated danger probabilities generated.

### Map

- Geospatial hero with explicit reminder that markers represent reporting-area centroids, **not crash sites**.
- Three glow-bordered coordinate quality cards. Missing responses appear as unavailable, not fabricated zeroes.
- Leaflet map frame, selected-period controls, marker popup and historical quality cards use consistent cyan visual styling.
- Exact-name matching, unmatched-data exclusions and distinct 2020–2021/2021–2023 sources remain unchanged.

## Non-goals, safety and technical details

- No changes to backend, SQL, ingestion, model training, Open-Meteo provider, external data access, or API endpoint semantics.
- Do not equate district totals or centroid points with road-level risk or crash-event predictions.
- CSS deliberately reuses the global neon variables and existing `.urban-panel` class instead of adding another UI framework.
- Native selects/buttons remain keyboard-accessible with visible `focus-visible` outline, tables are scrollable on narrow screens, and reduced-motion is honored.
- Existing production-safe missing-data states and research warnings are not hidden.

## Local verification after merge

From PowerShell at the UrbanPulse repository root:

~~~powershell
git status --short
git switch feature/city-hourly-risk-api
git pull --ff-only origin feature/city-hourly-risk-api
docker compose up -d --build --force-recreate web
~~~

Open and inspect:

- http://localhost:3000/forecast/districts
- http://localhost:3000/forecast/evaluation
- http://localhost:3000/conditions
- http://localhost:3000/map

Run frontend checks from `apps/web`: `npm run lint`, `npm run test:evaluation`, and `npm run build`.

## Review checklist

- [ ] All four routes share the neon design without horizontal page overflow at 375px, 768px, 1440px.
- [ ] District controls, ranking filters and scenario slider still update real data correctly.
- [ ] Evaluation selectors and method comparison continue to use true historical holdouts.
- [ ] Live city changes trigger fresh weather requests; missing/stale values never become zero or “safe”.
- [ ] Map historical-period changes still load and position valid centroid markers.
- [ ] Every warning about unvalidated predictions remains visible.
- [ ] Empty reports, inaccessible APIs and missing map source data display informative states.
- [ ] Responsive and keyboard focus styles remain clear.

CI validates compilation/lint/tests; pixel-level confirmation requires opening the app in a browser with the same datasets as the user.
