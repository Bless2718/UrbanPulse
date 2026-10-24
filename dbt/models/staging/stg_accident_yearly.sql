select
    id as accident_yearly_id,
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
    ingested_at
from {{ source('raw', 'accident_yearly_summary') }}
where year between 1900 and 2100
  and total_accidents >= 0
