-- Cria bucket 'banners' para armazenar imagens de banners promocionais
-- Rode no SQL Editor do Supabase Dashboard.

-- 1. Criar bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'banners',
  'banners',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- 2. Política: qualquer um pode ler (banners são públicos no app)
create policy "Banners são públicos"
on storage.objects for select
to public
using ( bucket_id = 'banners' );

-- 3. Política: admin autenticado pode fazer upload
create policy "Admin pode enviar banners"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'banners' );

-- 4. Política: admin pode deletar
create policy "Admin pode deletar banners"
on storage.objects for delete
to authenticated
using ( bucket_id = 'banners' );
