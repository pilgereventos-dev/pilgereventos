-- Migration: Add Media Support to Automation Rules and Message Queue

-- 1. Add Media Columns to automation_rules
ALTER TABLE "public"."automation_rules"
ADD COLUMN IF NOT EXISTS "media_url" text,
ADD COLUMN IF NOT EXISTS "media_type" text,
ADD COLUMN IF NOT EXISTS "media_name" text;

-- 2. Add Media Columns to message_queue
ALTER TABLE "public"."message_queue"
ADD COLUMN IF NOT EXISTS "media_url" text,
ADD COLUMN IF NOT EXISTS "media_type" text,
ADD COLUMN IF NOT EXISTS "media_name" text;

-- 3. Create Storage Bucket for Automation Media
INSERT INTO "storage"."buckets" ("id", "name", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types")
VALUES ('automation_media', 'automation_media', true, false, 52428800, '{image/*,video/*,audio/*,application/pdf}')
ON CONFLICT ("id") DO NOTHING;

-- 4. Storage Policies for automation_media (Public Read, Authenticated Upload)

-- Allow public read access (necessary for WhatsApp to download the media)
CREATE POLICY "Public Read Access for automation_media"
ON "storage"."objects"
FOR SELECT
USING (bucket_id = 'automation_media');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload to automation_media"
ON "storage"."objects"
FOR INSERT
WITH CHECK (
    bucket_id = 'automation_media' 
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update/delete (optional, for replacing files)
CREATE POLICY "Authenticated users can update automation_media"
ON "storage"."objects"
FOR UPDATE
USING (
    bucket_id = 'automation_media' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete automation_media"
ON "storage"."objects"
FOR DELETE
USING (
    bucket_id = 'automation_media' 
    AND auth.role() = 'authenticated'
);
