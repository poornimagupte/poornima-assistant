-- Add content type and target date to blog_posts.
-- content_type covers the full range of writing Poornima does.
alter table blog_posts
  add column if not exists content_type text not null default 'blog'
    check (content_type in ('blog', 'linkedin', 'conference', 'talk', 'newsletter', 'other')),
  add column if not exists target_date date;

-- Ensure grants are set (needed for local Supabase).
grant select, insert, update, delete on public.blog_posts to authenticated, anon, service_role;
