-- Preserve historical rows; retire logic rooms from UI, do not regrade old students.
alter table public.vm_rooms drop constraint if exists vm_rooms_quest_check;
alter table public.vm_rooms add constraint vm_rooms_quest_check check(quest in ('vm','logic','business'));
