select
    district,
    total_2020,
    total_2021,
    total_accidents,
    fatal_2020,
    fatal_2021,
    round(
        100.0 * (total_2021 - total_2020) / nullif(total_2020, 0),
        2
    ) as yoy_change_2021_pct,
    latitude,
    longitude,
    coordinate_valid
from {{ ref('stg_accident_district') }}
order by total_accidents desc, district
