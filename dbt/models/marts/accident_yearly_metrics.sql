with yearly as (
    select
        *,
        lag(total_accidents) over (order by year) as previous_year_accidents
    from {{ ref('stg_accident_yearly') }}
)
select
    year,
    fatal_accidents,
    fatal_killed,
    grievous_injury_accidents,
    grievous_injury_injured,
    minor_injury_accidents,
    minor_injury_injured,
    non_injury_accidents,
    total_accidents,
    total_persons_involved,
    round(100.0 * fatal_accidents / nullif(total_accidents, 0), 2) as fatal_accident_share_pct,
    round(100.0 * fatal_killed / nullif(total_accidents, 0), 2) as fatalities_per_100_accidents,
    round(
        100.0 * (total_accidents - previous_year_accidents)
        / nullif(previous_year_accidents, 0),
        2
    ) as yoy_accident_change_pct
from yearly
order by year
