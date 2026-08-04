-- Migration: 034_add_corporate_employee_accepted_at
-- Distinguishes "invite sent" from "invite actually accepted".

ALTER TABLE corporate_employees
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
