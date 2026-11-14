# Chennai crash-event data feasibility audit (14 November 2026)

**Decision: NO-GO for training/deploying an hourly or road-level crash probability model.**
**Decision: GO for a Chennai pilot data-access request and review-only mapping research.**

This audit reviews public sources for a Chennai pilot of UrbanPulse's next accident-risk phase. It makes **no changes to existing models, APIs, PostgreSQL data, or city-hour model approval gates**. Weather estimates are already available in UrbanPulse, but they cannot provide crash labels by themselves.

## Verified sources and source eligibility

| Source | Exact public resource | Relevant information confirmed | Suitability and limitations |
| --- | --- | --- | --- |
| Greater Chennai Police / OpenCity — Chennai Road Crashes Data | https://data.opencity.in/dataset/chennai-road-crashes-data | Downloadable CSV/PDF summarizing 1998–2025 Chennai crashes by **year** and severity (28 annual records, fields include YEAR, total accidents, fatal accidents, people killed, grievous/minor injury accidents, non-injury). The CKAN resource is `29162b87-f1a7-4011-b309-b14d904f9a7d` and its public datastore API includes these fields. | **Descriptive trends only. NOT suitable** for city-hour or road-segment ML because event timestamp, lat/lon and traffic exposure are absent. These annual data may overlap existing project data; do not auto-import/double-count. |
| OpenCity / TNGIS — Chennai Police Jurisdictions | https://data.opencity.in/dataset/chennai-police-jurisdictions | Publicly linked KML for **traffic police jurisdictions** and separate law/order police jurisdictions; CKAN records show update 10 June 2026. Traffic police KML resource id `14c3bedd-bb59-49ed-ab80-c5fb93fafcd6`. | **Candidate reference geometry only.** Inspect KML geometry, coverage, projection, boundaries and effective dates before use. A 2026 map is not a historical crosswalk for 2016–2024. Contains **no accident events**. |
| eDAR / iRAD (MoRTH/NIC, IIT Madras) | https://irad.parivahan.gov.in/ and https://coers.iitm.ac.in/irad/ | Official documentation specifies individual crash **date and time, GPS location, severity, road characteristics**, with police collection and department review. | **Best source candidate for training labels**, but we did **not** verify a public anonymized row-level export or unrestricted research access. Dashboard/report access is role/credential-based. Obtain authorization and a legally permitted, privacy-reviewed export before ingestion. |
| iRAD user manuals | https://gisnic.tn.nic.in/irad/downloads/iRAD_MANNUAL_april_2024.pdf and https://irad.parivahan.gov.in/downloads/iRAD_MANUAL_May_2024.pdf | Forms include accident date/time, geolocation, severity, and related reporting/case fields. | Confirms system **schema and capabilities, not dataset access or completeness**. No user-specific crash records should be extracted from sample screenshots. |
| Media Reported Road Traffic Crash Data (research dataset) | https://data.mendeley.com/datasets/bc5sv6wnd9/7 | Individual collision descriptions compiled from news media articles, CC BY 4.0 metadata. | **Do not use to train calibrated local crash probability.** Coverage/geocoding for Chennai has not been verified; media selection bias and unknown total exposure prevent using reported events as representative incident labels. |
| Open-Meteo / existing UrbanPulse weather feed | https://open-meteo.com/en/docs | Current and hourly weather forecasts for city centres. | **Context feature only**, not a crash label. For training use source-consistent historical/reanalysis weather aligned to actual crash times and road segments; avoid using forecasts from after each historic incident. |
| HERE Traffic API v7 | https://docs.here.com/traffic-api/docs/introduction-to-here-traffic-api-v7 | Real-time traffic incident/flow endpoints documented. | **Not connected / requires approved provider access and coverage verification.** Historical traffic exposure (vehicle counts/speed/flow) still needed for probability denominators. |

### CKAN schema verification

