/*
# Create listing-images storage bucket

## Overview
Creates a private storage bucket for user-uploaded listing images.
Each user can only access their own images via folder-scoped RLS policies.

## Storage
- Bucket name: listing-images
- Public: false (private, accessed via signed URLs from the app)
- Folder structure: <user_id>/<filename>

## Security
- SELECT (read): users can only read files in their own user_id folder
- INSERT (upload): users can only upload to their own user_id folder
- UPDATE: users can only update files in their own folder
- DELETE: users can only delete files in their own folder
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage objects
DROP POLICY IF EXISTS "users_read_own_images" ON storage.objects;
CREATE POLICY "users_read_own_images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users_upload_own_images" ON storage.objects;
CREATE POLICY "users_upload_own_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users_update_own_images" ON storage.objects;
CREATE POLICY "users_update_own_images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users_delete_own_images" ON storage.objects;
CREATE POLICY "users_delete_own_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);
