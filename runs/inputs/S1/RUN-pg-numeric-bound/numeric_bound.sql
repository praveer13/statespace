-- RUN-pg-numeric-bound. S1.L5's table row "PostgreSQL numeric" and S6.L4's remedy 3: what a declared bound
-- does. Each case holds an account at the edge of a type and credits 1 (S6.L4's boundary command). Run in
-- PostgreSQL 18 with psql, one session, autocommit, errors do not stop the script:
--   psql -X -q -U postgres -f numeric_bound.sql
-- The lines that start with "case", "sqlstate" and "balance" are this script's own markers; the rest is
-- psql's. LAST_ERROR_SQLSTATE keeps its value after a later success, so it is echoed only after a statement
-- that failed.
\set VERBOSITY default
\pset format unaligned
\pset tuples_only on
\echo server
select version();

\echo case bigint_at_max: credit 1 to a bigint balance of 9223372036854775807
create table acct_bigint (id int primary key, bal bigint not null);
insert into acct_bigint values (1, 9223372036854775807);
update acct_bigint set bal = bal + 1 where id = 1;
\echo sqlstate :LAST_ERROR_SQLSTATE
\echo balance
select bal from acct_bigint where id = 1;

\echo case numeric19_below_bound: credit 1 to a numeric(19,0) balance of 9223372036854775807
create table acct_numeric19 (id int primary key, bal numeric(19,0) not null);
insert into acct_numeric19 values (1, 9223372036854775807);
update acct_numeric19 set bal = bal + 1 where id = 1;
\echo balance
select bal from acct_numeric19 where id = 1;

\echo case numeric19_at_bound: credit 1 to a numeric(19,0) balance of 9999999999999999999
update acct_numeric19 set bal = 9999999999999999999 where id = 1;
update acct_numeric19 set bal = bal + 1 where id = 1;
\echo sqlstate :LAST_ERROR_SQLSTATE
\echo balance
select bal from acct_numeric19 where id = 1;

\echo case numeric_unbounded: credit 1 to a numeric balance of 9999999999999999999
create table acct_numeric (id int primary key, bal numeric not null);
insert into acct_numeric values (1, 9999999999999999999);
update acct_numeric set bal = bal + 1 where id = 1;
\echo balance
select bal from acct_numeric where id = 1;
