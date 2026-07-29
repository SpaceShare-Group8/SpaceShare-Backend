-- Migration: 022_add_amenity_name_check
-- Restricts workspace_amenities.amenity_name to a fixed set of values so
-- Frontend can reliably filter/display without free-text mismatches
-- (e.g. "Wifi" vs "wifi" vs "wi-fi" all being treated as different amenities).
--
-- TEMPORARY list pending confirmation from Design — see
-- src/workspace/amenities.constants.js for the source of truth.
-- Keep this constraint's list in sync with that file manually.

ALTER TABLE workspace_amenities DROP CONSTRAINT IF EXISTS workspace_amenities_amenity_name_check;

ALTER TABLE workspace_amenities
ADD CONSTRAINT workspace_amenities_amenity_name_check
CHECK (amenity_name IN (
    'wifi', 'parking', 'air_conditioning', 'power_backup',
    'printer', 'whiteboard', 'kitchen_access', 'security', 'standing_desk'
));