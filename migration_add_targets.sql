-- Add columns to support sending messages to specific targets (companions)
-- instead of always defaulting to the main guest's phone/name.

ALTER TABLE message_queue 
ADD COLUMN IF NOT EXISTS target_phone TEXT,
ADD COLUMN IF NOT EXISTS target_name TEXT;
