-- Everything the Drizzle schema cannot express. Idempotent: runs after every migration.

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- unaccent() is stable, not immutable, so it cannot be used in generated columns
-- or expression indexes directly. This wrapper pins the dictionary and is safe.
create or replace function rl_unaccent(text)
returns text language sql immutable strict parallel safe as
$$ select public.unaccent('public.unaccent', $1) $$;

-- ---------------------------------------------------------------- auth bridge
-- profiles mirrors auth.users; the trigger keeps them in step.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_id_auth_users_fk'
  ) then
    alter table public.profiles
      add constraint profiles_id_auth_users_fk
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, locale, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'de'),
    (coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'user'))::profile_role
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(nullif(public.profiles.display_name, ''), excluded.display_name);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ------------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','organisations','manufacturers','categories','equipment_models',
    'listings','comments','offers','orders','content_pages','seller_accounts'
  ] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$I', t);
    execute format(
      'create trigger touch_%1$s before update on public.%1$I
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------- search
-- search_text is a denormalised haystack (title, model, manufacturer, location,
-- description). A trigger fills it; the reindex job refreshes it when the
-- catalogue changes. search_vector is generated from it.
create or replace function public.listing_search_text(p_listing public.listings)
returns text language sql stable as $$
  select concat_ws(' ',
    p_listing.title,
    p_listing.description,
    p_listing.condition_notes,
    p_listing.scope_of_delivery,
    p_listing.location_city,
    p_listing.reference,
    m.name,
    mf.name,
    c.slug,
    -- A device type also answers to its parent: a "tischzentrifugen" listing is still found by "zentrifuge".
    parent.slug,
    p_listing.year::text
  )
  from public.equipment_models m
  join public.manufacturers mf on mf.id = m.manufacturer_id
  join public.categories c on c.id = m.category_id
  left join public.categories parent on parent.id = c.parent_id
  where m.id = p_listing.model_id
$$;

create or replace function public.listings_fill_search_text()
returns trigger language plpgsql as $$
begin
  new.search_text := coalesce(public.listing_search_text(new), new.title);
  return new;
end $$;

drop trigger if exists listings_search_text on public.listings;
create trigger listings_search_text
  before insert or update of title, description, condition_notes, scope_of_delivery,
    location_city, model_id, year, reference
  on public.listings
  for each row execute function public.listings_fill_search_text();

alter table public.listings drop column if exists search_vector;
alter table public.listings
  add column search_vector tsvector
  generated always as (
    to_tsvector('german', coalesce(rl_unaccent(search_text), ''))
  ) stored;

create index if not exists listings_search_vector_idx on public.listings using gin (search_vector);
create index if not exists listings_search_trgm_idx
  on public.listings using gin (rl_unaccent(search_text) gin_trgm_ops);

create index if not exists equipment_models_name_trgm_idx
  on public.equipment_models using gin (rl_unaccent(name) gin_trgm_ops);
create index if not exists manufacturers_name_trgm_idx
  on public.manufacturers using gin (rl_unaccent(name) gin_trgm_ops);

-- Partial index for the hot path: publicly visible listings.
create index if not exists listings_public_idx
  on public.listings (published_at desc)
  where status = 'active' and deleted_at is null;
