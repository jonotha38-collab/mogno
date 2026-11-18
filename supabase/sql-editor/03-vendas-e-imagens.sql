begin;

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

revoke execute on function public.resolve_order(uuid,boolean) from public, anon, authenticated;
grant execute on function public.resolve_order(uuid,boolean) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp']);
create policy store_image_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_store_admin()));

commit;
