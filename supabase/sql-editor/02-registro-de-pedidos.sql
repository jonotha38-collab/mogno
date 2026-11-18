begin;

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

revoke execute on function public.request_order(uuid,text[],numeric) from public, anon, authenticated;
grant execute on function public.request_order(uuid,text[],numeric) to anon, authenticated;

commit;
