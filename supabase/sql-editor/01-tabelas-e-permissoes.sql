begin;

create table public.store_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create function public.is_store_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.store_admins where user_id = auth.uid())
$$;

create table public.products (
  id text primary key check (id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  title text not null check (length(btrim(title)) between 1 and 200),
  category text not null,
  brand text not null,
  size text not null,
  material text not null,
  condition text not null,
  source text not null,
  price numeric(10,2) not null check (price > 0),
  "originalPrice" numeric(10,2) check ("originalPrice" > 0),
  status text not null default 'disponivel' check (status in ('disponivel', 'vendido')),
  badge text not null default '',
  image text not null check (image ~ '^https://'),
  description text not null default '',
  measurements text not null default '',
  vibe text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp()
);

create function public.touch_store_product() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create trigger products_update_timestamp
before update on public.products
for each row execute function public.touch_store_product();

revoke execute on function public.touch_store_product() from public, anon, authenticated;

create table public.orders (
  id uuid primary key,
  items jsonb not null,
  total numeric(12,2) not null,
  status text not null default 'pendente' check (status in ('pendente', 'vendido', 'cancelado')),
  created_at timestamptz not null default now()
);
create index orders_status_created_idx on public.orders (status, created_at desc);

alter table public.store_admins enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

revoke all on public.store_admins, public.products, public.orders from public, anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.orders to authenticated;

create policy products_read on public.products for select to anon, authenticated using (true);
create policy products_admin on public.products for all to authenticated
  using ((select public.is_store_admin())) with check ((select public.is_store_admin()));
create policy orders_admin_read on public.orders for select to authenticated
  using ((select public.is_store_admin()));

revoke execute on function public.is_store_admin() from public, anon, authenticated;
grant execute on function public.is_store_admin() to authenticated;

commit;
