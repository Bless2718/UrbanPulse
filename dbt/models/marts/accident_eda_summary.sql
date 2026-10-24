with base as (
    select *
    from {{ ref('accident_yearly_metrics') }}
),
stats as (
    select
        min(year) as start_year,
        max(year) as end_year,
        count(*) as years_observed,
        round(avg(total_accidents), 2) as avg_annual_accidents,
        max(total_accidents) as peak_accidents,
        min(total_accidents) as lowest_accidents,
        round(avg(total_accidents) filter (where year < 2020), 2) as avg_pre_2020,
        round(avg(total_accidents) filter (where year between 2020 and 2022), 2) as avg_2020_2022,
        round(avg(total_accidents) filter (where year >= 2023), 2) as avg_2023_onward
    from base
)
select
    stats.*,
    (select year from base order by total_accidents desc, year desc limit 1) as peak_year,
    (select year from base order by total_accidents asc, year desc limit 1) as lowest_year,
    2023 as structural_break_year,
    '2023 shows a large level shift; treat it as a structural-break candidate before forecasting.' as structural_break_note
from stats
