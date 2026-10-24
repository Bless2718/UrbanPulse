select
    year,
    total_accidents as target_total_accidents,
    lag_1_accidents,
    lag_2_accidents,
    rolling_3y_accidents,
    rolling_5y_accidents,
    fatal_accident_share_pct,
    fatalities_per_100_accidents,
    persons_per_accident,
    structural_break_2023_flag,
    regime_label
from {{ ref('int_accident_features') }}
order by year
