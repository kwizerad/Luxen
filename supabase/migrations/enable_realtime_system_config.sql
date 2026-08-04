-- Enable realtime for system_config table so students get live updates
-- when admin toggles standalone_exam_enabled or other settings
ALTER PUBLICATION supabase_realtime ADD TABLE system_config;
