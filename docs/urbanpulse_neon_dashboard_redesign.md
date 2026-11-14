# Full neon dashboard redesign — reference-image implementation

## Design target and scope

The user's screenshot of UrbanPulse is the primary visual reference: dark navy/cyan futuristic cockpit, glowing pill navigation, two-column hero with abstract geospatial visualization, four neon KPI cards, observed trend with blue-cyan glow, and a large circular severity breakdown.

Implemented on the **existing Next.js application** without adding new packages or altering backend models. The first dashboard viewport has been structurally rebuilt, not merely restyled.

## Files changed

- `apps/web/src/app/page.tsx` — redesigned dashboard layout while retaining statewide history, experimental statewide forecasts, district comparison and research links below.
- `apps/web/src/components/UrbanHero.tsx` — hero headline, feature bullets, animated-feel decorative SVG geospatial network (not crash sites), illustrated map teaser linking to `/map`.
- `apps/web/src/components/DashboardKpiCard.tsx` — glowing responsive cards with sparklines built from actual imported trend counts, where available.
- `apps/web/src/components/AccidentTrendPanel.tsx` — new client component for historical observed accident trend, readable axis, glow and real experimental forecast toggle when origin/horizon align.
- `apps/web/src/components/SeverityDonutPanel.tsx` — four-category crash severity donut only if counts reconcile exactly with total; otherwise show discrepancy and raw counts, not fake percentages.
- `apps/web/src/components/SiteNav.tsx` — neon glass pill navigation across all five routes, aria-current, focus ring, mobile scrolling.
- `apps/web/src/app/globals.css` — reusable neon visual system, cyan/blue/dark gradients, grid texture, decorative waves, responsive CSS and reduced-motion rules; existing Leaflet CSS retained.

## API provenance guarantees

Top cards, recent trend and severity donut use the **same imported accident metrics series**, via:

- `GET /api/v1/accidents/summary`
- `GET /api/v1/accidents/trend`
- `GET /api/v1/accidents/forecast` — only used for the top forecast card and toggle when training end year = latest imported year and forecast year = following year.

The top imported metrics are **not described as Tamil Nadu statewide totals** because the legacy analytics tables have a different series and coverage.

The lower statewide section uses separate:

- `GET /api/v1/accidents/tamil-nadu/annual`
- `GET /api/v1/predictions/tamil-nadu/annual`

Accident numbers are always sourced from actual API responses; missing source data displays an explicit unavailable state. The real baseline is labelled experimental and only appears alongside the imported series when aligned. The user screenshot numbers are *not* hardcoded.

## Data quality / safety

- Donut uses fatal **accidents**, grievous injury accidents, minor injury accidents, and non-injury accidents; `fatal_killed` is separately labelled **persons killed**.
- All four severity categories must be valid nonnegative integers and add exactly to total accidents or donut is suppressed.
- Chart does not connect across missing years or interpolate unobserved points. For clarity the count axis begins at zero.
- Research-only notice states district reporting boundaries, 2024 source revision and risk-model readiness are unresolved.
- The hero visual is a decorative abstract network, **not** a map of real crash hotspots.
- No changes to the risk API, database, model training, data staging or existing safety gates.

## After merging: local viewing

~~~powershell
git status --short
git switch feature/city-hourly-risk-api
git pull --ff-only origin feature/city-hourly-risk-api
docker compose up -d --build --force-recreate web
~~~

Open http://localhost:3000/ and compare against the provided screenshot.

## QA checklist

- [ ] Desktop at 1440–1920px: hero/map split, 4 KPI cards, wide trend chart plus donut panel.
- [ ] At 375px, navigation remains horizontally scrollable; KPI cards stack and charts scroll without body overflow.
- [ ] No-data path shows dashes, empty chart/donut messages and does not fabricate values.
- [ ] Imported metrics are not confused with the statewide 2024/2025 figures.
- [ ] Forecast toggle only appears with a single correctly aligned experimental prediction.
- [ ] Donut displays only when fatal/grievous/minor/non-injury crash categories sum to the stated total.
- [ ] Document source caveats and accessibility in lower sections preserved.
- [ ] Existing District Lab, Forecast Evaluation, Map and Live Conditions pages still navigate correctly.
- [ ] Full npm lint/build and existing backend/research CI jobs pass.

Source screenshot is a **visual target**, not a dataset or forecast. The implementation intentionally preserves differing real geographic and reporting scopes.
