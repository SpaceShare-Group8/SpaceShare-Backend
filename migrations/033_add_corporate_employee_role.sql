-- Migration: 033_add_corporate_employee_role
-- Allows a user's `role` to become 'corporate_employee' once they accept
-- a corporate invite. Postgres names an unnamed CHECK constraint
-- "<table>_<column>_check" by default, so we drop and re-add it under
-- that name to extend the allowed values.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('seeker', 'host', 'corporate_admin', 'admin', 'corporate_employee'));
