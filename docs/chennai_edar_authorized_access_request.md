# Chennai eDAR/iRAD — authorized accident-event data access request

**Status (2026-11-14): CONTACTS VERIFIED; REQUEST NOT SENT; DATA NOT GRANTED OR RECEIVED.**

Follow-up to [PR #11 Chennai crash-event data feasibility](https://github.com/Bless2718/UrbanPulse/pull/11). This note is a **public, non-sensitive request packet**: it does not grant access to eDAR or contain real incident-level accident records. Publicly posting an outreach template is not a substitute for an authorized, traceable application.

## Verified official contact and application channels

| Channel | Publicly posted channel | What to ask | Evidence |
| --- | --- | --- | --- |
| eDAR/iRAD programme, MoRTH/NIC | **pmu.irad@nic.in** | Ask who can authorize and provide a privacy-reviewed research export of Greater Chennai accident events, and how to apply | [Official eDAR India portal](https://irad.parivahan.gov.in/) (page footer shows `pmu[dot]irad[at]nic[dot]in`) |
| IIT Madras RBG Labs / Centre of Excellence for Road Safety (CoERS) | **office@rbg.iitm.ac.in** | Ask whether CoERS can advise the appropriate Chennai custodian, formal research collaboration process or data-use review; do not assume they can release government data | [Official CoERS contact page](https://coers.iitm.ac.in/contact-us/) |
| Government of Tamil Nadu | [Tamil Nadu RTI application portal](https://rtionline.tn.gov.in/) | If ordinary official inquiry cannot identify the appropriate public authority, request **existing, shareable information** about data custodians, data dictionaries, policies and aggregate statistics, not private crash case files | [TN RTI guidelines](https://rtionline.tn.gov.in/guidelines.php) |
| Government of India (central public authorities only) | [Central RTI application portal](https://rtionline.gov.in/) | Use only for the appropriate **central** authority; central portal expressly excludes State Government authorities | [Central RTI instructions](https://rtionline.gov.in/) |

**No verified publicly documented external-researcher export form was found on the eDAR portal.** Its application is role-restricted, and the IIT Madras project description explains that official police and departmental stakeholders use the system. E-mail addresses above are official organizational inboxes, **not proof that their operators are data owners or that the request will be granted**.

## Primary outreach — eDAR programme

- **To:** `pmu.irad@nic.in`
- **Subject:** UrbanPulse | Request for authorized anonymized Chennai road-crash research data access / correct approval process
- **Status:** **DRAFT — NOT SENT**. Project maintainer must review, supply their own identity/contact affiliation (if applicable), and send via their authorized email.

> Dear eDAR/iRAD Programme Team,
>
> I maintain **UrbanPulse**, an independent research/prototype project studying accident patterns and whether road-safety analysis can responsibly incorporate weather, location and traffic conditions in Chennai.
>
> I would like to learn the **correct authorization and data-sharing procedure** for a limited, legally permitted research extract from eDAR/iRAD concerning **Greater Chennai police/traffic jurisdiction** for approximately **2021–2025**, subject to actual data coverage.
>
> Please advise:
> 1. Which central or Tamil Nadu police/transport authority is the legal data custodian and approving officer for a request of this kind?
> 2. Whether an **anonymized, privacy-reviewed, event-level** extract exists and whether independent/non-institutional or partnered research projects may apply; if so, what formal application, sponsorship, ethics review, MoU/data-use agreement and fees (if any) are required?
> 3. Whether a **data dictionary and sample schema containing no personal records** can be shared first to assess feasibility, together with completeness by year, missingness, coverage, revisions and the reporting jurisdiction maps/effective dates?
> 4. Whether data may be accessed in a secure controlled environment or supplied **only as approved aggregate counts** if row-level sharing is not possible.
>
> Our minimal research fields would be incident date and time in IST (or coarsened time window), an approved coarse road-segment/geocell or crash-location representation, severity category, anonymous deduplication key, reporting unit and provenance/revision indicators. We also seek contextual metadata about coverage and missingness. **We do not request names, personal addresses, phone numbers, identities, vehicle registration details, FIR narratives, hospital records, or any access to a restricted dashboard.** We accept further aggregation or suppression of small cells if needed.
>
> We would **not publish, upload to a public repository, redistribute or use any provided restricted data** without written approval. No risk forecasts would be published from the data without appropriate validation.
>
> Could you please direct us to the appropriate authority/process, even if access cannot be offered directly by your office?
>
> Thank you,
>
> UrbanPulse project maintainer  
> [Add your own name and reply email before sending]  
> Public project: https://github.com/Bless2718/UrbanPulse

## Research guidance inquiry — IIT Madras CoERS

- **To:** `office@rbg.iitm.ac.in`
- **Subject:** UrbanPulse Chennai road safety pilot — guidance on approved eDAR/iRAD research data route
- **Status:** **DRAFT — NOT SENT**. Contact CoERS for **process guidance**, not as a presumed data custodian.

> Dear CoERS / RBG Labs Team,
>
> I maintain UrbanPulse, a road-safety research prototype. We are exploring a Chennai-only study on matching historic crash-event time and geographic context with weather and traffic data. Public road-crash sources found so far provide annual totals rather than event-level fields.
>
> Your eDAR/iRAD research programme describes GPS, crash severity and date/time collection. Could you advise whom we should approach for **approved access to anonymized event-level data, or secure research collaboration**, including any institutional sponsorship, ethics review, privacy measures and data-use agreement? If row-level access is not possible, would a non-sensitive schema and approved spatial/time aggregates be suitable starting points?
>
> We are not requesting restricted login credentials, raw FIR files or personal details and would not publish or upload restricted accident data.
>
> Thank you,
>
> UrbanPulse project maintainer  
> [Add your own name and reply email before sending]  
> https://github.com/Bless2718/UrbanPulse

## Formal fallback — Tamil Nadu RTI information request

Only if an ordinary institutional request does not identify the governing authority, the applicant may independently use [Tamil Nadu RTI](https://rtionline.tn.gov.in/) with their own identity, OTP and any applicable fee. **Do not file through the central RTI portal for a Tamil Nadu state authority.** RTI is for access to existing records subject to the applicable law and exemptions; it is not a shortcut to personally identifiable crash data or an authorization for research re-use.

Suggested concise **existing-public-information-only** questions:

> 1. Name/designation of the public authority and office holding or controlling Greater Chennai eDAR/iRAD crash-event data, including the public application address or research data access procedure.
> 2. Copies of currently operative **data-sharing/research-access guidelines**, sample application forms, anonymization/aggregation rules, applicable data dictionaries and responsible nodal contact details.
> 3. Existing year-wise Greater Chennai eDAR/iRAD reporting completeness or officially published **aggregate crash-count tables** for 2021–2025, along with historical reporting-jurisdiction definitions and material revisions, to the extent publicly releasable.
> 4. If the requested record is held by a different public authority, please identify the appropriate authority according to the applicable procedure.
>
> This request does **not** seek personal identifiers, specific case files, vehicle details, restricted credentials or confidential individual injury reports.

## Requested schema & acceptance criteria

**Prefer permission first, then a non-sensitive schema before any event extract.**

| Category | Proposed fields | Privacy / validation gate |
| --- | --- | --- |
| Time | accident date/time (IST), coarse time bucket allowed, source report timestamp separately | Accuracy, missingness, reporting delay |
| Geography | approved road-segment/geocell, generalized location; exact GPS only if explicitly approved and safeguarded | Location precision, linkage/re-identification controls, effective-date jurisdiction boundaries |
| Severity | crash severity, consistent categories and definitions, non-identifying crash count | Harmonization by year, suppression of low counts |
| Data quality | anonymous stable event deduplication key, reporting unit, version and revision status | Duplicate screening, year coverage, backfill controls |
| Exposure | traffic volumes or vehicle-hours, road length, road class, historical speed where authorized | No probability interpretation without denominator/exposure |

**Never commit received event-level data or confidential authority correspondence to GitHub.** Route any permitted dataset through private restricted storage with an agreed data-use agreement and documented deletion/retention controls. Only share synthesized, permitted aggregate summaries in this repository.

## Status ledger / next actions

| Item | Current state | Required next action |
| --- | --- | --- |
| PR #11 feasibility audit | Merged | Keep eligibility gates intact |
| eDAR/iRAD official PMU address | Verified from official portal | Maintainer review and send routing inquiry |
| IIT Madras CoERS office address | Verified from official research-group page | Send process-guidance inquiry if needed |
| Validated permission / data-use agreement | **NOT OBTAINED** | Await written response from actual approving authority |
| Schema/data dictionary | **NOT OBTAINED** | Request non-sensitive data dictionary first |
| Anonymized crash event export | **NOT OBTAINED** | Only accept via formal authorized channel |
| Hourly/geocoded crash model | **BLOCKED** | Need suitable labeled data, exposure, safeguards and independent validation |

**Approval state remains unchanged:** `model_ready = false`, no new accident-danger percentages, no modifications to Phase 1–4 research records or forecasting endpoints.
