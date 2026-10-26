-- 002_inventory.sql (الجزء 1 من 3): الجداول
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 200),
  sku text not null check (length(trim(sku)) between 1 and 50),
  category text not null
    check (category in ('fertilizers','pesticides','irrigation','seeds','tools','other')),
  unit text not null
    check (unit in ('kg','g','l','ml','bag','piece','other')),
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  min_stock numeric(14,3) not null default 0 check (min_stock >= 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  notes text,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_movement_at timestamptz,
  constraint inventory_items_sku_unique unique (organization_id, sku),
  constraint inventory_items_id_org_unique unique (id, organization_id)
);

create index inventory_items_org_idx on public.inventory_items (organization_id);
create index inventory_items_farm_idx on public.inventory_items (farm_id);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  item_id uuid not null,
  movement_type text not null
    check (movement_type in ('purchase','issue','return','adjustment')),
    quantity numeric(14,3) not null check (quantity >= 0),
  quantity_before numeric(14,3) not null default 0,
  quantity_after numeric(14,3) not null default 0,
  difference numeric(14,3) not null default 0,
  unit_price numeric(14,2) check (unit_price is null or unit_price >= 0),
  movement_date date not null default current_date,
  reason text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint inventory_movements_item_fk
    foreign key (item_id, organization_id)
    references public.inventory_items (id, organization_id) on delete restrict,
  constraint inventory_movements_reason_required
    check (movement_type not in ('issue','adjustment') or length(trim(coalesce(reason, ''))) > 0)
);

create index inventory_movements_item_idx on public.inventory_movements (item_id, created_at desc);
create index inventory_movements_org_idx on public.inventory_movements (organization_id, movement_date desc);


-- 002_inventory.sql (الجزء 2 من 3): الـ triggers
-- الكمية صفر مسموحة لتسوية الجرد فقط
alter table public.inventory_movements
  add constraint inventory_movements_qty_positive
  check (movement_type = 'adjustment' or quantity > 0);

-- حارس جدول الأصناف: يمنع تعديل الكمية مباشرة
create or replace function public.inventory_items_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if new.farm_id is not null and not exists (
    select 1 from public.farms f
    where f.id = new.farm_id and f.organization_id = new.organization_id
  ) then
    raise exception 'المزرعة لا تتبع هذه المنظمة';
  end if;

  if tg_op = 'INSERT' then
    if new.quantity <> 0 then
      raise exception 'الكمية الابتدائية تُسجَّل بحركة شراء أو تسوية جرد';
    end if;
    new.last_movement_at := null;
    if v_uid is not null then
      new.created_by := v_uid;
    end if;
  else
    if new.organization_id <> old.organization_id
       or new.created_by <> old.created_by then
      raise exception 'لا يمكن تغيير المنظمة أو منشئ الصنف';
    end if;
    -- العمق 1 = تعديل مباشر من العميل، العمق 2 = تعديل من trigger الحركات
    if pg_trigger_depth() = 1
       and (new.quantity <> old.quantity
            or new.last_movement_at is distinct from old.last_movement_at) then
      raise exception 'لا يمكن تعديل الكمية مباشرة، سجّل حركة مخزون';
    end if;
    if new.unit <> old.unit and exists (
      select 1 from public.inventory_movements m where m.item_id = old.id
    ) then
      raise exception 'لا يمكن تغيير وحدة القياس بعد وجود حركات';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger inventory_items_guard_trg
before insert or update on public.inventory_items
for each row execute function public.inventory_items_guard();

-- حارس الحركات: يحسب الكمية قبل وبعد والفرق، ويحدّث رصيد الصنف
create or replace function public.inventory_movements_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
  v_uid uuid := auth.uid();
