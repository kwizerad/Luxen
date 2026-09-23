-- Migration: Add admin-configurable payment amounts and driver settings to system_config
-- Created: 2026-08-08

INSERT INTO system_config (key, value, description)
VALUES
  ('theory_exam_request_fee', '5000', 'Fee for requesting a theory exam code (RWF)'),
  ('practical_exam_request_fee', '10000', 'Fee for requesting a practical exam code (RWF)'),
  ('driver_cancel_window_minutes', '30', 'Default cancellation window in minutes for driver bookings'),
  ('driver_cancel_enabled', 'true', 'Enable/disable booking cancellation feature globally')
ON CONFLICT (key) DO NOTHING;
