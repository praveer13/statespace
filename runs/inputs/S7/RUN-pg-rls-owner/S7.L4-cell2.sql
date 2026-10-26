SET search_path = app;

-- the application connects as the table's owner and names the user per request
SET ROLE app_owner;
SELECT set_config('app.user', 'frank', false);
SELECT id FROM documents ORDER BY id;
