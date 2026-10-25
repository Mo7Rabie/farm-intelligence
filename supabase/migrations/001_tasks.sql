-- 001_tasks.sql (الجزء 1 من 2)
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  farm_id uuid not null references public.farms(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  description text,
  assigned_to uuid references auth.users(id) on delete set null,
  start_date date,
  due_date date,
  priority text not null default 'medium'
    check (priority in ('low','medium','high','urgent')),
  status text not null default 'new'
    check (status in ('new','in_progress','completed','cancelled')),
  completed_at timestamptz,
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_dates_ok check (start_date is null or due_date is null or due_date >= start_date)
);

create index tasks_org_status_idx on public.tasks (organization_id, status);
create index tasks_org_due_idx on public.tasks (organization_id, due_date);
create index tasks_farm_idx on public.tasks (farm_id);
create index tasks_assignee_idx on public.tasks (assigned_to);

create or replace function public.tasks_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not exists (
    select 1 from public.farms f
    where f.id = new.farm_id and f.organization_id = new.organization_id
  ) then
    raise exception 'المزرعة لا تتبع هذه المنظمة';
  end if;

  if new.assigned_to is not null and not exists (
    select 1 from public.organization_members m
    where m.organization_id = new.organization_id and m.user_id = new.assigned_to
  ) then
    raise exception 'المسؤول ليس عضوا في هذه المنظمة';
  end if;

  if tg_op = 'INSERT' then
    if v_uid is not null then
      new.created_by := v_uid;
    end if;
  else
    if new.organization_id <> old.organization_id
       or new.created_by <> old.created_by then
      raise exception 'لا يمكن تغيير المنظمة أو منشئ المهمة';
    end if;

    if v_uid is not null
       and not public.has_org_role(new.organization_id,
             array['owner','farm_manager']::member_role[]) then
      if old.assigned_to is distinct from v_uid then
        raise exception 'ليس لديك صلاحية تعديل هذه المهمة';
      end if;
      if (new.title, new.description, new.farm_id, new.assigned_to,
          new.start_date, new.due_date, new.priority, new.notes)
         is distinct from
         (old.title, old.description, old.farm_id, old.assigned_to,
          old.start_date, old.due_date, old.priority, old.notes) then
        raise exception 'يمكنك تغيير حالة المهمة فقط';
      end if;
    end if;
  end if;

  new.updated_at := now();
  if new.status = 'completed' then
    new.completed_at := case
      when tg_op = 'UPDATE' and old.status = 'completed' then old.completed_at
      else now() end;
  else
    new.completed_at := null;
  end if;

  return new;
end;
$$;

create trigger tasks_guard_trg
before insert or update on public.tasks
for each row execute function public.tasks_guard();

-- 001_tasks.sql (الجزء 2 من 2): RLS والصلاحيات
alter table public.tasks enable row level security;

revoke all on public.tasks from anon;
grant select, insert, update, delete on public.tasks to authenticated;

-- القراءة: أي عضو في المنظمة
create policy tasks_select on public.tasks
  for select
  using (public.is_org_member(organization_id));

-- الإنشاء: owner و farm_manager فقط
create policy tasks_insert on public.tasks
  for insert
  with check (
    public.has_org_role(organization_id, array['owner','farm_manager']::member_role[])
  );

-- التعديل: owner و farm_manager، أو المسؤول عن المهمة (والـ trigger يحصره في الحالة فقط)
create policy tasks_update on public.tasks
  for update
  using (
    public.has_org_role(organization_id, array['owner','farm_manager']::member_role[])
    or (assigned_to = auth.uid() and public.is_org_member(organization_id))
  )
  with check (
    public.has_org_role(organization_id, array['owner','farm_manager']::member_role[])
    or (assigned_to = auth.uid() and public.is_org_member(organization_id))
  );

-- الحذف: owner و farm_manager فقط
create policy tasks_delete on public.tasks
  for delete
  using (
    public.has_org_role(organization_id, array['owner','farm_manager']::member_role[])
  );