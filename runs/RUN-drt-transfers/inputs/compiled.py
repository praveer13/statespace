"""The compiled transfer: one UPDATE, and the rule that reads its outcome. The shipped compiler emits SHIPPED; the
mutants m1 to m5 are edits of the compiler, used by drt.py to show what each observer can see."""

SHIPPED = """UPDATE acct SET bal = bal + CASE WHEN id = %(src)s::int THEN -%(amt)s::bigint ELSE %(amt)s::bigint END
 WHERE id IN (%(src)s::int, %(dst)s::int)
   AND %(src)s::int <> %(dst)s::int
   AND %(amt)s::bigint > 0
   AND (SELECT bal FROM acct WHERE id = %(src)s::int) >= %(amt)s::bigint
   AND (SELECT count(*) FROM acct WHERE id IN (%(src)s::int, %(dst)s::int)) = 2"""

def outcome_of(rowcount):
    """The shipped rule: the transfer applied when both rows changed; refused when none did."""
    return 'ok' if rowcount == 2 else 'zero-rows' if rowcount == 0 else 'partial'

COMPILERS = {
    'shipped': ('the shipped compiler', SHIPPED, outcome_of),
    'm1': ('reports success whatever the rowcount', SHIPPED, lambda rowcount: 'ok'),
    'm2': ('credits the receiver twice', SHIPPED.replace('ELSE %(amt)s::bigint END', 'ELSE 2 * %(amt)s::bigint END'), outcome_of),
    'm3': ('writes the balance guard as > instead of >=', SHIPPED.replace(') >= %(amt)s::bigint', ') > %(amt)s::bigint'), outcome_of),
    'm4': ('lists the WHERE conditions in another order', SHIPPED.replace(
        """ WHERE id IN (%(src)s::int, %(dst)s::int)
   AND %(src)s::int <> %(dst)s::int
   AND %(amt)s::bigint > 0""",
        """ WHERE %(amt)s::bigint > 0
   AND %(src)s::int <> %(dst)s::int
   AND id IN (%(src)s::int, %(dst)s::int)"""), outcome_of),
    'm5': ('refuses by raising an error instead of updating no rows', SHIPPED.replace(
        '   AND (SELECT count(*)',
        '   AND 1 / (CASE WHEN (SELECT bal FROM acct WHERE id = %(src)s::int) >= %(amt)s::bigint THEN 1 ELSE 0 END) = 1\n   AND (SELECT count(*)'), outcome_of),
}
for name, (_, sql, _) in COMPILERS.items():
    assert name == 'shipped' or name == 'm1' or sql != SHIPPED, name
