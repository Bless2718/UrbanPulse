select
    id as weather_observation_id,
    station_id,
    station_name,
    temperature_c,
    humidity_pct,
    rainfall_mm,
    weather_description,
    ingested_at
from {{ source('raw', 'weather_observations') }}
where temperature_c is null or temperature_c between -60 and 60