The public [Chennai crash CSV datastore preview](https://data.opencity.in/api/3/action/datastore_search?resource_id=29162b87-f1a7-4011-b309-b14d904f9a7d&limit=20) returns 28 *annual* records, not 28 individual crashes. Its columns include YEAR, Fatal Accidents, Fatal Killed, Grievous Injury - Accidents, Minor Injury - Accidents, Non Injury, Total Accidents. There are **no individual incident IDs, timestamps, latitudes/longitudes or road segment IDs** in that preview. Do not transform the yearly totals into artificial point events.

The [Chennai traffic-police KML](https://data.opencity.in/dataset/fbc38d27-c621-42ba-ae0e-b9fa9463f394/resource/14c3bedd-bb59-49ed-ab80-c5fb93fafcd6/download/chennai_traffic_police_jurisdictions.kml) is a geographic resource, **not a crash event file**. Administrative or current policing boundaries cannot prove historical accident reporting area equivalence.

## Data-access request — Chennai pilot

**Potential responsible channels:** state road safety/transport authorities, Greater Chennai Traffic Police, and the [eDAR/iRAD programme](https://irad.parivahan.gov.in/) via official institutional processes. The eDAR/iRAD page publishes programme contact `pmu.irad@nic.in`; independently verify the appropriate agency and permissions before requesting data. Do not use private dashboards, hidden endpoints or unauthorized exports.

Ask for an **anonymized, legally sharable extract** confined to the Greater Chennai police coverage or another clearly defined geography, covering multiple consecutive years (ideally 2021–2025), with:

- **Incident-time fields:** accident date and local time (IST), reporting date separately, field completeness and timing quality.
- **Location:** validated crash-site latitude/longitude or a privacy-preserving road-segment/geocell ID, GIS coordinate precision, location uncertainty, road name or road class; no home addresses.
- **Outcome:** fatal/serious/minor/non-injury severity and consistent definitions, collision type, vehicle category counts only where permitted.
- **Reporting provenance:** non-identifying stable record key for safe deduplication, police/traffic reporting jurisdiction, source system, data version, record update status, source documentation, known under-reporting.
- **Coverage and governance:** spatial boundary with **effective dates**, missing-record rates by period/area, late-reporting revisions, licence/access agreement, retention and publication restrictions, permission to join weather/traffic.
- **Exposure:** separately seek matched traffic counts/road-segment vehicle-hours, road length and speed/flow history; without denominators, raw incident counts cannot be calibrated as per-driver accident probabilities.

**Explicitly exclude:** personally identifiable names, contact numbers, identity documents, vehicle registration numbers, FIR details, exact identifiers linking to victims, medical reports, and unneeded narrative text. Ask the data holder for privacy/legal review, especially because precise coordinates plus timestamps can re-identify incidents; coarsen/suppress rare events as required. No personal or restricted data is to be committed to GitHub.

Suggested request wording for an authorized institution:

> UrbanPulse is a road-safety research prototype evaluating whether historical road crash frequency can be modeled with weather and traffic exposure in Chennai. We request permission and guidance for a privacy-reviewed, anonymized extract of crash event date/time (IST), location or suitably generalized road segment, severity, reporting unit and dataset completeness metadata for multiple consecutive years, plus historical reporting-area boundaries and source revision methodology. We do not need names, contact details, licence/vehicle identifiers, FIR narratives or other personal data. Please advise the correct research-access process, terms of use and any limitations on publishing aggregated model findings.

## Acceptance gates (before importing or training)

1. **Access/legal gate:** authoritative data holder grants appropriate access, use and retention rights; privacy review completed.
2. **Event granularity gate:** each event has actual crash time and location (or an approved generalized geography), not just city/month/year totals. Uncertain locations/times must be identified.
3. **Validation gate:** reconcile total events against police/department reports by period and reporting unit. Document coverage, missingness, deduplication and revisions.
4. **Historical geography gate:** obtain valid-at-the-time reporting jurisdiction definitions; do **not** substitute the current 2026 KML as a historical crosswalk.
5. **Feature-alignment gate:** join weather at the event time using a model available at that time or consistent historical reanalysis. Obtain traffic exposure and roadway covariates for candidate non-event periods; avoid target leakage.
6. **Evaluation gate:** hold out later time periods and separate geographic areas; assess precision/recall, calibration, uncertainty, class imbalance and sensitivity to spatial aggregation. Report confidence and data limitations.
7. **Product gate:** only then consider comparable *area-level, time-window* incidence rates/risk categories. Never equate an unvalidated relative score to an individual accident probability.

**Until all gates are satisfied,** `POST /api/v1/accidents/predict-risk` must remain in its existing `MODEL_NOT_READY` state, and the `/conditions` page must show live weather as context, not as accident prediction.

## Immediate non-destructive next actions

1. Request the authorized Chennai event-level extract and a data dictionary from the responsible eDAR/traffic authority.
2. Download and inspect the public police jurisdiction KML **for geometry quality and valid date**, labeling it current-only until verified.
3. If no authorized event extract is available, **skip hour/road-level accident probability modeling**. Continue with historical trend analysis, weather context and explicitly labeled research dashboards. Do not substitute media incidents or synthetic accident events.
4. Once permitted data arrives, perform a separate, private controlled import in an appropriately secured location and a source-coverage report **before** ML feature engineering.

## Result

| Capability | Audit status |
| --- | --- |
| Public annual Chennai accident totals | Available (28 yearly rows, unsuitable for event-level ML) |
| Public contemporary police/traffic-jurisdiction GIS | Available (KML; historical applicability unverified) |
| eDAR/iRAD event fields | Documented (date/time, GPS, severity) |
| Authorized anonymized export for UrbanPulse | **Not obtained** |
| Historical road-segment exposure | **Not verified** |
| Calibrated crash danger predictions | **Blocked**, no model training or deployment approved |

**This is a feasibility/source-inventory report only. No datasets were ingested, no incident records were copied, and no application code or forecasts were changed.**
