select
    id as accident_district_id,
    district,
    fatal_2020,
    fatal_2021,
    nonfatal_2020,
    nonfatal_2021,
    total_2020,
    total_2021,
    total_accidents,
    latitude,
    longitude,
    case
        when latitude between 8.0 and 13.6
         and longitude between 76.0 and 80.5
        then true
        else false
    end as coordinate_valid,
    ingested_at
from {{ source('raw', 'accident_district_summary') }}
where district is not null
