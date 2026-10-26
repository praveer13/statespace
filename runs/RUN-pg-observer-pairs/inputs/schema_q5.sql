CREATE TABLE documents (
  tenant text NOT NULL,
  slug   text NOT NULL UNIQUE,              -- one document per slug
  title  text NOT NULL
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_tenant ON documents
  USING (tenant = current_setting('app.tenant'))
  WITH CHECK (tenant = current_setting('app.tenant'));
GRANT SELECT, INSERT ON documents TO frank;
