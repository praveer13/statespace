-- LAB-8.5: your reply handler. challenge/schema.sql (pinned) holds the tables.
--
-- handle_reply(k, i, st, c) is called once for every reply the provider sends, in its own transaction:
-- k the reply's key, i the intent it names, st its status ('ok', or anything else), c its cost. A reply
-- may be a duplicate, arrive late, name an intent with another key, or cost more than the hold. Apply
-- S8.L4's checks in this order, and return exactly one of these texts:
--
--   1. the key row: insert k into inbound_keys with ON CONFLICT DO NOTHING; if no row was inserted,
--      return 'duplicate: already applied' (a re-run after a dropped COMMIT ends here too)
--   2. the key must be the intent's own key (intents.key)    else 'rejected: unknown key'
--   3. st must be 'ok'                                       else 'rejected: invalid'
--   4. the hold must still be held: if a timer released it,
--      record a row in reconciliations (reason 'late')       and return 'rejected: late'
--   5. the capture: one guarded UPDATE of the hold, status 'held' and amount >= c, that changes
--      exactly 1 row, then the captures row                  'captured', else 'rejected: over cost'
--
-- The key row and the capture commit together, in the caller's one transaction.

create function handle_reply(k uuid, i text, st text, c int) returns text language plpgsql as $$
begin
  -- TODO(you): the five checks, in order. As written, every reply is refused.
  return 'rejected: invalid';
end $$;
