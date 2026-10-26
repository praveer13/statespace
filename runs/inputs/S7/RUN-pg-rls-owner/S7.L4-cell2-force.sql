-- S7.L4 cell 2, the re-run the @after asks for, written by the recorder: run after the cell, in the same session.
-- As the owner, force row security on documents, read the flags back with the time, and run the query again.
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
SELECT relrowsecurity, relforcerowsecurity, now() AS read_at FROM pg_class WHERE oid = 'app.documents'::regclass;
SELECT set_config('app.user', 'frank', false);
SELECT id FROM documents ORDER BY id;
