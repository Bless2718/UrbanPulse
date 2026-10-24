with base as (
    select *
    from {{ ref('accident_yearly_metrics') }}
)
select
    year,
    total_accidents,
    fatal_accidents,
    fatal_killed,
    grievous_injury_accidents,
    grievous_injury_injured,
    minor_injury_accidents,
    minor_injury_injured,
    non_injury_accidents,
    total_persons_involved,
    fatal_accident_share_pct,
    fatalities_per_100_accidents,
    yoy_accident_change_pct,
    lag(total_accidents, 1) over (order by year) as lag_1_accidents,
    lag(total_accidents, 2) over (order by year) as lag_2_accidents,
    round(
        avg(total_accidents) over (
            order by year
            rows between 3 preceding and 1 preceding
        ),
        2
    ) as rolling_3y_accidents,
    round(
        avg(total_accidents) over (
            order by year
            rows between 5 preceding and 1 preceding
        ),
        2
    ) as rolling_5y_accidents,
    round(
        1.0 * total_persons_involved / nullif(total_accidents, 0),
        4
    ) as persons_per_accident,
    case when year = 2023 then 1 else 0 end as structural_break_2023_flag,
    case when year >= 2023 then 'post_2022_shift' else 'historical' end as regime_label
from base
order by year
