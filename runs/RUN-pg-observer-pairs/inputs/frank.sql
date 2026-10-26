-- frank, an Acme user: one read and one write, as his client issues them
SET ROLE frank;
SET app.tenant = 'acme';
SELECT slug FROM documents ORDER BY slug;
INSERT INTO documents VALUES ('acme', 'layoffs-memo', 'Layoffs memo');
