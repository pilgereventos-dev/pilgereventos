-- POLICY FIX FOR app_config
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Enable RLS (just in case)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts (optional but recommended if broken)
DROP POLICY IF EXISTS "Enable read access for all users" ON app_config;
DROP POLICY IF EXISTS "Enable insert access for all users" ON app_config;
DROP POLICY IF EXISTS "Enable update access for all users" ON app_config;
DROP POLICY IF EXISTS "Allow all for authenticated" ON app_config;

-- 3. Create permissive policies for now (to fix the Admin Panel issue)

-- Allow anyone to READ the config (needed for public pages/functions)
CREATE POLICY "Allow Public Read" 
ON app_config FOR SELECT 
USING (true);

-- Allow Authenticated users (Admins) to INSERT/UPDATE/DELETE
CREATE POLICY "Allow Admin Write" 
ON app_config FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- EMERGENCY FALLBACK: If authentication is not fully set up on the frontend
-- Uncomment the lines below to allow PUBLIC write access (NOT RECOMMENDED FOR PRODUCTION)
-- CREATE POLICY "Allow Public Write" 
-- ON app_config FOR ALL 
-- USING (true) WITH CHECK (true);
