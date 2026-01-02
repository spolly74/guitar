-- Knowledge base: image ingestion support (store images + OCR text)

-- 1) Storage bucket for images (private)
insert into storage.buckets (id, name, public)
values ('knowledge-images', 'knowledge-images', false)
on conflict (id) do nothing;

-- Per-user access policies for the bucket's objects
-- NOTE: storage.objects has columns: id, bucket_id, name, owner, metadata, created_at, updated_at, etc.
drop policy if exists "knowledge_images_objects_select_own" on storage.objects;
create policy "knowledge_images_objects_select_own"
on storage.objects for select
using (bucket_id = 'knowledge-images' and owner = auth.uid());

drop policy if exists "knowledge_images_objects_insert_own" on storage.objects;
create policy "knowledge_images_objects_insert_own"
on storage.objects for insert
with check (bucket_id = 'knowledge-images' and owner = auth.uid());

drop policy if exists "knowledge_images_objects_update_own" on storage.objects;
create policy "knowledge_images_objects_update_own"
on storage.objects for update
using (bucket_id = 'knowledge-images' and owner = auth.uid())
with check (bucket_id = 'knowledge-images' and owner = auth.uid());

drop policy if exists "knowledge_images_objects_delete_own" on storage.objects;
create policy "knowledge_images_objects_delete_own"
on storage.objects for delete
using (bucket_id = 'knowledge-images' and owner = auth.uid());

-- 2) App table to track images + OCR results
create table if not exists public.knowledge_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  source_url text not null,
  storage_path text not null, -- e.g. userId/documentId/hash.jpg
  content_type text not null default 'image/jpeg',
  bytes int not null default 0,
  alt_text text not null default '',
  caption text not null default '',
  ocr_text text not null default '',
  vision_summary text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists knowledge_images_user_id_idx on public.knowledge_images(user_id);
create index if not exists knowledge_images_document_id_idx on public.knowledge_images(document_id);

alter table public.knowledge_images enable row level security;

create policy "knowledge_images_select_own"
on public.knowledge_images for select
using (auth.uid() = user_id);

create policy "knowledge_images_insert_own"
on public.knowledge_images for insert
with check (auth.uid() = user_id);

create policy "knowledge_images_update_own"
on public.knowledge_images for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "knowledge_images_delete_own"
on public.knowledge_images for delete
using (auth.uid() = user_id);
