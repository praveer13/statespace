-- written by the recorder: does the engine have uuidv7(), and is its result a version 7 UUID?
SELECT uuid_extract_version(uuidv7()) AS version;
-- mint the key once, with the intent: a re-run after a dropped COMMIT sends the same key
create table intents (intent text primary key, key uuid not null default uuidv7());
insert into intents (intent) values ('i1');
select uuid_extract_version(key) AS key_version from intents where intent = 'i1';
