-- Only the Edge Function may access these tables. No student database keys or passwords.
create table if not exists public.vm_settings (
 singleton boolean primary key default true check (singleton),
 teacher_hash text not null check (length(teacher_hash)=64)
);
create table if not exists public.vm_rooms (
 id uuid primary key default gen_random_uuid(),
 code text unique not null check (length(code)=8),
 created_at timestamptz not null default now(),
 closed boolean not null default false
);
create table if not exists public.vm_students (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.vm_rooms(id),
 nickname text not null check (char_length(nickname) between 2 and 32),
 token_hash text unique not null check (length(token_hash)=64),
 state jsonb not null,
 revision integer not null default 0,
 last_seen timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create unique index if not exists vm_students_room_nickname on public.vm_students(room_id,lower(nickname));
create index if not exists vm_students_room on public.vm_students(room_id);
alter table public.vm_settings enable row level security;
alter table public.vm_rooms enable row level security;
alter table public.vm_students enable row level security;
revoke all on public.vm_settings,public.vm_rooms,public.vm_students from anon,authenticated;
grant select,insert,update,delete on public.vm_settings,public.vm_rooms,public.vm_students to service_role;
-- No permissive RLS policies: browser access must go through the authenticated function.
