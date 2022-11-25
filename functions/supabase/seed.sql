create table if not exists users (
    id text not null primary key,
    data jsonb not null,
    fs_updated_time timestamp not null
);
alter table users enable row level security;

create table if not exists contracts (
    id text not null primary key,
    data jsonb not null,
    fs_updated_time timestamp not null
);
alter table contracts enable row level security;

create table if not exists groups (
    id text not null primary key,
    data jsonb not null,
    fs_updated_time timestamp not null
);
alter table groups enable row level security;

create table if not exists txns (
    id text not null primary key,
    data jsonb not null,
    fs_updated_time timestamp not null
);
alter table txns enable row level security;

create table if not exists bets (
    id text not null primary key,
    data jsonb not null,
    fs_updated_time timestamp not null
);
alter table bets enable row level security;

create table if not exists comments (
    id text not null primary key,
    data jsonb not null,
    fs_updated_time timestamp not null
);
alter table comments enable row level security;

create table if not exists incoming_writes (
  event_id text not null primary key,
  doc_kind text not null,
  write_kind text not null,
  doc_id text not null,
  parent text not null,
  data jsonb not null,
  ts timestamp not null,
  processed boolean not null default false
);
alter table incoming_writes enable row level security;

create or replace function replicate_writes_process()
  returns trigger
  language plpgsql
as
$$
declare dest_table text;
begin
  dest_table = case new.doc_kind
    when 'txn' then 'txns'
    when 'user' then 'users'
    when 'group' then 'groups'
    when 'contract' then 'contracts'
    when 'contractBet' then 'bets'
    when 'contractComments' then 'comments'
    else null
  end;
  if dest_table = null then
    raise warning 'Invalid document kind.';
    return new;
  end if;
  if new.write_kind = 'create' or new.write_kind = 'update 'then
    execute format(
      'insert into %1I (id, data, fs_updated_time) values (%2L, %3L, %4L)
       on conflict (id) do update set data = %3L, fs_updated_time = %4L
       where %1I.fs_updated_time <= %4L;',
      dest_table, new.doc_id, new.data, new.ts
    );
  elsif new.write_kind = 'delete' then
    execute format(
      'delete from %1I where id = %2L and fs_updated_time <= %3L;',
      dest_table, new.doc_id, new.ts
    );
  else
    raise warning 'Invalid write kind.';
    return new;
  end if;
  new.processed := true;
  return new;
end
$$;

create trigger replicate_writes
before insert on incoming_writes for each row
execute procedure replicate_writes_process();
