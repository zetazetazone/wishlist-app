-- Extend avatars bucket with RLS policies for group photos
-- Group photos are stored at: groups/{groupId}/{filename}
-- Only group admins can upload/update/delete group photos
-- SELECT is already handled by "Anyone can view avatars" policy (bucket is public)

-- Allow group admins to upload photos to their groups
CREATE POLICY "Group admins can upload group photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'groups'
  AND EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = (storage.foldername(name))[2]::uuid
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
  )
);

-- Allow group admins to update their group's photos
CREATE POLICY "Group admins can update group photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'groups'
  AND EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = (storage.foldername(name))[2]::uuid
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'groups'
  AND EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = (storage.foldername(name))[2]::uuid
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
  )
);

-- Allow group admins to delete their group's photos
CREATE POLICY "Group admins can delete group photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'groups'
  AND EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = (storage.foldername(name))[2]::uuid
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
  )
);
