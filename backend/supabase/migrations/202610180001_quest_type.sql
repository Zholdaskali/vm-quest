-- Existing rooms and states remain VM exercises.
alter table public.vm_rooms add column if not exists quest text not null default 'vm' check (quest in ('vm','logic'));
