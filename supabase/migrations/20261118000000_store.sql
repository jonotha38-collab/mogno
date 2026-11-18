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

create function public.request_order(order_id uuid, product_ids text[], expected_total numeric)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  result public.orders;
  selection jsonb;
  subtotal numeric;
begin
  if order_id is null or coalesce(cardinality(product_ids), 0) not between 1 and 30
    or (select count(distinct id) from unnest(product_ids) as id) <> cardinality(product_ids) then
    raise exception 'invalid_order';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(order_id::text, 0));
  select * into result from public.orders where id = order_id;
  if found then
    if (select array_agg(item->>'id' order by item->>'id') from jsonb_array_elements(result.items) item)
      is distinct from (select array_agg(id order by id) from unnest(product_ids) as id) then
      raise exception 'invalid_order';
    end if;
    return to_jsonb(result);
  end if;

  perform id from public.products where id = any(product_ids) order by id for update;
  select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'size', size, 'price', price) order by id),
    sum(price)
  into selection, subtotal
  from public.products where id = any(product_ids) and status = 'disponivel';

  if coalesce(jsonb_array_length(selection), 0) <> cardinality(product_ids) then
    raise exception 'stock_changed';
  end if;
  if subtotal is distinct from expected_total then
    raise exception 'price_changed';
  end if;

  insert into public.orders (id, items, total) values (order_id, selection, subtotal)
  returning * into result;
  return to_jsonb(result);
end;
$$;

create function public.resolve_order(order_id uuid, sell boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  order_row public.orders;
  ids text[];
  changed integer;
begin
  if not public.is_store_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select * into order_row from public.orders where id = order_id for update;
  if not found or order_row.status <> 'pendente' then
    raise exception 'order_closed';
  end if;

  if sell then
    select array_agg(item->>'id') into ids from jsonb_array_elements(order_row.items) item;
    perform id from public.products where id = any(ids) order by id for update;
    update public.products set status = 'vendido' where id = any(ids) and status = 'disponivel';
    get diagnostics changed = row_count;
    if changed <> cardinality(ids) then
      raise exception 'stock_changed';
    end if;
  end if;

  update public.orders set status = case when sell then 'vendido' else 'cancelado' end where id = order_id;
end;
$$;

revoke execute on function public.is_store_admin(), public.request_order(uuid,text[],numeric), public.resolve_order(uuid,boolean) from public, anon, authenticated;
grant execute on function public.is_store_admin(), public.resolve_order(uuid,boolean) to authenticated;
grant execute on function public.request_order(uuid,text[],numeric) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp']);
create policy store_image_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_store_admin()));

commit;
