create table holds (intent text primary key, amount int not null, status text not null);
create table captures (intent text primary key, cost int not null);
create table inbound_keys (key text primary key);
insert into holds values ('i1', 100, 'held');

create function handle(k text, i text, c int) returns text language plpgsql as $$
declare n int;
begin
  insert into inbound_keys (key) values (k) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then return 'duplicate: already applied'; end if;
  update holds set status = 'captured'
   where intent = i and status = 'held' and amount >= c;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'reply rejected for %', i; end if;
  insert into captures values (i, c);
  return 'captured';
end $$;

select handle('k1', 'i1', 80);
select handle('k1', 'i1', 80);
select count(*) as captures from captures;