begin
  if new.quantity is null or new.quantity < 0 then
    raise exception 'الكمية غير صالحة';
  end if;
  if new.movement_type <> 'adjustment' and new.quantity <= 0 then
    raise exception 'الكمية يجب أن تكون أكبر من صفر';
  end if;

  select * into v_item
  from public.inventory_items
  where id = new.item_id and organization_id = new.organization_id
  for update;

  if not found then
    raise exception 'الصنف غير موجود في هذه المنظمة';
  end if;
  if not v_item.is_active then
    raise exception 'الصنف غير نشط';
  end if;
  if new.movement_date > current_date + 1 then
    raise exception 'لا يمكن تسجيل حركة بتاريخ مستقبلي';
  end if;

  new.quantity_before := v_item.quantity;

  case new.movement_type
    when 'purchase', 'return' then
      new.quantity_after := v_item.quantity + new.quantity;
    when 'issue' then
      if new.quantity > v_item.quantity then
        raise exception 'الكمية المصروفة (%) أكبر من المتاح (%)', new.quantity, v_item.quantity;
      end if;
      new.quantity_after := v_item.quantity - new.quantity;
    when 'adjustment' then
      new.quantity_after := new.quantity;
    else
      raise exception 'نوع حركة غير صالح';
  end case;

  new.difference := new.quantity_after - new.quantity_before;

  if new.movement_type = 'adjustment' and new.difference = 0 then
    raise exception 'الكمية الفعلية تساوي الرصيد الحالي، لا حاجة لتسوية';
  end if;
  if new.movement_type = 'purchase' and new.unit_price is null then
    new.unit_price := v_item.unit_price;
  end if;
  if v_uid is not null then
    new.created_by := v_uid;
  end if;

  update public.inventory_items
  set quantity = new.quantity_after, last_movement_at = now()
  where id = v_item.id;

  return new;
end;
$$;

create trigger inventory_movements_guard_trg
before insert on public.inventory_movements
for each row execute function public.inventory_movements_guard();

-- سجل الحركات ثابت: لا تعديل ولا حذف
create or replace function public.inventory_movements_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'سجل حركات المخزون لا يمكن تعديله أو حذفه، سجّل حركة تصحيح';
end;
$$;

create trigger inventory_movements_immutable_trg
before update or delete on public.inventory_movements
for each row execute function public.inventory_movements_immutable();


-- 002_inventory.sql (الجزء 3 من 3): RLS والصلاحيات
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

revoke all on public.inventory_items from anon;
revoke all on public.inventory_movements from anon;
grant select, insert, update, delete on public.inventory_items to authenticated;
-- الحركات: قراءة وإضافة فقط، لا تعديل ولا حذف
revoke update, delete on public.inventory_movements from authenticated;
grant select, insert on public.inventory_movements to authenticated;

-- الأصناف: القراءة لأي عضو، والإدارة لـ owner و farm_manager
create policy inventory_items_select on public.inventory_items
  for select
  using (public.is_org_member(organization_id));

create policy inventory_items_insert on public.inventory_items
  for insert
  with check (
    public.has_org_role(organization_id, array['owner','farm_manager']::member_role[])
  );

create policy inventory_items_update on public.inventory_items
  for update
  using (
    public.has_org_role(organization_id, array['owner','farm_manager']::member_role[])
  )
  with check (
    public.has_org_role(organization_id, array['owner','farm_manager']::member_role[])
  );

create policy inventory_items_delete on public.inventory_items
  for delete
  using (
    public.has_org_role(organization_id, array['owner','farm_manager']::member_role[])
  );

-- الحركات: القراءة لأي عضو
create policy inventory_movements_select on public.inventory_movements
  for select
  using (public.is_org_member(organization_id));

-- الإضافة: owner و farm_manager لكل الأنواع، و accountant لكل الأنواع ما عدا تسوية الجرد
create policy inventory_movements_insert on public.inventory_movements
  for insert
  with check (
    public.has_org_role(organization_id, array['owner','farm_manager']::member_role[])
    or (
      movement_type <> 'adjustment'
      and public.has_org_role(organization_id, array['accountant']::member_role[])
    )
  );