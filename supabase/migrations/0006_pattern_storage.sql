-- Storage bucket for pattern PDFs and images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patterns', 'patterns', false, 52428800,
        array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- RLS: users can only access their own folder (uid/filename).
create policy "owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'patterns' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'patterns' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'patterns' and (storage.foldername(name))[1] = auth.uid()::text);

-- PDF storage URL on crochet items.
alter table crochet_items add column if not exists pdf_url text;
