INSERT INTO storage.buckets (id, name, public) VALUES ('cover-images', 'cover-images', true);

CREATE POLICY "Anyone can view cover images"
ON storage.objects FOR SELECT
USING (bucket_id = 'cover-images');

CREATE POLICY "Authenticated users can upload cover images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cover-images');

CREATE POLICY "Users can update their own cover images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'cover-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own cover images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cover-images' AND (storage.foldername(name))[1] = auth.uid()::text);