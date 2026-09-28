with ranked as (
    select
        *,
        row_number() over (
            partition by station_id
            order by ingested_at desc, weather_observation_id desc
        ) as recency_rank
    from {{ ref('stg_weather_observations') }}
)
select
    weather_observation_id,
    station_id,
    station_name,
    temperature_c,
    humidity_pct,
    rainfall_mm,
    weather_description,
    ingested_at
from ranked
where recency_rank = 1
