CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING gist (
  workspace_id WITH =,
  tstzrange(start_time, end_time) WITH &&
)
WHERE (status IN ('confirmed', 'in_progress', 'pending', 'pending_payment'));