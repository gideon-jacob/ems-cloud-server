-- Drop function if it already exists
DROP FUNCTION IF EXISTS get_latest_readings_per_room;

-- Create the function
-- REPLACE 'readings' WITH YOUR ACTUAL TABLE NAME if it is different
CREATE OR REPLACE FUNCTION get_latest_readings_per_room(limit_count INT)
RETURNS TABLE (
  id uuid,
  room_id varchar,
  room_type varchar,
  recorded_time timestamptz,
  temperature_c float4,
  humidity_pct float4,
  differential_pressure_pa float4
)
LANGUAGE sql
AS $$
  WITH ranked_readings AS (
    SELECT 
      *,
      ROW_NUMBER() OVER (PARTITION BY room_id ORDER BY recorded_time DESC) as rn
    FROM readings_v2  -- <<<< ENSURE THIS MATCHES YOUR TABLE NAME
  )
  SELECT 
    id,
    room_id,
    room_type,
    recorded_time,
    temperature_c,
    humidity_pct,
    differential_pressure_pa
  FROM ranked_readings
  WHERE rn <= limit_count;
$$;
